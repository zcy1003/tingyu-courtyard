import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: fromRoot('./game/'),
  base: './',
  publicDir: fromRoot('./game/public/'),
  cacheDir: fromRoot('./.cache/vite/'),
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: { allow: [fromRoot('./game/'), fromRoot('./node_modules/')] },
  },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: {
    outDir: fromRoot('./dist/game/'),
    emptyOutDir: true,
    target: 'es2022',
  },
});
