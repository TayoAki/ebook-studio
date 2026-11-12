import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraft, saveDraft, loadDrafts, serializeBook, suggestions } from './book.js';

const memoryStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test('creates a six-chapter draft from every prompt suggestion', () => {
  for (const idea of suggestions) {
    const draft = createDraft(idea);
    assert.equal(draft.chapters.length, 6);
    assert.ok(draft.chapters.every(chapter => chapter.title && chapter.body));
    assert.equal(draft.idea, idea);
    assert.ok(draft.chapters[0].body.includes(draft.title.toLowerCase()));
  }
});
test('trims ideas and formats an initial article without changing the user’s original idea', () => {
  const draft = createDraft('  A guide to gardening!  ');
  assert.equal(draft.title, 'Guide to gardening');
  assert.equal(draft.idea, 'A guide to gardening!');
});
test('rejects empty and oversized ideas', () => {
  assert.throws(() => createDraft('  '), /Tell us/);
  assert.throws(() => createDraft('x'.repeat(501)), /500 characters/);
  assert.ok(createDraft('x'.repeat(500)));
});
test('stores audience and tone in the manuscript model', () => {
  const draft = createDraft('Composting', 'Urban gardeners', 'Warm & inspiring');
  assert.equal(draft.audience, 'Urban gardeners');
  assert.equal(draft.tone, 'Warm & inspiring');
  assert.match(draft.chapters[0].body, /urban gardeners/);
});
test('gives each draft a unique identifier', () => {
  assert.notEqual(createDraft('Same idea').id, createDraft('Same idea').id);
});
test('starts with an empty library', () => assert.deepEqual(loadDrafts(memoryStorage()), []));
test('saves and reopens a draft with edited content', () => {
  const storage = memoryStorage();
  const draft = createDraft('A new beginning');
  draft.chapters[0].body = 'My own original opening.';
  saveDraft(draft, storage);
  assert.equal(loadDrafts(storage)[0].chapters[0].body, 'My own original opening.');
});
test('saving an existing draft updates it without duplication', () => {
  const storage = memoryStorage();
  const draft = createDraft('A new beginning');
  saveDraft(draft, storage);
  saveDraft({ ...draft, title: 'A better title' }, storage);
  assert.equal(loadDrafts(storage).length, 1);
  assert.equal(loadDrafts(storage)[0].title, 'A better title');
});
test('keeps multiple drafts and puts the last saved one first', () => {
  const storage = memoryStorage();
  const first = createDraft('First idea');
  const second = createDraft('Second idea');
  saveDraft(first, storage); saveDraft(second, storage); saveDraft(first, storage);
  assert.deepEqual(loadDrafts(storage).map(draft => draft.id), [first.id, second.id]);
});
test('recovers from malformed or non-array browser storage', () => {
  for (const value of ['{bad JSON', '{}', 'null', '5', 'true']) {
    const storage = memoryStorage(); storage.setItem('getebook-drafts', value);
    assert.deepEqual(loadDrafts(storage), []);
  }
});
test('filters corrupt draft records while retaining valid drafts', () => {
  const storage = memoryStorage();
  const valid = createDraft('Valid draft');
  storage.setItem('getebook-drafts', JSON.stringify([null, {}, { ...valid, chapters: [] }, { ...valid, chapters: [null] }, { ...valid, audience: null }, valid]));
  assert.deepEqual(loadDrafts(storage), [valid]);
});
test('reads safely when browser storage is unavailable', () => {
  assert.deepEqual(loadDrafts({ getItem() { throw new Error('Storage disabled'); } }), []);
});
test('surfaces write failures so the UI can offer a download instead', () => {
  assert.throws(() => saveDraft(createDraft('A book'), { getItem: () => null, setItem() { throw new Error('Quota exceeded'); } }), /Quota exceeded/);
});
test('exports the edited title and every chapter as readable text', () => {
  const draft = createDraft('Better mornings', 'Busy parents');
  draft.title = 'My own book'; draft.chapters[0].title = 'My first chapter';
  const text = serializeBook(draft);
  assert.ok(text.startsWith('My own book\n'));
  assert.match(text, /For: Busy parents/);
  assert.match(text, /1\. My first chapter/);
  draft.chapters.forEach(chapter => assert.ok(text.includes(chapter.body)));
});
test('handles Unicode ideas without losing the original text', () => {
  const draft = createDraft('Café rituals ☕ — 每日灵感');
  assert.ok(serializeBook(draft).includes('Café rituals ☕ — 每日灵感'));
});
