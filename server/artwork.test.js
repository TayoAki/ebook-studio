import test from 'node:test';
import assert from 'node:assert/strict';
import { createArtworkGenerator, artworkPrompt } from './artwork.js';
import { createApi } from './app.js';

const brief = { kind: 'cover', title: 'Balcony Herbs', idea: 'Gardening in apartments', audience: 'City renters', style: 'Watercolor in earthy greens' };
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
const response = () => new Response(JSON.stringify({ data: [{ b64_json: png, media_type: 'image/png' }] }));

test('validates artwork requests before spending provider credits', () => {
  assert.match(artworkPrompt(brief), /portrait/);
  assert.match(artworkPrompt({ ...brief, kind: 'illustration', chapterTitle: 'Planting' }), /landscape/);
  for (const invalid of [null, {}, { ...brief, kind: 'other' }, { ...brief, style: '' }, { ...brief, idea: 'x'.repeat(501) }, { ...brief, kind: 'illustration' }]) assert.throws(() => artworkPrompt(invalid));
});

test('uses the dedicated image API, server model and bounded single-image settings', async () => {
  let calls = 0;
  const generate = createArtworkGenerator({ apiKey: 'private-test-key', fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'https://openrouter.ai/api/v1/images');
    assert.equal(options.headers.Authorization, 'Bearer private-test-key');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'openai/gpt-5-image-mini'); assert.equal(body.n, 1);
    assert.equal(body.output_format, 'jpeg'); assert.equal(body.aspect_ratio, calls === 1 ? '2:3' : '3:2');
    return response();
  } });
  const image = await generate(brief);
  await generate({ ...brief, kind: 'illustration', chapterTitle: 'Planting' });
  assert.match(image.dataUrl, /^data:image\/png;base64,/);
  assert.ok(!JSON.stringify(image).includes('private-test-key'));
});

test('safe image errors cover missing auth, credits, limits, malformed content, oversized data and cancellation', async () => {
  await assert.rejects(createArtworkGenerator({})(brief), /not configured/);
  for (const [status, expected] of [[401, /rejected/], [402, /credits/], [403, /authorize/], [429, /rate-limited/], [500, /could not generate/]]) {
    await assert.rejects(createArtworkGenerator({ apiKey: 'test', fetchImpl: async () => new Response('private upstream payload', { status }) })(brief), expected);
  }
  for (const content of ['not json', '{}', JSON.stringify({ data: [{ media_type: 'image/svg+xml', b64_json: btoa('<svg/>') }] }), JSON.stringify({ data: [{ media_type: 'image/jpeg', b64_json: 'badbytes' }] }), 'x'.repeat(6 * 1024 * 1024 + 1)]) {
    await assert.rejects(createArtworkGenerator({ apiKey: 'test', fetchImpl: async () => new Response(content) })(brief));
  }
  const controller = new AbortController(); controller.abort();
  await assert.rejects(createArtworkGenerator({ apiKey: 'test', fetchImpl: async (_, options) => { options.signal.throwIfAborted(); } })(brief, controller.signal), /stopped/);
});

test('artwork endpoint applies same-origin protection and a separate spending cap', async () => {
  const server = createApi({ apiKey: 'private-test-key', imageRequestLimit: 1, fetchImpl: async () => response() });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const options = { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', 'X-Book-Client': 'ebook-studio' }, body: JSON.stringify(brief) };
  try {
    assert.equal((await fetch(base + '/api/artwork', { ...options, headers: { ...options.headers, Origin: 'https://other.example' } })).status, 403);
    const result = await fetch(base + '/api/artwork', options);
    assert.equal(result.status, 200); assert.match((await result.json()).dataUrl, /^data:image\/png/);
    assert.equal((await fetch(base + '/api/artwork', options)).status, 429);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
