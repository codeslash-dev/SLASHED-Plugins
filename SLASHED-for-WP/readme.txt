=== SLASHED ===
Contributors: codeslash
Tags: css, bricks, gutenberg, design-tokens, dark-mode
Requires at least: 6.4
Tested up to: 7.0
Stable tag: 0.4.6
Requires PHP: 7.4
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A no-build CSS framework for WordPress with native Bricks Builder tooling: token pickers, a color browser, class hints, and BEM automation.

== Description ==

SLASHED loads a complete CSS framework on any WordPress site — no build step, no Node, no JavaScript on the frontend. You restyle the whole site by setting a handful of design tokens; the framework derives every color, dark-mode value, and fluid type and spacing scale from them in plain CSS.

The plugin enqueues the framework and wires it into the editors you use, so you pick tokens and classes from a list instead of typing them by hand. Bricks Builder gets the full toolset; Gutenberg gets presets and a token panel.

= Design Settings =

A visual editor for every token — brand and status colors, typography, spacing, borders, shadows, fluid scales, z-index — built into WordPress at **SLASHED → Design Settings**, with a live light/dark preview. You only ever set validated token values; there is no raw-CSS field.

Set six brand colors (primary, secondary, tertiary, action, neutral, base) and five status colors (success, warning, error, info, danger), each with an optional separate dark value, and the framework recolors itself. Hover and active states, tints, shades, and tonal steps are all computed for you.

The same editor runs as a standalone web app at https://slashed.codeslash.dev/configurator for designing without logging in. "Open in configurator" launches it preloaded with your current tokens; "Import shared config" pulls a shared design back in from a code or link.

= Bricks Builder =

Enable the Bricks integration and the framework shows up natively in the builder:

* **Token pickers.** Every SLASHED variable is registered with Bricks' variable pickers and code-editor autocomplete, grouped by category. Color tokens show a swatch resolved for both light and dark.
* **Class autocomplete.** Every SLASHED class is added to the Bricks class input — layout, macros, components, and utilities under "SLASHED Layout", and `.is-*` state classes under "SLASHED State". The list is read from the CSS bundle you actually loaded, so it always matches.
* **Color System panel.** A floating, in-builder browser for the full color palette, organized by family and tone, with a light/dark canvas toggle. Click a swatch to copy its variable and apply it to the selected element's background, text, or border.
* **Class hints.** With hints enabled, a **?** icon next to each SLASHED class explains what it does and which category it belongs to. The icon is the only trigger, so it never covers Bricks' own controls.
* **reBEMer.** A BEM class manager in the structure panel. Select an element, name the block, and reBEMer generates clean `block__element` / `block--modifier` names across the whole subtree in one pass. It supports add, rename, replace, add-modifier, and migrate-ID-styles modes, auto-numbers colliding siblings, and won't shadow reserved SLASHED classes. It never deletes a global class.
* **Dark mode bridge.** The Bricks dark-mode toggle drives the SLASHED dark palette.

= Gutenberg =

Enable the Gutenberg integration and you get:

* Framework CSS in the editor canvas and on the frontend.
* SLASHED colors, gradients, font sizes, and spacing registered as native editor presets. On block themes this flows through theme.json automatically — no custom theme.json needed.
* A floating token panel to browse and apply colors and gradients to the selected block, toggle SLASHED classes, and copy variables.
* A dark mode bridge: the editor's dark-mode toggle drives the SLASHED dark palette.

reBEMer and class autocomplete are Bricks-only.

= Dark mode, no JavaScript =

Dark mode runs entirely in CSS:

* Follows the operating-system setting by default.
* `data-theme="dark"` forces dark for an element and its descendants.
* `data-theme="light"` carves a light section out of a dark page.

A single dark section inside a light page — or the reverse — works with no script.

= CSS bundles =

Pick the bundle that fits the project on the settings page:

* **Optimal** (recommended) — tokens, CSS reset, base element styles, light/dark themes, layout primitives (container, stack, grid, cluster, sidebar, switcher, cover, center, frame, reel), macros (prose, flow, truncate, aspect, scroll-shadow), interaction states, motion, accessibility, print, and classless form styling.
* **Optimal + Components** — adds prebuilt components: buttons, badges, tags, cards, tables, form rows, and loading skeletons, with status and style modifiers.
* **Optimal + Utilities** — adds utility classes: object-fit, a z-index scale, text balancing, and animation helpers (spin, ping, blink, shimmer, float).
* **Full** — everything above.

All bundles ship with the plugin and load locally from the plugin's own folder — no external requests are made to render your site. New framework CSS arrives through normal plugin updates.

= Predictable overrides =

SLASHED puts every rule in a named CSS cascade layer with a fixed order, so a later layer always wins regardless of selector specificity. Your token overrides land in the top layer, so they beat framework defaults without `!important` or specificity hacks.

= Browser support =

SLASHED targets Chrome 125+, Safari 18.0+, and Firefox 129+. It uses `light-dark()`, relative-color `oklch()`, `@property`, and scroll-driven animations with no fallback. Older browsers are not supported.

= Open source =

The framework is developed at https://github.com/codeslash-dev/SLASHED.

== External services ==

The plugin works entirely on your own server: the framework CSS is bundled with the plugin and served locally, and the plugin makes no automatic or background calls to any external service. It does not phone home, and it does not collect, send, or track any data.

The plugin does link to one optional external tool, which is only ever opened when **you** explicitly choose to use it:

The SLASHED Configurator (https://slashed.codeslash.dev/configurator/)

* What it is and what it's for: a hosted web app, run by the plugin author, for designing your SLASHED token set outside of WordPress. It is entirely optional — the same editor is built into the plugin at SLASHED → Design Settings, so you never need to leave your site.
* What data is sent and when: nothing is sent automatically, and the plugin never contacts it in the background. Clicking **"Open in configurator"** opens the tool in a new browser tab with your current design tokens (color, spacing, typography and similar non-personal style values) encoded in the URL fragment — the part after "#", which browsers keep on your device and do not transmit to the server. **"Import shared config"** simply loads a design code that you paste in. No personal data, site content, or credentials are sent, and no account is required. As with visiting any website, the host may record standard web-server access logs (such as IP address and request time) when the page loads.

== Installation ==

1. Install the plugin ZIP from **Plugins → Add New → Upload Plugin**, or upload the `slashed` folder to `/wp-content/plugins/`.
2. Activate it.
3. Open **SLASHED** in the admin menu and pick a CSS bundle — **Optimal** suits most sites.
4. Enable the integrations you use (Bricks, Gutenberg, or both).
5. Set your brand colors and other tokens under **SLASHED → Design Settings**.

== Frequently Asked Questions ==

= Do I need Bricks or Gutenberg? =

No. The framework CSS loads on any WordPress site, theme, or builder. The integrations are optional toggles.

= How do I rebrand the framework? =

Set the six brand colors (and optional dark values) under **SLASHED → Design Settings**, or in the standalone configurator. Everything else — hover and active states, tints, shades, tonal steps — derives from them automatically. Overrides land in the top cascade layer, so they win without specificity hacks.

= What is reBEMer? =

A BEM class manager in the Bricks structure panel. Select an element, name the block, and it generates `block__element` / `block--modifier` names across the whole subtree in one pass. It supports add, rename, replace, add-modifier, and migrate-ID-styles modes, and never deletes a global class. Bricks only.

= How complete is the Gutenberg integration? =

It loads the CSS, registers color, gradient, font-size, and spacing presets, bridges dark mode, and provides a token panel for applying colors and gradients, toggling classes, and copying variables. reBEMer and class autocomplete are Bricks-only.

= Does it add any frontend JavaScript? =

No. Dark mode, fluid scales, and color derivation all run in CSS. JavaScript loads only in the WordPress admin and the builders.

= Where does the framework CSS come from? =

It ships inside the plugin and is served locally from the plugin's own folder. The plugin makes no external requests to render your site, and new framework CSS arrives through normal plugin updates from WordPress.org.

= What's the minimum browser? =

Chrome 125+, Safari 18.0+, Firefox 129+.

== Changelog ==

= 0.4.6 =
* Added: Reset-all confirmation; save button left; panel gated on query param
* Changed: Replace JSON.stringify comparisons with shallow equality in AppOverlay
* Fixed: Address CodeRabbit/Qodo review findings + page-squeeze layout

= 0.4.5 =
* Added: Replace auto-save with explicit Save button
* Fixed: Harden save state with snapshot-based dirty tracking
* Fixed: Update AppOverlay + syncignore for explicit save
* Fixed: Set mounted flag after mount() succeeds to allow retries on failure
* Fixed: Harden overlay mount against stalled CSS and duplicate invocations
* Fixed: Defer overlay mount until CSS loads; guard against script optimisers

= 0.4.4 =
* Added a floating frontend overlay to edit tokens on any live page — click "/ Design" in the admin bar to open the panel without leaving the site.
* Framework CSS is now always bundled locally with the plugin; CDN delivery and the automatic background version-check were removed.
* Bug fixes.

= 0.4.3 =
* Bug fixes.

= 0.4.2 =
* Brand and status color overrides set in Design Settings now recolor the live site.
* Bug fixes.

= 0.4.1 =
* Bug fixes.

= 0.4.0 =
* Replaced the admin interface with the SLASHED design-system configurator, now built into the plugin at SLASHED → Design Settings.

= 0.3.15 =
* Added a flat CSS bundle option to the settings page.

= 0.3.14 =
* Switched to four CSS bundle options: Optimal, Optimal + Components, Optimal + Utilities, and Full.

= 0.3.8 =
* Added "Import shared config" — paste a code or configurator link to load a shared design.
* Removed the manual-CSS page; design tokens are now the only styling path.

= 0.3.7 =
* Added "Open in configurator", launching the hosted editor preloaded with your current tokens.

= 0.3.6 =
* Added reBEMer to the Bricks structure panel and a Colors launcher panel to the builder.

= 0.3.5 =
* Consolidated all Bricks options into a single tabbed settings page.

= 0.3.0 =
* Initial release.
