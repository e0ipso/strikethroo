import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import yaml from '@modyfi/vite-plugin-yaml';
import { createRequire } from 'node:module';

// Single source of truth for the SPA's displayed version: the package version,
// baked in at build time so the sidebar never drifts from the shipped release.
const { version } = createRequire(import.meta.url)('./package.json');

// Application build for the Strikethroo SPA. Distinct from Dalia's library
// build: this emits an HTML entry and static assets into dist-web/, separate
// from the CLI's dist/. Not wired into `npm run build` (deferred to a later
// plan).
export default defineConfig({
  root: 'src/web',
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [react(), tailwindcss(), yaml()],
  // Dev server only (`npm run dev:web`); ignored by `vite build`. The SPA
  // fetches relative `/api/*` (plans, config) and the `/api/events` SSE
  // stream, which the `serve` backend provides, not Vite. Proxy them to the
  // backend (default port 4317) so hot-reload runs against live data. Run the
  // backend alongside: `node dist/cli.js serve --no-open`.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4317',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../../dist-web',
    emptyOutDir: true,
    // Keep self-hosted fonts as separate emitted assets; never inline them as
    // data URIs so @font-face url() references resolve to real files.
    assetsInlineLimit: 0,
  },
});
