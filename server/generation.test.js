import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerator, parseOutline, validateChapter, validateInput } from './generation.js';
import { createApi } from './app.js';

const brief = { idea: 'Balcony gardening in small apartments', audience: 'First-time urban gardeners', tone: 'Friendly & practical' };
const outline = { title: 'Your First Balcony Garden', chapters: Array.from({ length: 6 }, (_, i) => ({ title: `Growing step ${i + 1}` })) };
const chapter = { ...brief, title: outline.title, chapters: outline.chapters.map(chapter => chapter.title), index: 0 };
const prose = Array.from({ length: 420 }, (_, i) => `word${i}`).join(' ');
const success = content => new Response(JSON.stringify({ model: 'test-model', choices: [{ finish_reason: 'stop', message: { content } }] }));

test('validates and trims the brief and chapter inputs before a provider request', () => {
  assert.equal(validateInput({ ...brief, idea: '  Gardening  ' }, 'outline').idea, 'Gardening');
  for (const value of [null, [], {}, { ...brief, idea: '' }, { ...brief, idea: 'x'.repeat(501) }, { ...brief, audience: 'x'.repeat(101) }, { ...brief, tone: 'unsupported' }]) assert.throws(() => validateInput(value, 'outline'));
  for (const value of [{ ...chapter, index: -1 }, { ...chapter, index: 6 }, { ...chapter, index: 1.5 }, { ...chapter, chapters: [] }, { ...chapter, chapters: Array(6).fill('') }, { ...chapter, previousEnding: 'x'.repeat(3001) }]) assert.throws(() => validateInput(value, 'chapter'));
});

test('parses six distinct outline chapters and rejects malformed or duplicate output', () => {
  assert.equal(parseOutline('```json\n' + JSON.stringify(outline) + '\n```').chapters.length, 6);
  for (const value of ['not json', '{}', JSON.stringify({ ...outline, chapters: outline.chapters.slice(0, 5) }), JSON.stringify({ ...outline, chapters: Array(6).fill({ title: 'same' }) })]) assert.throws(() => parseOutline(value));
});

test('does not accept an empty, short or oversized chapter as finished prose', () => {
  assert.equal(validateChapter(prose), prose);
  for (const value of ['', null, 'Write a paragraph here.', 'word '.repeat(4000)]) assert.throws(() => validateChapter(value));
});

test('sends the credential only to OpenRouter, caps tokens, and returns no credential to clients', async () => {
  const calls = [];
  const generator = createGenerator({ apiKey: 'private-test-credential', fetchImpl: async (url, options) => { calls.push({ url, options }); return success(calls.length === 1 ? JSON.stringify(outline) : prose); } });
  const plan = await generator.outline(brief);
  const text = await generator.chapter(chapter);
  assert.equal(plan.chapters.length, 6); assert.equal(text.body, prose);
  assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer private-test-credential');
  assert.equal(JSON.parse(calls[0].options.body).response_format.type, 'json_object');
  assert.equal(JSON.parse(calls[1].options.body).max_tokens, 2400);
  assert.ok(!JSON.stringify({ plan, text }).includes('private-test-credential'));
});

test('handles missing credentials, provider failures, malformed responses and truncated output without falling back to templates', async () => {
  await assert.rejects(createGenerator({}).outline(brief), /not configured/);
  for (const [status, message] of [[401, /rejected/], [402, /credits/], [403, /authorize/], [429, /rate-limited/], [500, /could not complete/]]) {
    const generator = createGenerator({ apiKey: 'test', fetchImpl: async () => new Response('private provider details', { status }) });
    await assert.rejects(generator.outline(brief), message);
  }
  for (const response of [new Response('bad json'), new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: prose } }] })), success('')]) {
    await assert.rejects(createGenerator({ apiKey: 'test', fetchImpl: async () => response }).chapter(chapter));
  }
  await assert.rejects(createGenerator({ apiKey: 'test', fetchImpl: async () => { throw new Error('network details'); } }).outline(brief), /Could not reach/);
});

test('propagates cancellation to the provider and returns a safe error', async () => {
  const controller = new AbortController(); controller.abort();
  const generator = createGenerator({ apiKey: 'test', fetchImpl: async (_, options) => { options.signal.throwIfAborted(); } });
  await assert.rejects(generator.outline(brief, controller.signal), /cancelled/);
});

async function withApi(options, run) {
  const server = createApi(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'Content-Type': 'application/json', 'X-Book-Client': 'ebook-studio', Origin: base };
  try { await run(base, headers); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('API health does not disclose credentials; same-origin routes work and arbitrary routes do not proxy', async () => {
  await withApi({ apiKey: 'never-echo-this', fetchImpl: async () => success(JSON.stringify(outline)) }, async (base, headers) => {
    assert.deepEqual(await (await fetch(base + '/api/health')).json(), { configured: true, model: 'openai/gpt-4.1-mini' });
    const result = await fetch(base + '/api/outline', { method: 'POST', headers, body: JSON.stringify(brief) });
    assert.equal(result.status, 200); assert.equal((await result.json()).chapters.length, 6);
    assert.equal((await fetch(base + '/api/arbitrary')).status, 404);
    assert.equal((await fetch(base + '/api/outline')).status, 405);
  });
});

test('API rejects cross-origin, missing client headers, invalid JSON, invalid fields and oversized requests', async () => {
  await withApi({}, async (base, headers) => {
    for (const bad of [{ ...headers, Origin: 'https://untrusted.example' }, { ...headers, 'X-Book-Client': '' }, { ...headers, Origin: '' }]) assert.equal((await fetch(base + '/api/outline', { method: 'POST', headers: bad, body: '{}' })).status, 403);
    assert.equal((await fetch(base + '/api/outline', { method: 'POST', headers: { ...headers, 'Content-Type': 'text/plain' }, body: '{}' })).status, 415);
    for (const body of ['{invalid', '{}']) assert.equal((await fetch(base + '/api/outline', { method: 'POST', headers, body })).status, 400);
    assert.equal((await fetch(base + '/api/outline', { method: 'POST', headers, body: JSON.stringify({ text: 'x'.repeat(17000) }) })).status, 413);
    const missing = await fetch(base + '/api/outline', { method: 'POST', headers, body: JSON.stringify(brief) });
    assert.equal(missing.status, 503);
  });
});

test('caps spending with a shared hourly generation-request limit', async () => {
  await withApi({ apiKey: 'test', requestLimit: 1, fetchImpl: async () => success(JSON.stringify(outline)) }, async (base, headers) => {
    const options = { method: 'POST', headers, body: JSON.stringify(brief) };
    assert.equal((await fetch(base + '/api/outline', options)).status, 200);
    assert.equal((await fetch(base + '/api/outline', options)).status, 429);
  });
});
