import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

/**
 * Build config for the SLASHED admin SPA — the framework configurator embedded
 * in WordPress. The src/ tree is vendored verbatim from SLASHED/configurator by
 * scripts/sync-core.mjs; the only plugin-specific wiring lives here.
 *
 * Output goes to assets/admin-app/ at the plugin root (not under any integration
 * subdirectory) so the PHP side can find it regardless of which builders are
 * active. Stable filenames + filemtime() on the PHP side for cache busting.
 */
export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  resolve: {
    alias: {
      // Framework CSS vendored by scripts/sync-core.mjs (chrome layers under
      // core/, optional layers under optional/, full bundle under dist/ for
      // the preview iframe). Mirrors the configurator's own @framework-css
      // alias so main.ts / PreviewPanel.svelte are byte-for-byte identical to
      // upstream.
      '@framework-css': resolve(import.meta.dirname, 'framework-css'),
    },
  },
  define: {
    // The version pill reads the framework CSS version from PHP hydration.
    // esbuild requires a define value to be a JSON literal or a bare
    // identifier/member expression, so we point at a global the PHP side sets
    // (see class-token-page.php). codec.ts / StudioHeader.svelte guard with
    // `typeof __SLASHED_VERSION__ !== 'undefined'`, so an absent global is safe.
    __SLASHED_VERSION__: 'window.__SLASHED_FW_VERSION__',
  },
  build: {
    outDir: resolve(import.meta.dirname, '../assets/admin-app'),
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'src/plugin-main.ts'),
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
