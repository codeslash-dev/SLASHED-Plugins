/**
 * Plugin-specific entry point. Extends the upstream configurator entry (main.ts)
 * with the WordPress frontend overlay feature. This file is NOT synced from
 * upstream — add all WP plugin–specific wiring here, not in main.ts.
 */
import './main';
import { mount } from 'svelte';
import AppOverlay from './AppOverlay.svelte';
import { forceTheme } from './lib/theme.svelte';

// vite-env.d.ts (vendored, upstream configurator) already types
// window.slashedApp generically ([key: string]: unknown), so it has no
// reason to know about cssUrl — that field only exists because this
// plugin's PHP additionally localizes it (class-frontend-configurator.php).
// A local intersection type here, mirroring the same pattern persistence.ts
// already uses for its own window.slashedApp read, avoids re-declaring (and
// risking a conflicting merge with) the vendored global Window.slashedApp
// interface.
interface PluginSlashedAppBoot {
  cssUrl?: string;
}

function getCssUrl(): string | undefined {
  return (window as Window & { slashedApp?: PluginSlashedAppBoot }).slashedApp?.cssUrl;
}

function isSameOrigin(url: string): boolean {
  try {
    return new URL(url, location.href).origin === location.origin;
  } catch {
    return false;
  }
}

function mountOverlay() {
  const overlayTarget = document.getElementById('slashed-frontend-overlay');
  if (!overlayTarget) return;

  // Guard against duplicate invocations (e.g. script loaded twice by an
  // optimiser): attachShadow() throws if called a second time on the same
  // element, so bail out early when a shadow root already exists.
  if (overlayTarget.shadowRoot) return;

  // The overlay's shell is hardcoded to Tailwind's `dark` class (see
  // AppOverlay.svelte) and never gets a light-mode pass. themeState defaults
  // to the OS preference or a wp-admin visit's saved choice, so components
  // that read it directly for styling native elements Tailwind's `dark:`
  // variant can't reach (e.g. <option> backgrounds) would otherwise mismatch
  // the always-dark shell. forceTheme() pins it without persisting to the
  // admin Studio's own saved preference and stops following the OS, so a
  // later prefers-color-scheme change can't flip it back while the overlay
  // is open. bindThemeRoot() is never called in this context, so this
  // doesn't fight the admin Studio's own theme toggle either.
  forceTheme('dark');

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

  const cssUrl = getCssUrl();
  // window.slashedApp is a plain global — any other script on the page (a
  // theme, another plugin) can clobber it before this module runs. It's
  // normally same-origin PHP output (esc_url_raw() over the plugin's own
  // asset path, see class-frontend-configurator.php), but don't set it as a
  // stylesheet href without checking that invariant still holds.
  if (cssUrl && isSameOrigin(cssUrl)) {
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
