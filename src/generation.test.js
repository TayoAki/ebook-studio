import test from 'node:test';
import assert from 'node:assert/strict';
import { generatedDraft, requestGeneration, writeBook } from './generation.js';
import { saveDraft, loadDrafts, serializeBook } from './book.js';

const make = () => generatedDraft({ title: 'A Specific Gardening Book', chapters: Array.from({ length: 6 }, (_, i) => `Chapter ${i + 1}`), model: 'test-model' }, 'Gardening', 'Apartment gardeners', 'Friendly & practical');

test('an AI outline has empty chapter bodies and explicit provenance, not template text', () => {
  const draft = make();
  assert.equal(draft.generation.status, 'outline'); assert.equal(draft.generation.provider, 'OpenRouter');
  assert.ok(draft.chapters.every(chapter => chapter.body === '' && chapter.generated === false));
  assert.match(serializeBook(draft), /partial manuscript/);
});

test('writes six chapters in order, retains progress and only completes after all responses', async () => {
  const calls = [], progress = [];
  const result = await writeBook(make(), { onProgress: (book, index) => progress.push([book, index]), request: async (kind, input) => { calls.push([kind, input]); return { body: `Finished chapter ${input.index + 1} prose.`, model: 'actual-model' }; } });
  assert.deepEqual(calls.map(([, input]) => input.index), [0, 1, 2, 3, 4, 5]);
  assert.equal(calls[1][1].previousEnding, 'Finished chapter 1 prose.');
  assert.equal(result.generation.status, 'complete'); assert.equal(result.generation.model, 'actual-model');
  assert.equal(progress.length, 12); assert.ok(result.chapters.every(chapter => chapter.generated));
  assert.match(serializeBook(result), /6 of 6 chapters written/);
});

test('retry resumes missing chapters without rewriting paid-for or edited chapters', async () => {
  let latest;
  await assert.rejects(writeBook(make(), { onProgress: book => { latest = book; }, request: async (_, input) => { if (input.index === 2) throw new Error('credits'); return { body: `Finished ${input.index}`, model: 'm' }; } }), /credits/);
  assert.equal(latest.chapters.filter(chapter => chapter.generated).length, 2);
  latest.chapters[0].body = 'An author’s revision';
  const calls = [];
  const result = await writeBook(latest, { onProgress() {}, request: async (_, input) => { calls.push(input.index); return { body: 'Restored prose', model: 'm' }; } });
  assert.deepEqual(calls, [2, 3, 4, 5]); assert.equal(result.chapters[0].body, 'An author’s revision');
  assert.equal(result.generation.status, 'complete');
});

test('cancellation stops further requests and does not mark a partial book complete', async () => {
  const controller = new AbortController(); let latest;
  await assert.rejects(writeBook(make(), { signal: controller.signal, onProgress: book => { latest = book; }, request: async () => { controller.abort(); return { body: 'First finished chapter', model: 'm' }; } }), /abort/i);
  assert.equal(latest.chapters.filter(chapter => chapter.generated).length, 1); assert.notEqual(latest.generation.status, 'complete');
});

test('partial generation metadata survives browser save/reopen', () => {
  let value; const storage = { getItem: () => value || null, setItem: (_, next) => { value = next; } };
  const draft = make(); draft.chapters[0] = { ...draft.chapters[0], generated: true, body: 'Saved prose' }; draft.generation.status = 'partial';
  saveDraft(draft, storage); const reopened = loadDrafts(storage)[0];
  assert.equal(reopened.generation.status, 'partial'); assert.equal(reopened.chapters[0].body, 'Saved prose');
});

test('browser API requests contain no API key and show server errors without silently creating templates', async () => {
  await requestGeneration('outline', { idea: 'A book' }, undefined, async (url, options) => {
    assert.equal(url, '/api/outline'); assert.equal(options.headers['X-Book-Client'], 'ebook-studio'); assert.ok(!options.headers.Authorization);
    return new Response(JSON.stringify({ title: 'Title' }));
  });
  await assert.rejects(requestGeneration('outline', {}, undefined, async () => new Response(JSON.stringify({ error: 'Credits needed' }), { status: 502 })), /Credits needed/);
  await assert.rejects(requestGeneration('outline', {}, undefined, async () => new Response('<html>Proxy down</html>')), /API is unavailable/);
  await assert.rejects(requestGeneration('outline', {}, undefined, async () => { throw new Error('Network'); }), /server is unavailable/);
});
