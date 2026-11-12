import { defineConfig } from 'vite';

const proxy = { '/api': { target: 'http://127.0.0.1:3001', timeout: 150000, proxyTimeout: 150000 } };

export default defineConfig({
  server: { proxy },
  preview: { proxy },
});
