import { parseArtwork } from './artwork.js';

const unsavedArtwork = new Map();

function openStore() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('Artwork storage is unavailable in this browser.'));
    const request = indexedDB.open('ebook-studio-artwork', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('images', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Could not open artwork storage. Allow browser storage and retry.'));
  });
}

async function transaction(mode, run) {
  const db = await openStore();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('images', mode);
      const request = run(tx.objectStore('images'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(new Error('Could not save or read artwork. Browser storage may be full or unavailable.'));
    });
  } finally { db.close(); }
}

export async function saveArtwork(image) {
  parseArtwork(image.dataUrl);
  const record = { ...image, id: crypto.randomUUID() };
  try { await transaction('readwrite', store => store.put(record)); }
  catch { unsavedArtwork.set(record.id, record); record.volatile = true; }
  const { dataUrl, ...metadata } = record;
  return metadata;
}

export async function loadArtwork(metadata) {
  if (!metadata) return null;
  const image = unsavedArtwork.get(metadata.id) || await transaction('readonly', store => store.get(metadata.id));
  if (!image) throw new Error('Artwork is missing from this browser. Remove or regenerate it before exporting.');
  parseArtwork(image.dataUrl);
  return image;
}

export async function hydrateArtwork(book, load = loadArtwork) {
  return {
    ...book, cover: await load(book.cover),
    chapters: await Promise.all(book.chapters.map(async chapter => ({ ...chapter, illustration: await load(chapter.illustration) }))),
  };
}
