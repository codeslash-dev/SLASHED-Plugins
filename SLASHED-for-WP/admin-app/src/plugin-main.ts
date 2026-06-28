/**
 * Plugin-specific entry point. Extends the upstream configurator entry (main.ts)
 * with the WordPress frontend overlay feature. This file is NOT synced from
 * upstream — add all WP plugin–specific wiring here, not in main.ts.
 */
import './main.ts';
import { mount } from 'svelte';
import AppOverlay from './AppOverlay.svelte';

const overlayTarget = document.getElementById('slashed-frontend-overlay');
if (overlayTarget) {
  overlayTarget.innerHTML = '';
  mount(AppOverlay, { target: overlayTarget });
}
