import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, ArrowDown, ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight, Plus, X, Sparkles, Download, ShieldCheck, Menu, CheckCheck, Library, Trash2, PencilLine } from 'lucide-react';
import { suggestions, createDraft, loadDrafts, saveDraft, serializeBook } from './book.js';
import { generatedDraft, requestGeneration, writeBook } from './generation.js';
import { createEpub } from './epub.js';
import { platforms, ProductFeatures, HowItWorks, CreatorStories, Distribution, PricingSection, ReferenceFooter } from './ReplicaSections.jsx';

const plans = [{ price: 29, credits: 300 }, { price: 39, credits: 500 }, { price: 49, credits: 750 }, { price: 59, credits: 1000 }, { price: 79, credits: 1500 }, { price: 99, credits: 2000 }];
const faqs = [
  ['How is this different from just using ChatGPT?', 'This independent replica uses OpenRouter to plan a six-chapter outline and write every chapter of a short ebook. Review the outline, watch the manuscript build chapter by chapter, edit it, and download TXT or EPUB. Generated writing needs human review and fact-checking. Covers and illustrations are not generated here.'],
  ['Who is getebook for?', 'Coaches with a process to share. Creators with a great idea. Parents with hard-won experience. Anyone who knows something that could help someone else. You don’t need writing or design experience to start.'],
  ['Can I make coloring books too?', 'Yes, coloring books are part of the original getebook product. You can flip through a real coloring-book sample here. This demo’s creation workspace focuses on written ebook drafts; it does not generate illustrations.'],
  ['Do I own my book, and can I sell it?', 'Your original writing belongs to you. Before selling, make sure you have rights to every image and passage you include, review the content for accuracy, and check your chosen marketplace’s AI-content policies. The sample books on this page are examples from getebook.ai, not resale assets.'],
  ['Do I need a credit card to get started?', 'This private preview does not collect payments. AI requests use the owner’s OpenRouter API credits. The monthly plans shown belong to the original product; checkout and subscriptions are not connected here.'],
  ['Where are my drafts saved?', 'Saved drafts stay in this browser’s local storage and are not synced across devices. AI generation sends your brief and relevant chapter text through our API to OpenRouter and its model provider. Do not include confidential information. Download a backup before clearing browser data.'],
];

function Logo() { return <a className="logo" href="#" aria-label="getebook.ai home"><svg className="logo-icon" width="23" height="23" viewBox="0 0 28 28" aria-hidden="true"><path d="M2 5c5-1 8 0 12 2v18c-4-2-7-3-12-2Z" fill="#ff8367" /><path d="M26 5c-5-1-8 0-12 2v18c4-2 7-3 12-2Z" fill="#ff6244" /><path d="M14 7v18" stroke="white" strokeWidth=".6" /></svg><span>getebook<span className="coral">.ai</span></span></a>; }
function Button({ children, className = '', ...props }) { return <button className={`button ${className}`} {...props}>{children}</button>; }
function SectionHeading({ eyebrow, title, children, className = '' }) { return <div className={`section-heading ${className}`}><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{children && <p>{children}</p>}</div>; }

function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab') {
        const items = [...ref.current.querySelectorAll('button:not(:disabled), input, textarea, select, a[href], [tabindex="0"]')];
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className={`modal ${wide ? 'modal-wide' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}><div className="modal-heading"><div><span className="eyebrow">A LITTLE IDEA. A NEW CHAPTER.</span><h2 id="modal-title">{title}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={21} /></button></div>{children}</div></div>;
}

function SampleBook({ kind, category, title, description, onUse }) {
  const [page, setPage] = useState(0);
  const image = `/images/${kind}-${page === 0 ? '00-cover' : String(page).padStart(2, '0')}.webp`;
  return <article className={`sample-card sample-${kind}`}><div className="sample-topline"><span className="sample-type"><span className="tiny-dot" />{category}</span><span className="sample-pages">Cover + 10 pages</span></div><div className="book-stage"><img src={image} alt={page === 0 ? `${title} cover` : `${title}, sample page ${page}`} loading="lazy" width={kind === 'ebook' ? 226 : 280} height={320} /><span className="book-ground" /></div><div className="reader-controls"><button className="icon-button" disabled={page === 0} aria-label={`Previous page of ${title}`} onClick={() => setPage(page - 1)}><ChevronLeft size={17} /></button><span aria-live="polite">{page === 0 ? 'Cover' : `Page ${page}`} <span className="muted">/ 10</span></span><button className="icon-button" disabled={page === 10} aria-label={`Next page of ${title}`} onClick={() => setPage(page + 1)}><ChevronRight size={17} /></button></div><div className="sample-info"><div><h3>{title}</h3><p>{description}</p></div><button className="sample-use" onClick={onUse} aria-label={`Create a book like ${title}`}><ArrowUpRight size={21} /></button></div></article>;
}

function Builder({ initialIdea, existing, onClose, onSaved, aiAvailable }) {
  const [step, setStep] = useState(existing ? 2 : 0);
  const [idea, setIdea] = useState(initialIdea || '');
  const [audience, setAudience] = useState('Curious beginners');
  const [tone, setTone] = useState('Friendly & practical');
  const [draft, setDraft] = useState(existing || null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [writingIndex, setWritingIndex] = useState(0);
  const controller = useRef(null);
  const latest = useRef(existing || null);
  useEffect(() => () => controller.current?.abort(), []);
  const update = (value) => { setDraft(value); setDirty(true); setSaved(false); };
  const keep = (value) => {
    latest.current = value; setDraft(value);
    try { saveDraft(value); onSaved(); setSaved(true); setDirty(false); }
    catch { setSaved(false); setDirty(true); setError('Browser storage is full or unavailable. Keep this window open and download your manuscript.'); }
  };
  const handleClose = () => {
    if (busy) { if (!window.confirm('Stop generation and close? Chapters already written have been kept in this browser when storage is available.')) return; controller.current?.abort(); }
    else if (dirty && !window.confirm('Close without saving your latest changes?')) return;
    onClose();
  };
  const generate = async (event) => {
    event.preventDefault(); setError(''); setBusy('outline'); controller.current = new AbortController();
    try {
      const reader = audience.trim() || 'Curious beginners';
      const outline = await requestGeneration('outline', { idea, audience: reader, tone }, controller.current.signal);
      keep(generatedDraft(outline, idea, reader, tone)); setStep(1);
    } catch (error) { if (error.name !== 'AbortError') setError(error.message); }
    finally { setBusy(''); }
  };
  const template = () => { try { update(createDraft(idea, audience.trim() || 'Curious beginners', tone)); setStep(1); setError(''); } catch (error) { setError(error.message); } };
  const write = async () => {
    setBusy('chapters'); setError(''); setStep(2); controller.current = new AbortController(); latest.current = draft;
    try {
      const result = await writeBook(draft, { signal: controller.current.signal, onProgress: (book, index) => { setWritingIndex(index); setActiveChapter(index); keep(book); } });
      keep(result);
    } catch (error) {
      keep({ ...latest.current, generation: { ...latest.current.generation, status: 'partial' } });
      setError(error.name === 'AbortError' ? 'Writing stopped. Completed chapters are kept; resume when you’re ready.' : error.message);
    } finally { setBusy(''); }
  };
  const save = () => { try { saveDraft(draft); setSaved(true); setDirty(false); onSaved(); } catch { setError('Your browser could not save this draft. Download a copy instead.'); } };
  const download = (format = 'txt') => {
    const url = URL.createObjectURL(new Blob([format === 'epub' ? createEpub(draft) : serializeBook(draft)], { type: format === 'epub' ? 'application/epub+zip' : 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${draft.title.replace(/[^a-z0-9]/gi, '-').slice(0, 70) || 'my-ebook'}.${format}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const completed = draft?.chapters.filter(chapter => chapter.generated).length || 0;
  const totalWords = draft?.chapters.reduce((total, chapter) => total + chapter.body.trim().split(/\s+/).filter(Boolean).length, 0) || 0;
  return <Modal title={step === 0 ? 'What’s your book about?' : step === 1 ? 'Every great book starts here.' : 'Make it unmistakably yours.'} onClose={handleClose} wide={step === 2}>
    <div className="demo-notice"><Sparkles size={15} /><span>{draft && !draft.generation ? 'Template draft · starter prompts, not AI-written text' : aiAvailable ? 'Live AI writing via OpenRouter · review and fact-check before publishing' : 'OpenRouter is unavailable. Start the API server with a configured key, or use a template.'}</span></div>
    <div className="builder-steps">{['Your idea', 'Your outline', 'Your draft'].map((label, i) => <span className={step >= i ? 'active' : ''} key={label}><b>{step > i ? <Check size={12} /> : i + 1}</b>{label}</span>)}</div>
    {step === 0 && <form onSubmit={generate} className="builder-form"><label htmlFor="book-idea">The idea you want to share</label><textarea id="book-idea" value={idea} disabled={Boolean(busy)} onChange={e => setIdea(e.target.value)} maxLength={500} required rows={3} placeholder="A practical guide to something you know and love…" /><div className="form-row"><div><label htmlFor="audience">Who’s it for?</label><input id="audience" value={audience} disabled={Boolean(busy)} maxLength={100} onChange={e => setAudience(e.target.value)} /></div><div><label htmlFor="tone">Make it sound…</label><select id="tone" value={tone} disabled={Boolean(busy)} onChange={e => setTone(e.target.value)}><option>Friendly & practical</option><option>Clear & professional</option><option>Warm & inspiring</option></select></div></div><p className="form-note"><ShieldCheck size={15} /> AI writing sends your brief and chapter text to OpenRouter and uses the owner’s API credits. Saved books stay in this browser.</p>{error && <p role="alert" className="error">{error}</p>}<div className="generation-actions"><Button type="submit" disabled={Boolean(busy) || !aiAvailable}>{busy === 'outline' ? 'Planning your book…' : 'Build my AI outline'} <ArrowRight size={17} /></Button><button type="button" className="text-button" onClick={template} disabled={Boolean(busy)}>Use a starter template instead</button></div>{busy === 'outline' && <p role="status" className="form-note">Creating six chapters around your idea…</p>}</form>}
    {step === 1 && <div className="outline-editor"><label htmlFor="draft-title">BOOK TITLE</label><input id="draft-title" className="title-input" value={draft.title} maxLength={140} onChange={e => update({ ...draft, title: e.target.value })} /><p className="form-note">{draft.generation ? 'Rename any chapter, then let AI write a complete short ebook of roughly 3,600–4,800 words. This usually takes a few minutes.' : 'Template mode: these chapters contain writing prompts, not a finished book.'}</p><div className="chapter-list">{draft.chapters.map((chapter, i) => <label key={i}><span>{String(i + 1).padStart(2, '0')}</span><input aria-label={`Chapter ${i + 1} title`} value={chapter.title} maxLength={140} required onChange={e => update({ ...draft, chapters: draft.chapters.map((c, n) => n === i ? { ...c, title: e.target.value } : c) })} /><PencilLine size={14} /></label>)}</div>{error && <p role="alert" className="error">{error}</p>}<div className="modal-actions"><button className="text-button" onClick={() => setStep(0)}><ArrowLeft size={16} /> Back</button><Button onClick={draft.generation ? write : () => setStep(2)} disabled={!draft.title.trim() || draft.chapters.some(chapter => !chapter.title.trim())}>{draft.generation ? 'Write my book with AI' : 'Open my draft'} <ArrowRight size={17} /></Button></div></div>}
    {step === 2 && draft.generation && <div className="generation-progress"><div role="status" aria-live="polite"><strong>{busy === 'chapters' ? `Writing chapter ${writingIndex + 1} of 6…` : completed === 6 ? 'Your AI-written manuscript is ready to review.' : `${completed} of 6 chapters written — finish your book below.`}</strong><span>{totalWords.toLocaleString()} words · {draft.generation.model}</span></div><progress aria-label="Chapters written" max={6} value={completed} />{busy === 'chapters' ? <button className="text-button" onClick={() => controller.current?.abort()}>Stop writing</button> : completed < 6 && <Button onClick={write} disabled={!aiAvailable}>Resume AI writing <ArrowRight size={16} /></Button>}</div>}
    {step === 2 && <><div className="workspace"><aside><p>YOUR CHAPTERS</p>{draft.chapters.map((chapter, i) => <button key={i} onClick={() => setActiveChapter(i)} className={activeChapter === i ? 'selected' : ''}><span>{chapter.generated ? <Check size={12} /> : String(i + 1).padStart(2, '0')}</span>{chapter.title}</button>)}</aside><div className="manuscript"><span className="eyebrow">CHAPTER {String(activeChapter + 1).padStart(2, '0')}</span><input aria-label="Chapter title" disabled={Boolean(busy)} value={draft.chapters[activeChapter].title} maxLength={140} onChange={e => update({ ...draft, chapters: draft.chapters.map((c, i) => i === activeChapter ? { ...c, title: e.target.value } : c) })} /><textarea aria-label="Chapter content" disabled={Boolean(busy)} placeholder="This chapter has not been written yet. Use Resume AI writing to finish your book." value={draft.chapters[activeChapter].body} onChange={e => update({ ...draft, chapters: draft.chapters.map((c, i) => i === activeChapter ? { ...c, body: e.target.value } : c) })} /><span className="word-count">{draft.chapters[activeChapter].body.trim().split(/\s+/).filter(Boolean).length} words · {draft.tone}</span></div></div>{error && <p className="error" role="alert">{error}</p>}<div className="modal-actions"><span className="save-status" aria-live="polite">{saved ? <><CheckCheck size={15} /> Saved to this browser</> : 'Your words. Your next chapter.'}</span><div className="action-group"><button className="button secondary" disabled={Boolean(busy)} onClick={save}>{saved ? <Check size={16} /> : <Library size={16} />}{saved ? 'Saved' : 'Save draft'}</button><Button disabled={Boolean(busy)} onClick={() => download('txt')}><Download size={16} /> Download .txt</Button>{draft.generation?.status === 'complete' && <Button onClick={() => download('epub')}><Download size={16} /> Download .epub</Button>}</div></div></>}
  </Modal>;
}

export default function App() {
  const [idea, setIdea] = useState('');
  const inputRef = useRef(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [modal, setModal] = useState(null);
  const [builderIdea, setBuilderIdea] = useState('');
  const [existing, setExisting] = useState(null);
  const [drafts, setDrafts] = useState(() => loadDrafts());
  const [filter, setFilter] = useState('all');
  const [plan, setPlan] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const [aiAvailable, setAiAvailable] = useState(false);
  useEffect(() => { fetch('/api/health').then(response => response.json()).then(result => setAiAvailable(result.configured === true)).catch(() => setAiAvailable(false)); }, []);
  const start = (value = '') => { setBuilderIdea(value); setExisting(null); setModal('builder'); setMobileNav(false); };
  const fillIdea = (value) => { setIdea(value); inputRef.current?.focus(); };
  const refreshDrafts = () => setDrafts(loadDrafts());
  const removeDraft = (id) => { try { localStorage.setItem('getebook-drafts', JSON.stringify(drafts.filter(d => d.id !== id))); refreshDrafts(); } catch { window.alert('This browser could not update your library.'); } };
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="nav-wrap"><Logo /><nav className={mobileNav ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">{[['How it works', 'how-it-works'], ['Features', 'features'], ['Pricing', 'pricing'], ['FAQ', 'faq']].map(([name, id]) => <a key={id} href={`#${id}`} onClick={() => setMobileNav(false)}>{name}</a>)}</nav><div className="nav-actions"><button className="library-link" onClick={() => { refreshDrafts(); setModal('library'); }}><Library size={15} /> My library{drafts.length > 0 && <span>{drafts.length}</span>}</button><Button onClick={() => start(idea)} className="nav-cta">Start building, free <ArrowRight size={16} /></Button><button className="menu-button icon-button" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation" aria-expanded={mobileNav}>{mobileNav ? <X size={21} /> : <Menu size={21} />}</button></div></div></header>

    <main id="main">
      <section className="hero">
        <div className="hero-eyebrow" title="Claim reproduced from getebook.ai; not independently verified"><span className="reference-proof-dot" /> Loved by 12,000+ creators publishing with AI</div>
        <h1>Write it once. <span>Let it earn forever.</span></h1>
        <p className="hero-description">Just tell Booker what you know. Watch it plan your outline and write every chapter, building your ebook manuscript in front of you.</p>
        <form className="prompt-card" onSubmit={e => { e.preventDefault(); start(idea); }}>
          <label htmlFor="hero-idea" className="visually-hidden">What would you love to write about?</label>
          <textarea ref={inputRef} id="hero-idea" aria-label="Your ebook idea" value={idea} onChange={e => setIdea(e.target.value)} maxLength={500} placeholder="A 30-day meditation guide for beginners" rows={2} required />
          <div className="prompt-bottom"><Button type="submit" disabled={!idea.trim()} aria-label="Create my ebook"><ArrowDown className="submit-arrow" size={21} /></Button></div>
        </form>
        <div className="suggestions">{suggestions.map(value => <button type="button" key={value} onClick={() => fillIdea(value)}>{value}</button>)}</div>
        <p className="hero-reassurance">No credit card to start · cancel anytime · plans from $29/mo</p>
        <a className="explore-link" href="#how-it-works">See how it works <ArrowDown size={14} /></a>
        <p className="hero-demo-notice">{aiAvailable ? 'Live AI writing via OpenRouter · TXT & EPUB exports · review before publishing' : 'AI writing requires the configured book API · starter templates also available'}</p>
        <div className="platforms"><span>PUBLISH AND SELL ON</span><div className="platform-logos">{platforms.map(([image, label]) => <img key={image} src={`/images/${image}.webp`} alt={label} width="35" height="35" />)}</div></div>
      </section>

      <section className="examples section" id="examples"><div className="container"><div className="section-title-row"><SectionHeading eyebrow="FLIP THROUGH A REAL BOOK" title="See exactly what you’ll create">These are real books made with getebook.ai. One is a polished ebook, the other a print-ready coloring book. Tap the arrows to flip through the cover and first pages.</SectionHeading><div className="sample-filter" aria-label="Filter sample books">{[['all', 'All books'], ['ebook', 'Ebooks'], ['coloring', 'Coloring books']].map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div></div><div className={`sample-grid ${filter !== 'all' ? 'filtered' : ''}`}>
        {filter !== 'coloring' && <SampleBook kind="ebook" category="THE PRACTICAL GUIDE" title="Meal Prep Made Easy for Parents" description="eBook · cover + 10 pages" onUse={() => start(suggestions[0])} />}
        {filter !== 'ebook' && <SampleBook kind="coloring" category="A LITTLE IMAGINATION" title="Pip’s Garden Tea Party" description="Coloring book · cover + 10 pages" onUse={() => { setOpenFaq(2); document.getElementById('faq').scrollIntoView({ behavior: 'smooth' }); }} />}
      </div><p className="sample-footnote"><BookOpen size={14} /> Actual sample books from getebook.ai. Go ahead, turn a page.</p></div></section>

      <ProductFeatures onStart={() => start(idea)} />
      <HowItWorks />
      <CreatorStories onStart={() => start(idea)} />
      <Distribution />
      <PricingSection plans={plans} selected={plan} onSelect={setPlan} onSubscribe={() => setModal('plan')} />

      <section className="faq-section section" id="faq"><div className="container faq-layout"><SectionHeading eyebrow="QUESTIONS YOU MIGHT HAVE" title="Questions? We’ve got answers." /><div className="faq-list">{faqs.map(([question, answer], index) => <div className={`faq-item ${openFaq === index ? 'open' : ''}`} key={question}><h3><button aria-expanded={openFaq === index} aria-controls={`faq-answer-${index}`} id={`faq-question-${index}`} onClick={() => setOpenFaq(openFaq === index ? null : index)}>{question}<Plus size={19} /></button></h3><div id={`faq-answer-${index}`} role="region" aria-labelledby={`faq-question-${index}`} hidden={openFaq !== index}><p>{answer}</p></div></div>)}</div></div></section>

      <section className="final-cta"><h2>Your knowledge is worth more than you think.</h2><p>Tell Booker your idea, review the outline, then let AI write your short ebook. Edit and export when you’re ready.</p><Button onClick={() => start(idea)}>Start building <ArrowRight size={17} /></Button><span className="cta-small">AI-assisted writing · TXT & EPUB downloads · Your final review matters</span><span className="cta-small">Independent replica · no payments, illustration generation, or cloud publishing</span></section>
    </main>

    <ReferenceFooter logo={<Logo />} />
    {modal === 'builder' && <Builder initialIdea={builderIdea} existing={existing} onClose={() => setModal(null)} onSaved={refreshDrafts} aiAvailable={aiAvailable} />}
    {modal === 'library' && <Modal title="Your little library." onClose={() => setModal(null)}><p className="library-intro">Ideas you’ve started. Possibilities worth coming back to.<br />Saved in this browser, just for you.</p>{drafts.length ? <div className="draft-library">{drafts.map(draft => <div className="draft-row" key={draft.id}><span className="draft-book-icon"><BookOpen size={21} /></span><button onClick={() => { setExisting(draft); setModal('builder'); }}><strong>{draft.title}</strong><span>{draft.chapters.length} chapters · {new Date(draft.updatedAt).toLocaleDateString()}</span></button><button className="icon-button" aria-label={`Delete ${draft.title}`} onClick={() => { if (window.confirm('Delete this saved draft from your browser?')) removeDraft(draft.id); }}><Trash2 size={16} /></button></div>)}</div> : <div className="empty-library"><BookOpen size={40} strokeWidth={1.2} /><h3>Every library starts with one book.</h3><p>Give that idea a place to grow.</p></div>}<Button onClick={() => start()}><Plus size={16} /> Start a new book</Button></Modal>}
    {modal === 'plan' && <Modal title="Your next big thing, on Pro." onClose={() => setModal(null)}><div className="plan-summary"><Sparkles size={29} /><h3>{plans[plan].credits.toLocaleString()} credits · ${plans[plan].price}/month</h3><p>This is an independent replica. Checkout is not connected, and no subscription charge will be taken.</p><p>The book workspace uses the owner’s OpenRouter credits. Visit the original product for its paid plans and full publishing features.</p></div><div className="plan-actions"><Button onClick={() => start(idea)}>Try the book workspace <ArrowRight size={16} /></Button><a className="inline-link" href="https://getebook.ai/" target="_blank" rel="noreferrer">Visit getebook.ai <ArrowUpRight size={15} /></a></div></Modal>}
  </>;
}
