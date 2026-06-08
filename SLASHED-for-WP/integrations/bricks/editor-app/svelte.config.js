import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Svelte 5 in runes mode for explicit reactivity ($state, $derived, $effect).
 * Mirrors the admin-app config so both bundles compile identically.
 */
export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true,
  },
};
