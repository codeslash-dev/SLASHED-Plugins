import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    // Svelte 5 runes mode for explicit reactivity ($state, $derived, $effect).
    runes: true,
  },
};
