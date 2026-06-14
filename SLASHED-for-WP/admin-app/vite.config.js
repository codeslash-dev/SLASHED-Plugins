import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

/**
 * Build config for the SLASHED admin SPA.
 *
 * Output goes to assets/admin-app/ at the plugin root (not under any
 * integration subdirectory) so the PHP side can find it regardless of
 * which builders are active.
 *
 * Stable filenames + filemtime() on the PHP side for cache busting.
 */
export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: resolve(import.meta.dirname, '../assets/admin-app'),
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'src/main.js'),
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'app-[name].js',
        assetFileNames: (info) => {
          if (info.name?.endsWith('.css')) return 'app.css';
          return 'app-[name][extname]';
        },
      },
    },
  },
  server: { port: 5181 },
});
