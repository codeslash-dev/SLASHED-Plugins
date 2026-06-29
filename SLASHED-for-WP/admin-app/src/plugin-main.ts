/**
 * Plugin-specific entry point. Extends the upstream configurator entry (main.ts)
 * with the WordPress frontend overlay feature. This file is NOT synced from
 * upstream — add all WP plugin–specific wiring here, not in main.ts.
 */
import './main.ts';
import { mount } from 'svelte';
import AppOverlay from './AppOverlay.svelte';

function mountOverlay() {
  const overlayTarget = document.getElementById('slashed-frontend-overlay');
  if (!overlayTarget) return;

  // Mount into a shadow root so Tailwind's global reset/base styles don't
  // bleed into the live-preview page. CSS custom properties (--sf-*) still
  // inherit through the shadow boundary as normal inherited properties.
  const shadow = overlayTarget.attachShadow({ mode: 'open' });

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  const doMount = () => mount(AppOverlay, { target: mountPoint });

  const cssUrl = (window as any).slashedApp?.cssUrl as string | undefined;
  if (cssUrl) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    // Defer component mount until CSS is ready so the panel never renders
    // unstyled (without position:fixed / background it would be invisible).
    link.addEventListener('load', doMount);
    link.addEventListener('error', doMount);
    shadow.appendChild(link);
  } else {
    doMount();
  }
}

// Guard against WordPress optimisation plugins that strip type="module" and
// move the script to <head>, causing it to run before wp_footer outputs the
// #slashed-frontend-overlay mount point. In the normal (deferred module) path
// readyState is already 'complete' / 'interactive', so this runs immediately.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountOverlay);
} else {
  mountOverlay();
}
