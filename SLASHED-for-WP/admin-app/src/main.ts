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

// Standalone mounts into #app; the WP plugin renders #slashed-admin-app.
const target =
  document.getElementById('app') ?? document.getElementById('slashed-admin-app');
let app: ReturnType<typeof mount> | undefined;
if (target) {
  target.innerHTML = '';
  // Apply the persisted/OS-derived theme class before mounting so the first
  // paint is never wrong-themed (no flash of the other mode).
  bindThemeRoot(target);
  app = mount(App, { target });
}
export default app;
