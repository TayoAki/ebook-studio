import { createServer } from 'node:http';
import { createGenerator, GenerationError } from './generation.js';

function json(res, status, value) {
  if (res.destroyed) return;
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16000) throw new GenerationError('Book request is too large.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw new GenerationError('Send a valid JSON book request.', 400); }
}

export function createApi({ apiKey, model = 'openai/gpt-4.1-mini', fetchImpl, requestLimit = 70 } = {}) {
  const generator = createGenerator({ apiKey, model, fetchImpl });
  let active = 0;
  let requests = 0;
  let windowStart = Date.now();
  return createServer(async (req, res) => {
    const path = req.url?.split('?')[0];
    if (req.method === 'GET' && path === '/api/health') return json(res, 200, { configured: Boolean(apiKey), model });
    if (!['/api/outline', '/api/chapter'].includes(path)) return json(res, 404, { error: 'Not found.' });
    if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' });
    // The API binds to loopback, and Vite proxies same-origin requests without changing Host.
    let originHost;
    try { originHost = new URL(req.headers.origin).host; } catch { /* Missing or opaque origin is rejected below. */ }
    if (originHost !== req.headers.host || req.headers['x-book-client'] !== 'ebook-studio') return json(res, 403, { error: 'Only same-origin book requests are allowed.' });
    if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'Use application/json.' });
    if (Number(req.headers['content-length']) > 16000) { req.resume(); return json(res, 413, { error: 'Book request is too large.' }); }
    if (Date.now() - windowStart > 3600000) { requests = 0; windowStart = Date.now(); }
    if (requests >= requestLimit || active >= 2) return json(res, 429, { error: 'This private preview has reached its generation limit. Wait and retry.' });
    const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    active++;
    try {
      const input = await readBody(req);
      requests++;
      const result = await generator[path === '/api/outline' ? 'outline' : 'chapter'](input, controller.signal);
      json(res, 200, result);
    } catch (error) {
      json(res, error instanceof GenerationError ? error.status : 500, { error: error instanceof GenerationError ? error.message : 'The server could not finish this request.' });
    } finally { active--; }
  });
}
