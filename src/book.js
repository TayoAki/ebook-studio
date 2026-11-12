export const suggestions = [
  'A meal-prep guide for busy parents',
  'Side-hustle 101 for complete beginners',
  'A productivity system that actually sticks',
];

export function createDraft(idea, audience = 'Curious beginners', tone = 'Friendly & practical') {
  const cleaned = idea.trim();
  if (!cleaned) throw new Error('Tell us a little about your book first.');
  if (cleaned.length > 500) throw new Error('Keep your idea to 500 characters or fewer.');
  const topic = cleaned.replace(/^(a|an|the)\s+/i, '').replace(/[.!?]+$/, '');
  return {
    id: globalThis.crypto.randomUUID(),
    title: topic.charAt(0).toUpperCase() + topic.slice(1),
    idea: cleaned, audience, tone, updatedAt: Date.now(),
    chapters: [
      { title: 'A fresh start', body: `Welcome to your guide to ${topic.toLowerCase()}. This is your space to share what you know with ${audience.toLowerCase()}.\n\nStart with your story. What made you care about this topic? What do you wish you had known at the beginning? Add a real example that helps your reader feel understood.\n\nYour first small step: write down one outcome you want your reader to achieve by the end of this guide.` },
      { title: 'The essentials, made simple', body: 'Introduce the three to five ideas your reader needs to understand first. Explain each in plain language, then add an example from your own experience.\n\nMake it practical: include a short checklist of what to prepare before getting started.' },
      { title: 'Your step-by-step roadmap', body: 'Break your process into small, achievable steps. For each step, explain what to do, why it matters, and how the reader will know it is working.\n\nTry it today: choose the easiest first action and turn it into a ten-minute exercise.' },
      { title: 'Common roadblocks (and how to move past them)', body: 'Share the mistakes you made so your reader does not have to. Describe three common obstacles and a practical way to work through each one.\n\nReflection: what is most likely to get in your reader’s way? Give them a backup plan.' },
      { title: 'Make it your own', body: 'Help your reader adapt your advice to their own life. Include an example, a simple worksheet, or a personal challenge.\n\nProgress beats perfection. Encourage your reader to start small, notice what works, and adjust as they learn.' },
      { title: 'Your next chapter', body: 'Recap the key takeaways and celebrate how far your reader has come. Finish with a clear next step they can take this week.\n\nBefore publishing: replace these starter prompts with your expertise, fact-check your claims, and ask someone in your audience for feedback.' },
    ],
  };
}

export function serializeBook(book) {
  const notice = book.generation ? `AI-assisted ${book.generation.status === 'complete' ? 'manuscript' : 'partial manuscript'} · Review and fact-check before publishing\n${book.chapters.filter(chapter => chapter.generated).length} of ${book.chapters.length} chapters written · ${book.generation.model}` : 'Author’s working draft';
  return `${book.title}\n${'='.repeat(Math.min(book.title.length, 60))}\n\n${notice}\nFor: ${book.audience}\n\n${book.chapters.map((chapter, index) => `${index + 1}. ${chapter.title}\n\n${chapter.body || '[This chapter has not been generated yet.]'}`).join('\n\n---\n\n')}\n`;
}

export function saveDraft(draft, storage = localStorage) {
  const drafts = loadDrafts(storage).filter(item => item.id !== draft.id);
  storage.setItem('getebook-drafts', JSON.stringify([{ ...draft, updatedAt: Date.now() }, ...drafts]));
}

export function loadDrafts(storage = localStorage) {
  try {
    const drafts = JSON.parse(storage.getItem('getebook-drafts') || '[]');
    return Array.isArray(drafts) ? drafts.filter(item => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.audience === 'string' && typeof item.tone === 'string' && Number.isFinite(item.updatedAt) && Array.isArray(item.chapters) && item.chapters.length && item.chapters.every(ch => typeof ch?.title === 'string' && typeof ch?.body === 'string')) : [];
  } catch { return []; }
}
