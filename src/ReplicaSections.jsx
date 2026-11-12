import React, { useEffect, useRef } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Check, FileDown, Image, LayoutGrid, PenLine, ShieldCheck, Sparkles, Star, Zap, RefreshCw, Copyright } from 'lucide-react';

export const platforms = [
  ['amazon-kdp', 'Amazon KDP'], ['apple-books', 'Apple Books'], ['etsy', 'Etsy'], ['gumroad', 'Gumroad'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['facebook', 'Facebook'],
];

function Heading({ tag, label, children, description }) {
  return <div className="reference-heading"><div className="reference-pill"><span>{tag}</span>{label}</div><h2>{children}</h2>{description && <p>{description}</p>}</div>;
}

function ProductVideo({ name, title }) {
  const ref = useRef(null);
  useEffect(() => {
    const video = ref.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !motion.matches) video.play().catch(() => {});
      else video.pause();
    }, { rootMargin: '80px' });
    observer.observe(video);
    return () => { observer.disconnect(); video.pause(); };
  }, []);
  return <video ref={ref} className="product-video" muted loop playsInline controls preload="none" poster={`/images/${name}.webp`} aria-label={`${title} — original product demonstration`}><source src={`/videos/${name}.mp4`} type="video/mp4" /></video>;
}

export function ProductFeatures({ onStart }) {
  const items = [
    [PenLine, 'From idea to finished book', 'Type one sentence about what you know. getebook turns it into a titled, chaptered, fully written ebook.', 'v3-feat-idea'],
    [Image, 'Covers that earn the click', 'Get a professional cover designed for you, the kind that stands out on a crowded store page.', 'v3-feat-cover'],
    [LayoutGrid, 'Ebooks and coloring books', 'Lead magnets, guides, reports, workbooks, courses, and novels, plus a studio for print-ready coloring books. Pick what fits your goal.', 'v3-feat-formats'],
    [FileDown, 'Store-ready in one click', 'Export a clean, typeset PDF or EPUB that is ready for KDP, Etsy, or Apple Books the same day.', 'v3-feat-export'],
  ];
  return <section className="reference-features section" id="features"><div className="container"><Heading tag="Features" label="What you get" description="No writing degree, no design skills, no ghostwriter invoice. Just your idea and a few minutes.">Everything you need to<br />publish and profit</Heading><div className="reference-feature-grid">{items.map(([Icon, title, text, video]) => <article key={title}><div className="reference-feature-copy"><span><Icon size={19} /></span><div><h3>{title}</h3><p>{text}</p></div></div><ProductVideo name={video} title={title} /></article>)}</div><p className="reference-disclosure">Original product demonstrations from getebook.ai. This replica writes text with OpenRouter; covers and illustrations are not generated here.</p><button className="button" onClick={onStart}>Create your ebook for free <ArrowRight size={17} /></button></div></section>;
}

export function HowItWorks() {
  const items = [
    ['One', 'Tell Booker your idea', 'Describe what you know in a sentence. Booker turns it into a titled, chaptered ebook brief. That is the whole setup.', 'v3-step1'],
    ['Two', 'Watch it build live', 'Booker writes every chapter and designs your cover in front of you. Preview the whole ebook, cover to cover, and edit anything before you commit.', 'v3-step2'],
    ['Three', 'Go Pro, download and sell', 'Go Pro from $29/mo to unlock the download. Export a store-ready PDF, EPUB, or DOCX and list it on Amazon KDP, Etsy, or your own site.', 'v3-step3'],
  ];
  return <section className="reference-how section" id="how-it-works"><div className="container"><Heading tag="How it works" label="Idea to sellable ebook, live">Three steps from your idea to a published ebook</Heading><div className="reference-step-grid">{items.map(([number, title, text, video]) => <article key={number}><span className="reference-step-label">Step {number}</span><ProductVideo name={video} title={title} /><h3>{title}</h3><p>{text}</p></article>)}</div><p className="reference-disclosure">Videos show the original product. Our workspace writes a six-chapter manuscript and exports TXT or EPUB; cover generation, payments, and direct publishing are not connected.</p></div></section>;
}

const stories = [
  ['BH', 'Ben H.', 'Side-hustle creator', 'I turned a topic I already knew well into a short guide over a weekend. It was live on KDP by Monday and made its first sales that week.', '$612 in week one', 'kdp-dashboard-carmen.webp'],
  ['DR', 'David R.', 'Newsletter writer', 'I always meant to write an ebook and never did. With getebook I shipped five in a month and they sell while I sleep.', '5 guides published'],
  ['SK', 'Sofia K.', 'Marketing consultant', 'I made a free lead magnet in an afternoon. It looks like something I paid a designer for, and it doubled my signups.', 'Grew my email list'],
  ['MD', 'Marco D.', 'Etsy shop owner', 'I added a few digital ebooks to my Etsy shop with zero inventory and zero design work. Traffic and orders climbed without any extra work from me.', '80% more shop visits'],
  ['PJ', 'Priya J.', 'Course creator', 'The cover and formatting are what sold me. It looks professional out of the box, so I had nothing left to fix before publishing.', 'Idea to launch in a day'],
  ['JM', 'James M.', 'Solopreneur', 'This is the first thing I have made that keeps earning after I stop working on it. The math finally works in my favor.', 'First passive income'],
];

export function CreatorStories({ onStart }) {
  return <section className="reference-stories section"><div className="container"><Heading tag="Results" label="Not just words, real income">Real creators. Real income.</Heading><div className="reference-stories-grid">{stories.map(([initials, name, role, quote, badge, proof]) => <article key={name}><div className="story-person"><span>{initials}</span><div><strong>{name}</strong><small>{role}</small></div></div><div className="story-stars" aria-label="5 stars">{[0, 1, 2, 3, 4].map(i => <Star key={i} size={12} fill="currentColor" />)}</div><blockquote>“{quote}”</blockquote><span className="story-result">{badge}</span>{proof && <img src={`/images/${proof}`} alt="Revenue dashboard shown in the original testimonial" loading="lazy" />}</article>)}</div><p className="reference-disclosure">Testimonials and earnings claims reproduced from getebook.ai, not results of this demo and not independently verified.</p><button className="button" onClick={onStart}>Start creating for free <ArrowRight size={17} /></button></div></section>;
}

export function Distribution() {
  return <section className="reference-distribution section"><div className="container"><Heading tag="Distribution" label="Sell wherever your readers are" description="getebook exports the exact formats these platforms want, so you can list and start selling the same day.">Your ebook, ready for every platform you sell on</Heading><div className="distribution-orbit"><svg viewBox="0 0 560 390" aria-hidden="true">{[[280, 35], [455, 110], [475, 250], [365, 355], [190, 355], [80, 250], [100, 110]].map(([x, y], i) => <line key={i} x1="280" y1="195" x2={x} y2={y} />)}</svg><span className="orbit-center"><BookOpen size={20} fill="currentColor" /> getebook<span>.ai</span></span>{platforms.map(([image, label], i) => <span className={`orbit-platform orbit-platform-${i}`} key={image}><img src={`/images/${image}.webp`} alt={label} loading="lazy" /></span>)}</div><p className="reference-disclosure">Platform compatibility shown for the original service. This replica exports TXT and EPUB for review; automatic publishing and PDF/DOCX exports are not connected.</p></div></section>;
}

export function PricingSection({ plans, selected, onSelect, onSubscribe }) {
  return <section className="reference-pricing section" id="pricing"><div className="container"><Heading tag="Pricing" label="Start free, pay only if you publish">Plans from $29/mo, pay only when you’re ready to sell</Heading><div className="reference-price-card"><span className="reference-popular"><Star size={11} fill="currentColor" /> MOST POPULAR</span><span className="reference-pro">PRO</span><div className="price" aria-live="polite">${plans[selected].price}<span>/mo</span></div><p className="reference-credits">{plans[selected].credits.toLocaleString()} credits every month</p><p className="billing-note">Cancel anytime · billed monthly · no lock-in</p><ul>{['Download every ebook you build, instantly', 'Credits refresh every month', 'Export store-ready PDF, EPUB, and DOCX', 'Full commercial license — sell on KDP, Etsy, or your own site', 'Regenerate any chapter, title, or cover', 'Cancel anytime, no lock-in'].map(text => <li key={text}><span><Check size={12} /></span>{text}</li>)}</ul><button className="button" onClick={onSubscribe}>Get Pro — ${plans[selected].price}/mo <ArrowRight size={17} /></button></div><div className="reference-plan-picker"><h3>PRO PLANS</h3><p>Pick the monthly credits that fit you — tap a plan, then subscribe. Change anytime.</p><div className="reference-plan-grid" aria-label="Monthly credit plan">{plans.map((plan, index) => <button key={plan.credits} aria-pressed={selected === index} className={selected === index ? 'active' : ''} onClick={() => onSelect(index)}>{index === 0 && <span className="plan-popular">POPULAR</span>}<strong>${plan.price}<small>/mo</small></strong><span>{plan.credits.toLocaleString()} credits</span></button>)}</div><p>Every plan includes the full Pro feature set. Cancel anytime.</p></div><div className="reference-benefits">{[[Zap, 'Instant Access', 'Your credits unlock the moment you subscribe.'], [RefreshCw, 'Cancel Anytime', 'No contracts, no lock-in.'], [ShieldCheck, 'Secure Payments', 'Original service checkout is processed by Stripe.'], [Copyright, 'Commercial Rights', 'Your original work belongs to you.']].map(([Icon, title, text]) => <div key={title}><span><Icon size={21} /></span><h3>{title}</h3><p>{text}</p></div>)}</div><p className="reference-disclosure">Original product pricing and features. No subscription payment is taken here. AI writing uses the owner’s OpenRouter credits; this replica exports TXT and EPUB only.</p></div></section>;
}

export function ReferenceFooter({ logo }) {
  const columns = [
    ['Product', [['How it works', '#how-it-works'], ['Features', '#features'], ['Examples', '#examples'], ['Pricing', '#pricing']]],
    ['Resources', [['Blog', '/blog'], ['Free tools', '/tools'], ['Ebook types', '/ebook-types'], ['Glossary', '/glossary']]],
    ['For', [['Authors', '/for/authors'], ['Coaches', '/for/coaches'], ['Consultants', '/for/consultants'], ['Course creators', '/for/course-creators']]],
    ['Company', [['Contact', '/contact'], ['Privacy', '/privacy'], ['Terms', '/terms'], ['Cookies', '/cookies']]],
  ];
  return <footer className="reference-footer"><div className="container"><div className="reference-footer-grid"><div>{logo}<p>Publish once. Earn on repeat.</p><a href="https://getebook.ai/" target="_blank" rel="noreferrer">Visit the original product <ArrowUpRight size={13} /></a></div>{columns.map(([name, links]) => <div key={name}><h3>{name}</h3>{links.map(([text, href]) => <a key={text} href={href.startsWith('#') ? href : `https://getebook.ai${href}`} target={href.startsWith('#') ? undefined : '_blank'} rel={href.startsWith('#') ? undefined : 'noreferrer'}>{text}</a>)}</div>)}</div><div className="reference-footer-bottom"><span>© {new Date().getFullYear()} · Independent getebook.ai replica. Not affiliated with the original service.</span><span>OpenRouter text generation · no payment processing or cloud publishing</span></div></div></footer>;
}
