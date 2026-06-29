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

  // Guard against duplicate invocations (e.g. script loaded twice by an
  // optimiser): attachShadow() throws if called a second time on the same
  // element, so bail out early when a shadow root already exists.
  if (overlayTarget.shadowRoot) return;

  // Mount into a shadow root so Tailwind's global reset/base styles don't
  // bleed into the live-preview page. CSS custom properties (--sf-*) still
  // inherit through the shadow boundary as normal inherited properties.
  const shadow = overlayTarget.attachShadow({ mode: 'open' });

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  let mounted = false;
  const doMount = () => {
    if (mounted) return;
    mount(AppOverlay, { target: mountPoint });
    mounted = true;
    // Signal to the admin-bar onclick that the toggle listener is live.
    overlayTarget.setAttribute('data-slashed-ready', '');
  };

  const cssUrl = (window as any).slashedApp?.cssUrl as string | undefined;
  if (cssUrl) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    // Defer component mount until CSS is ready so the panel never renders
    // unstyled (without position:fixed / background it would be invisible).
    // Fall back after 5 s if load/error never fires (stalled request, etc.).
    const timer = setTimeout(doMount, 5000);
    const settle = () => { clearTimeout(timer); doMount(); };
    link.addEventListener('load', settle);
    link.addEventListener('error', settle);
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
