import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Matches SLASHED/configurator/svelte.config.js. Runes mode is auto-detected
// per component, so legacy dependencies (e.g. lucide-svelte) still compile.
export default { preprocess: vitePreprocess() };
