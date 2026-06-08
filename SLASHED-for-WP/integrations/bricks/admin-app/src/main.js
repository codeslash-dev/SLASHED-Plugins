/**
 * SLASHED admin SPA entry point.
 *
 * Mounts the Svelte app into the #slashed-admin-app element printed
 * by class-token-page.php. All hydration data comes from
 * window.slashedApp, which is populated server-side via
 * wp_localize_script (see Slashed_Token_Page::enqueue_assets).
 *
 * Why a single mount and not per-tab islands: every tab shares the
 * same dirty-state, defaults, and live-preview state. Having one
 * Svelte root makes that state trivially shared via runes; carving
 * it into islands would force a custom event bus or a global store
 * for no real benefit on a page this size.
 */
import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('slashed-admin-app');
if (target) {
  mount(App, { target });
}
