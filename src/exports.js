import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType } from 'docx';
import { parseArtwork } from './artwork.js';

const reviewNote = 'AI-assisted review copy. Edit, fact-check, and check image rights before publishing.';
const blocks = body => body.split(/\n\s*\n/).filter(Boolean);
const inline = text => text.split(/(\*\*[^*]+\*\*)/g).map(part => ({ text: part.startsWith('**') ? part.slice(2, -2) : part, bold: part.startsWith('**') }));

export function pdfDefinition(book) {
  const content = [
    { text: book.title, style: 'title' },
    ...(book.cover ? [{ image: book.cover.dataUrl, fit: [350, 400], alignment: 'center', margin: [0, 12, 0, 12] }] : []),
    { text: `For ${book.audience}`, alignment: 'center', margin: [0, 16, 0, 16] },
    { text: reviewNote, style: 'note' },
    { toc: { title: { text: 'Contents', style: 'heading' } }, pageBreak: 'before' },
  ];
  for (const [index, chapter] of book.chapters.entries()) {
    content.push({ text: `${index + 1}. ${chapter.title}`, style: 'heading', tocItem: true, pageBreak: 'before' });
    if (chapter.illustration) content.push({ image: chapter.illustration.dataUrl, fit: [460, 260], alignment: 'center', margin: [0, 12, 0, 16] });
    content.push(...blocks(chapter.body).map(block => /^#{1,4}\s+/.test(block) && !block.includes('\n')
      ? { text: block.replace(/^#{1,4}\s+/, ''), style: 'subheading' }
      : { text: inline(block), margin: [0, 0, 0, 10] }));
  }
  return {
    info: { title: book.title, subject: 'Ebook manuscript', creator: 'Ebook Studio' },
    pageSize: 'A4', pageMargins: [48, 48, 48, 48], defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.35 },
    styles: { title: { fontSize: 28, bold: true, alignment: 'center', margin: [0, 12, 0, 18] }, heading: { fontSize: 22, bold: true, margin: [0, 0, 0, 18] }, subheading: { fontSize: 15, bold: true, margin: [0, 12, 0, 8] }, note: { fontSize: 9, color: '#666666', alignment: 'center' } },
    footer: (page, pages) => ({ text: `${page} / ${pages}`, alignment: 'center', fontSize: 9, margin: [0, 14, 0, 0] }),
    content,
  };
}

export async function createPdf(book) {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([import('pdfmake/build/pdfmake.js'), import('pdfmake/build/vfs_fonts.js')]);
  pdfMake.addVirtualFileSystem(fonts.pdfMake?.vfs || fonts);
  return new Promise((resolve, reject) => {
    try { pdfMake.createPdf(pdfDefinition(book)).getBuffer(buffer => resolve(new Uint8Array(buffer))); }
    catch (error) { reject(error); }
  });
}

export async function createDocx(book) {
  const imageParagraph = (image, cover) => {
    const { bytes, extension } = parseArtwork(image.dataUrl);
    return new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: bytes, type: extension, transformation: { width: cover ? 280 : 440, height: cover ? 420 : 293 }, altText: { title: cover ? 'Cover illustration' : 'Chapter illustration', description: book.title, name: 'AI-assisted artwork' } })] });
  };
  const children = [
    new Paragraph({ text: book.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
    ...(book.cover ? [imageParagraph(book.cover, true)] : []),
    new Paragraph({ text: `For ${book.audience}`, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: reviewNote }),
    new Paragraph({ text: 'Contents', heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    ...book.chapters.map((chapter, index) => new Paragraph({ text: `${index + 1}. ${chapter.title}` })),
  ];
  for (const [index, chapter] of book.chapters.entries()) {
    children.push(new Paragraph({ text: `${index + 1}. ${chapter.title}`, heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
    if (chapter.illustration) children.push(imageParagraph(chapter.illustration, false));
    for (const block of blocks(chapter.body)) {
      children.push(/^#{1,4}\s+/.test(block) && !block.includes('\n')
        ? new Paragraph({ text: block.replace(/^#{1,4}\s+/, ''), heading: HeadingLevel.HEADING_2 })
        : new Paragraph({ spacing: { after: 160 }, children: block.split('\n').flatMap((line, i) => [...(i ? [new TextRun({ text: '', break: 1 })] : []), ...inline(line).map(run => new TextRun(run))]) }));
    }
  }
  const document = new Document({ title: book.title, description: 'Ebook manuscript', creator: 'Ebook Studio', sections: [{ properties: {}, children }] });
  return new Uint8Array(await Packer.toArrayBuffer(document));
}
