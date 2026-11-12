import { createApi } from './app.js';

const port = Number(process.env.API_PORT || 3001);
const server = createApi({
  apiKey: process.env.OPENROUTER_API_KEY?.trim(),
  model: process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini',
  imageModel: process.env.OPENROUTER_IMAGE_MODEL || 'openai/gpt-5-image-mini',
  imageRequestLimit: Number(process.env.IMAGE_REQUEST_LIMIT || 10),
  requestLimit: Number(process.env.GENERATION_REQUEST_LIMIT || 70),
});
server.listen(port, '127.0.0.1', () => console.log(`Book API listening on loopback port ${port}; OpenRouter ${process.env.OPENROUTER_API_KEY ? 'configured' : 'not configured'}.`));
