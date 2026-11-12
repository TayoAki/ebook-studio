export async function requestGeneration(kind, input, signal, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(`/api/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Book-Client': 'ebook-studio' },
      body: JSON.stringify(input), signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('The book server is unavailable. Check the connection and retry; completed chapters are kept.');
  }
  let result;
  try { result = await response.json(); }
  catch { throw new Error('The book API is unavailable. Start the API server and retry.'); }
  if (!response.ok) throw new Error(result.error || 'Generation failed. Please try again.');
  return result;
}

export function generatedDraft(outline, idea, audience, tone) {
  return {
    id: globalThis.crypto.randomUUID(), title: outline.title, idea: idea.trim(), audience: audience.trim(), tone,
    updatedAt: Date.now(),
    generation: { provider: 'OpenRouter', model: outline.model, status: 'outline' },
    chapters: outline.chapters.map(title => ({ title, body: '', generated: false })),
  };
}

export async function writeBook(draft, { onProgress, signal, request = requestGeneration }) {
  let current = { ...draft, generation: { ...draft.generation, status: 'writing' } };
  for (let index = 0; index < current.chapters.length; index++) {
    if (current.chapters[index].generated) continue;
    signal?.throwIfAborted();
    onProgress(current, index);
    const result = await request('chapter', {
      idea: current.idea, audience: current.audience, tone: current.tone, title: current.title,
      chapters: current.chapters.map(chapter => chapter.title), index,
      ...(index && current.chapters[index - 1].body ? { previousEnding: current.chapters[index - 1].body.slice(-2500) } : {}),
    }, signal);
    current = {
      ...current, updatedAt: Date.now(),
      chapters: current.chapters.map((chapter, i) => i === index ? { ...chapter, body: result.body, generated: true } : chapter),
      generation: { ...current.generation, model: result.model, status: index === current.chapters.length - 1 ? 'complete' : 'writing' },
    };
    onProgress(current, index);
  }
  return current;
}
