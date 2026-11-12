import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { createEpub } from './epub.js';

test('exports EPUB3 with an uncompressed first mimetype, title page, nav, spine and six complete chapters', () => {
  const book = { id: '123', title: 'Gardens & <script>alert(1)</script>', audience: 'Busy readers', updatedAt: Date.now(), chapters: Array.from({ length: 6 }, (_, i) => ({ title: `Chapter ${i + 1} & more`, body: `## Growing well\n\nFinished prose ${i + 1}. **Useful** advice.\n\nNever render <script>input</script>.` })) };
  const bytes = createEpub(book);
  const files = unzipSync(bytes), read = name => strFromU8(files[name]);
  assert.equal(new DataView(bytes.buffer).getUint16(8, true), 0);
  assert.equal(Object.keys(files)[0], 'mimetype'); assert.equal(read('mimetype'), 'application/epub+zip');
  assert.match(read('META-INF/container.xml'), /OEBPS\/content.opf/);
  assert.match(read('OEBPS/content.opf'), /version="3.0"/); assert.match(read('OEBPS/content.opf'), /properties="nav"/);
  assert.equal((read('OEBPS/content.opf').match(/itemref idref="ch/g) || []).length, 6);
  assert.match(read('OEBPS/cover.xhtml'), /Gardens &amp; &lt;script&gt;/);
  for (let i = 1; i <= 6; i++) {
    const body = read(`OEBPS/chapter-${i}.xhtml`);
    assert.ok(body.includes(`Finished prose ${i}.`)); assert.ok(!body.includes('<script>')); assert.match(body, /<h2>Growing well<\/h2>/);
    assert.ok(read('OEBPS/nav.xhtml').includes(`chapter-${i}.xhtml`));
  }
});
