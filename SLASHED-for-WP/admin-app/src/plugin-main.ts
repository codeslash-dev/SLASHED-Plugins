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
  // Mount into a shadow root so Tailwind's global reset/base styles don't
  // bleed into the live-preview page. CSS custom properties (--sf-*) still
  // inherit through the shadow boundary as normal inherited properties.
  const shadow = overlayTarget.attachShadow({ mode: 'open' });

  const cssUrl = (window as any).slashedApp?.cssUrl as string | undefined;
  if (cssUrl) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    shadow.appendChild(link);
  }

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);
  mount(AppOverlay, { target: mountPoint });
}
