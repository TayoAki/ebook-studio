import { defineConfig } from 'vite';

const proxy = { '/api': { target: 'http://127.0.0.1:3001', timeout: 300000, proxyTimeout: 300000 } };

export default defineConfig({
  server: { proxy },
  preview: { proxy },
});
