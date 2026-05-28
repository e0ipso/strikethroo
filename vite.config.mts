import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Application build for the Strikethroo SPA. Distinct from Dalia's library
// build: this emits an HTML entry and static assets into dist-web/, separate
// from the CLI's dist/. Not wired into `npm run build` (deferred to a later
// plan).
export default defineConfig({
  root: 'src/web',
  base: '/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../../dist-web',
    emptyOutDir: true,
    // Keep self-hosted fonts as separate emitted assets; never inline them as
    // data URIs so @font-face url() references resolve to real files.
    assetsInlineLimit: 0,
  },
});
