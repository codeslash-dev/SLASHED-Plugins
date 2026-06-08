import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

/**
 * Build config for the reBEMer editor bundle.
 *
 * Output goes into the plugin's assets/editor-app/ directory with stable
 * filenames (no hashes), matching the admin-app convention. The PHP
 * enqueue side references app.js / app.css directly and uses filemtime()
 * for cache-busting.
 */
export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: fileURLToPath(new URL('../assets/editor-app/', import.meta.url)),
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2020',
    cssCodeSplit: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./src/main.js', import.meta.url)),
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'app-[name].js',
        assetFileNames: (info) => {
          if (info.name && info.name.endsWith('.css')) return 'app.css';
          return 'app-[name][extname]';
        },
      },
    },
  },
  server: {
    port: 5174,
  },
});
