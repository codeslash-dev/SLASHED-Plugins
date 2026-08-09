import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { bindThemeRoot } from './lib/theme.svelte';

// DOGFOOD: load SLASHED's own token + theme layers at :root so the configurator
// chrome renders with the framework it edits. We load only token/theme layers —
// not reset/base/layout/components — so the framework styles the chrome's design
// tokens without fighting the bespoke shell layout or editor controls.
import '@framework-css/core/layers.css';
import '@framework-css/core/tokens.css';
import '@framework-css/core/tokens.layout.css';
import '@framework-css/core/tokens.macros.css';
import '@framework-css/core/themes.css';
// Layout + macro primitives — only .sf-* class selectors, safe alongside chrome.
import '@framework-css/core/layout.css';
import '@framework-css/core/macros.css';
// .sf-btn / .sf-card only (the rest of optional/components.css is still
// commented out upstream) — BEM class selectors, disjoint from the Studio
// shell's own Tailwind utility classes, so safe to load alongside chrome
// without needing core/reset.css or core/base.css first. Enables real
// .sf-btn / .sf-card markup in ComponentsPanel's in-panel live preview and
// in PreviewPanel's demo templates. components.css itself @imports
// tokens.components.css, so that's not imported separately here.
import '@framework-css/optional/components.css';

// An embedded host (the WP plugin) may hand us a same-origin URL to the panel
// stylesheet via window.slashedApp.cssUrl. Its presence is how we know to load
// the panel's own CSS into a shadow root (head styles don't cross the shadow
// boundary). Typed locally so this upstream entry stays framework-agnostic.
function embeddedCssUrl(): string | undefined {
  const boot = (window as unknown as { slashedApp?: { cssUrl?: string } }).slashedApp;
  // Trim before the empty check: a whitespace-only value would survive `!== ''`,
  // then `new URL('   ', href)` resolves to the current document and passes the
  // same-origin test — mounting in a shadow root with no panel stylesheet.
  const url = typeof boot?.cssUrl === 'string' ? boot.cssUrl.trim() : '';
  return url !== '' ? url : undefined;
}
function isSameOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

let app: ReturnType<typeof mount> | undefined;

function mountInto(root: HTMLElement) {
  // Apply the persisted/OS-derived theme class before mounting so the first
  // paint is never wrong-themed (no flash of the other mode).
  bindThemeRoot(root);
  app = mount(App, { target: root });
}

// Standalone owns the whole document and mounts straight into #app (light DOM):
// no other app's CSS/JS shares the page, so isolation isn't needed and the
// build's own app.css already styles it.
const standaloneHost = document.getElementById('app');
// The WP plugin renders #slashed-admin-app inside the shared wp-admin document.
const wpHost = document.getElementById('slashed-admin-app');

if (standaloneHost) {
  standaloneHost.innerHTML = '';
  mountInto(standaloneHost);
} else if (wpHost) {
  // Embedded in wp-admin: the panel shares one document with every other admin
  // plugin's CSS and JS, and a competing reset or a broad rule like
  // `* { pointer-events: none }` can leave it rendered but non-interactive.
  // Mount it inside a Shadow DOM, the same encapsulation the frontend overlay
  // relies on. This is CSS/DOM encapsulation, not a JS sandbox (an open shadow
  // root shares the host realm) — but it's what the failure needs: host styles
  // no longer cross into the panel, and Svelte's delegated event listeners bind
  // to the shadow-internal root, so host document-level handlers can't preempt
  // them. The panel CSS is linked *inside* the shadow (the plugin supplies a
  // same-origin cssUrl) because head styles don't cross the boundary, and mount
  // is deferred until it loads so the panel never flashes unstyled. Falls back
  // to the previous light-DOM mount (styled by the plugin's head-loaded app.css)
  // when Shadow DOM or a usable cssUrl isn't available.
  const cssUrl = embeddedCssUrl();
  wpHost.innerHTML = '';

  if (typeof wpHost.attachShadow === 'function' && cssUrl && isSameOrigin(cssUrl)) {
    // Preload the panel stylesheet in <head> first and only commit to a Shadow
    // DOM once it actually loads. attachShadow() is irreversible, so attaching
    // up-front would trap the panel unstyled if the stylesheet errors; on error
    // or a stalled load we instead mount into the light DOM, which the plugin's
    // head-enqueued app.css still styles.
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;

    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const mountShadow = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const shadow = wpHost.attachShadow({ mode: 'open' });
      shadow.appendChild(link); // move the now-loaded stylesheet inside the shadow
      // The App root is `w-full h-full`; give the shadow holder real dimensions
      // to fill (the host #slashed-admin-app is sized by the plugin's admin CSS).
      const holder = document.createElement('div');
      holder.style.width = '100%';
      holder.style.height = '100%';
      shadow.appendChild(holder);
      mountInto(holder);
    };
    const mountLight = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      link.remove();
      mountInto(wpHost);
    };
    // Stalled load: fall back to a styled light-DOM mount rather than hang on
    // the host's "Loading…" text.
    timer = setTimeout(mountLight, 5000);
    link.addEventListener('load', mountShadow);
    link.addEventListener('error', mountLight);
    document.head.appendChild(link);
  } else {
    mountInto(wpHost);
  }
}

export default app;
