import { zipSync, strToU8 } from 'fflate';

export const escapeXml = value => String(value).replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[character]));
const xhtml = (title, content) => `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en"><head><title>${escapeXml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>${content}</body></html>`;

function paragraphs(body) {
  return body.split(/\n\s*\n/).filter(Boolean).map(block => {
    const safe = escapeXml(block).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    if (/^#{1,4}\s+/.test(block) && !block.includes('\n')) return `<h2>${safe.replace(/^#{1,4}\s+/, '')}</h2>`;
    return `<p>${safe.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');
}

export function createEpub(book) {
  const title = escapeXml(book.title);
  const chapterLinks = book.chapters.map((chapter, index) => `<li><a href="chapter-${index + 1}.xhtml">${index + 1}. ${escapeXml(chapter.title)}</a></li>`).join('');
  const date = new Date(book.updatedAt).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const files = {
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8('<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'),
    'OEBPS/content.opf': strToU8(`<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:uuid:${escapeXml(book.id)}</dc:identifier><dc:title>${title}</dc:title><dc:language>en</dc:language><dc:creator>Author’s review copy</dc:creator><dc:description>AI-assisted manuscript. Review and fact-check before publishing.</dc:description><meta property="dcterms:modified">${date}</meta></metadata><manifest><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="style" href="style.css" media-type="text/css"/>${book.chapters.map((_, index) => `<item id="ch${index + 1}" href="chapter-${index + 1}.xhtml" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine><itemref idref="cover"/><itemref idref="nav"/>${book.chapters.map((_, index) => `<itemref idref="ch${index + 1}"/>`).join('')}</spine></package>`),
    'OEBPS/style.css': strToU8('body{font-family:serif;line-height:1.6;margin:6%;color:#24211d}h1,h2{line-height:1.2}p{margin:1em 0}a{color:#b7442b}.cover{text-align:center;padding-top:20%}.cover h1{font-size:2.5em}.note{font-size:.85em;color:#666}'),
    'OEBPS/cover.xhtml': strToU8(xhtml(book.title, `<section class="cover" epub:type="titlepage"><p>A PRACTICAL SHORT EBOOK</p><h1>${title}</h1><p>For ${escapeXml(book.audience)}</p><p class="note">AI-assisted manuscript · Six complete chapters<br/>Review, fact-check, and personalize before publishing.</p></section>`)),
    'OEBPS/nav.xhtml': strToU8(xhtml('Contents', `<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${chapterLinks}</ol></nav>`)),
  };
  book.chapters.forEach((chapter, index) => { files[`OEBPS/chapter-${index + 1}.xhtml`] = strToU8(xhtml(chapter.title, `<section epub:type="chapter"><h1>${index + 1}. ${escapeXml(chapter.title)}</h1>${paragraphs(chapter.body)}</section>`)); });
  return zipSync(files);
}
