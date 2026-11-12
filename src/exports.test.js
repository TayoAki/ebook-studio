import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { createEpub } from './epub.js';
import { createDocx, createPdf, pdfDefinition } from './exports.js';
import { parseArtwork, MAX_IMAGE_BYTES } from './artwork.js';
import { hydrateArtwork } from './artwork-store.js';
import { saveDraft, loadDrafts } from './book.js';

const image = { id: 'art-test', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', model: 'image-test' };
const book = { id: 'export-book', title: 'Herbs & Happy Homes', idea: 'Balcony herbs', audience: 'City renters', tone: 'Friendly & practical', updatedAt: Date.now(), cover: image, chapters: Array.from({ length: 6 }, (_, i) => ({ title: `Chapter ${i + 1}`, body: `## Practical advice\n\nA complete paragraph with **bold advice**, an em dash—and <unsafe> text.\nSecond line.`, ...(i === 0 ? { illustration: image } : {}) })) };

test('accepts raster images only and rejects remote URLs, SVG, corrupt bytes and oversized payloads', () => {
  assert.equal(parseArtwork(image.dataUrl).mediaType, 'image/png');
  for (const value of ['https://untrusted.example/image.jpg', 'data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,YWJj', 'data:image/png;base64,' + 'A'.repeat(MAX_IMAGE_BYTES * 2)]) assert.throws(() => parseArtwork(value));
});

test('EPUB embeds cover and chapter artwork in the manifest and chapter XHTML', () => {
  const files = unzipSync(createEpub(book)), read = name => strFromU8(files[name]);
  assert.match(read('OEBPS/content.opf'), /id="cover-art"[^>]+properties="cover-image"/);
  assert.match(read('OEBPS/cover.xhtml'), /src="images\/cover-art.png"/);
  assert.match(read('OEBPS/chapter-1.xhtml'), /src="images\/art-1.png"/);
  assert.deepEqual(files['OEBPS/images/cover-art.png'], parseArtwork(image.dataUrl).bytes);
  assert.ok(!read('OEBPS/chapter-1.xhtml').includes('<unsafe>'));
});

test('DOCX is a real Word document with all six chapters, headings, images and image relationships', async () => {
  const files = unzipSync(await createDocx(book));
  const document = strFromU8(files['word/document.xml']);
  assert.ok(files['[Content_Types].xml']); assert.ok(files['word/_rels/document.xml.rels']);
  assert.match(document, /Herbs &amp; Happy Homes/);
  assert.match(document, /&lt;unsafe&gt;/); assert.match(document, /<w:b\/>/);
  for (let i = 1; i <= 6; i++) assert.ok(document.includes(`Chapter ${i}`));
  assert.ok(Object.keys(files).some(name => name.startsWith('word/media/') && name.endsWith('.png')));
  assert.equal((document.match(/<w:drawing>/g) || []).length, 2);
});

test('PDF contains manuscript text, a contents page, image objects and page breaks', async () => {
  const definition = pdfDefinition(book);
  assert.equal(definition.content.filter(item => item.tocItem).length, 6);
  assert.equal(definition.content.filter(item => item.image).length, 2);
  const bytes = await createPdf(book);
  const pdf = new TextDecoder('latin1').decode(bytes);
  assert.ok(pdf.startsWith('%PDF-')); assert.match(pdf, /\/Type \/Pages/); assert.match(pdf, /\/Subtype \/Image/);
  assert.ok(bytes.length > 10000);
});

test('old text-only books still export PDF and DOCX without artwork', async () => {
  const plain = { ...book, cover: null, chapters: book.chapters.map(({ illustration, ...chapter }) => chapter) };
  assert.ok((await createPdf(plain)).length > 10000);
  assert.ok(unzipSync(await createDocx(plain))['word/document.xml']);
});

test('artwork references survive local save/reopen and are hydrated only for export', async () => {
  let data;
  const storage = { setItem: (_, value) => { data = value; }, getItem: () => data };
  const { dataUrl, ...metadata } = image;
  const draft = { ...book, cover: metadata, chapters: book.chapters.map(chapter => ({ ...chapter, illustration: chapter.illustration ? metadata : null })) };
  saveDraft(draft, storage);
  assert.ok(!data.includes('base64'));
  const loaded = loadDrafts(storage)[0];
  const hydrated = await hydrateArtwork(loaded, async metadata => metadata ? image : null);
  assert.equal(hydrated.cover.dataUrl, image.dataUrl); assert.equal(hydrated.chapters[0].illustration.dataUrl, image.dataUrl);
  await assert.rejects(hydrateArtwork(loaded, async () => { throw new Error('Artwork missing'); }), /Artwork missing/);
});
