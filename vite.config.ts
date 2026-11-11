import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// `import.meta.dirname` keeps this config valid in an ESM package.
const here = import.meta.dirname;

export default defineConfig({
  root: resolve(here, 'web'),
  plugins: [react()],
  build: {
    outDir: resolve(here, 'web/dist'),
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/mcp': 'http://localhost:3000',
      '/healthz': 'http://localhost:3000',
      '/s': 'http://localhost:3000',
    },
  },
});
