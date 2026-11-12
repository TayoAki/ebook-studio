import React, { useEffect, useState } from 'react';
import { loadArtwork } from './artwork-store.js';

function ArtworkPreview({ image, label, onRemove, disabled }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    setSrc(''); setError('');
    if (image) loadArtwork(image).then(result => { if (current) setSrc(result.dataUrl); }).catch(error => { if (current) setError(error.message); });
    return () => { current = false; };
  }, [image?.id]);
  return <div className="artwork-preview">{src ? <img src={src} alt={label} /> : <p>{error || (image ? 'Loading artwork…' : 'No artwork yet')}</p>}{image && <button className="text-button" disabled={disabled} onClick={onRemove}>Remove {label.toLowerCase()}</button>}</div>;
}

export default function ArtworkPanel({ book, activeChapter, busy, available, onGenerate, onChange, onStop }) {
  const [style, setStyle] = useState('Warm editorial watercolor, natural colors, clean composition, consistent visual style.');
  const index = activeChapter;
  return <section className="artwork-panel" aria-labelledby="artwork-heading"><h3 id="artwork-heading">Cover & chapter artwork</h3><p className="form-note">OpenAI images via OpenRouter. Each click uses API credits; nothing is generated automatically. Artwork stays in this browser and is embedded in EPUB, PDF, and DOCX downloads.</p><label htmlFor="art-direction">Art direction</label><textarea id="art-direction" maxLength={600} rows={2} value={style} disabled={Boolean(busy)} onChange={event => setStyle(event.target.value)} /><div className="artwork-grid"><div><h4>Book cover</h4><ArtworkPreview image={book.cover} label="Cover artwork" disabled={Boolean(busy)} onRemove={() => onChange({ ...book, cover: null })} /><button className="button secondary" disabled={Boolean(busy) || !available || !style.trim()} onClick={() => onGenerate('cover', style)}>{book.cover ? 'Regenerate cover' : 'Generate cover'}</button></div><div><h4>Chapter {index + 1}: {book.chapters[index].title}</h4><ArtworkPreview image={book.chapters[index].illustration} label="Chapter illustration" disabled={Boolean(busy)} onRemove={() => onChange({ ...book, chapters: book.chapters.map((chapter, i) => i === index ? { ...chapter, illustration: null } : chapter) })} /><button className="button secondary" disabled={Boolean(busy) || !available || !style.trim()} onClick={() => onGenerate('illustration', style, index)}>{book.chapters[index].illustration ? 'Regenerate illustration' : 'Illustrate this chapter'}</button></div></div>{busy === 'artwork' && <p role="status">Creating artwork—this can take several minutes. <button className="text-button" onClick={onStop}>Stop artwork generation</button></p>}</section>;
}
