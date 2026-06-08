import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

/**
 * Build config for the SLASHED admin SPA.
 *
 * Output goes into the plugin's assets/admin-app/ directory with stable
 * filenames (no hashes), so the PHP enqueue side can reference them
 * directly and rely on filemtime() for cache-busting.
 *
 * The bundle is fully self-contained: no externals, no CDN imports, no
 * dynamic chunks. WordPress admin pages don't need code-splitting at
 * this size and a single file is much easier to ship and review.
 */
export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: resolve(__dirname, '../assets/admin-app'),
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2020',
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.js'),
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'app-[name].js',
        assetFileNames: (info) => {
          // Force the single emitted CSS file to a stable name so PHP can
          // enqueue it without globbing.
          if (info.name && info.name.endsWith('.css')) return 'app.css';
          return 'app-[name][extname]';
        },
      },
    },
  },
  // The dev server is only useful when building this in isolation; in
  // production the WP page hosts the mount point. index.html exists for
  // `vite dev` to render a standalone harness during local development.
  server: {
    port: 5173,
  },
});
