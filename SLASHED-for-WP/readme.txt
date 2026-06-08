=== SLASHED ===
Contributors: jackgranatowski
Tags: css, bricks, gutenberg, design-tokens, dark-mode
Requires at least: 6.4
Tested up to: 7.0
Stable tag: 0.5.21
Requires PHP: 7.4
License: MIT
License URI: https://opensource.org/licenses/MIT

Platform-agnostic cascade-layer CSS framework. This plugin loads it on WordPress and adds deep integrations for Bricks Builder and Gutenberg.

== Description ==

SLASHED is an open-source CSS framework built on CSS cascade layers — tokens, reset, layout, states, dark mode, typography. No JavaScript, no build step, no external dependencies.

This plugin loads SLASHED on WordPress and adds builder integrations:

* **Bricks Builder** — ~600 CSS variables in Global Variables, in-builder color browser, class autocomplete, reBEMer (BEM class manager in the structure panel)
* **Gutenberg** — color token sync with the block editor palette

The framework CSS is bundled locally. Update it from the settings page or switch to CDN and pin any version tag.

MIT licensed. https://github.com/codeslash-dev/SLASHED

== Installation ==

1. Upload the `slashed` folder to `/wp-content/plugins/`
2. Activate the plugin
3. Go to **SLASHED** in the admin menu and enable the integrations you need

== Frequently Asked Questions ==

= Does it require Bricks or Gutenberg? =

No. The CSS loads on every WordPress install. Builder integrations are optional.

= How do I update the bundled CSS? =

SLASHED → Settings → CSS delivery → **Update framework**.

= Can I pin a specific version? =

Yes. Switch to CDN in settings and enter a release tag, e.g. `v0.5.21`.

= What is reBEMer? =

A BEM class manager built into the Bricks structure panel. Name a block and all its descendants in one operation, with transactional apply and undo.

== Screenshots ==

1. SLASHED settings page
2. Bricks Global Variables panel with SLASHED tokens
3. reBEMer panel in the Bricks structure panel

== Changelog ==

= 0.5.0 =
* Initial release (beta)
