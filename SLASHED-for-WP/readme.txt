=== SLASHED ===
Contributors: codeslash
Tags: css, gutenberg, dark-mode, design-tokens, bricks
Requires at least: 6.4
Tested up to: 7.0
Stable tag: 0.3.4
Requires PHP: 7.4
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Cascade-layer CSS framework for WordPress. Deep integrations for Bricks Builder and Gutenberg. Design tokens, dark mode, fluid scales, BEM tooling.

== Description ==

SLASHED is an open-source CSS framework built entirely on native CSS cascade layers. The name is an acronym: **S**tandalone · **L**ean · **A**gnostic · **S**tructured · **H**ybrid · **E**xplicit · **D**eterministic. It requires no build step, no Node dependency, and no JavaScript runtime.

This plugin loads SLASHED on any WordPress site and adds deep integrations for Bricks Builder and the Gutenberg block editor.

Source and documentation: https://github.com/codeslash-dev/SLASHED

**Cascade layer architecture**

SLASHED declares 15 named cascade layers in explicit precedence order:

`slashed.tokens` → `slashed.reset` → `slashed.base` → `slashed.forms` → `slashed.layout` → `slashed.components` → `slashed.macros` → `slashed.utilities` → `slashed.states` → `slashed.themes` → `slashed.motion` → `slashed.accessibility` → `slashed.print` → `slashed.legacy` → `slashed.overrides`

Later layers always win over earlier ones regardless of specificity. The `slashed.overrides` layer is the topmost user-customization point. The `slashed.legacy` layer sits just below it and gates browser fallbacks behind `@supports not (...)` checks. Because all layers are declared upfront, concatenation order of additional stylesheets is irrelevant to layer precedence.

**Base layer scope**

The `slashed.base` layer is a minimal foundation, not a classless UI kit:

- Global base: headings, paragraph text, links, code, pre, semantic inline elements, selection styling
- Rich blocks (tables, blockquotes, figures, definition lists): styled only when inside a `.sf-prose` container
- Interactive widgets (dialog, details, progress, meter): normalization only; component styling is left to the consumer
- Native form controls: opt-in via the `slashed.forms` layer (included in Optimal and Full bundles)

**CSS bundles**

Five distribution bundles are available:

- **Essential** — core token layers, reset, base, layout, states, themes, motion, accessibility, print
- **Optimal** (recommended) — Essential plus extended palette tokens, extended size tokens, forms, legacy browser fallbacks
- **Optimal + Components** — Optimal plus component tokens and component styles (in progress in 0.x)
- **Optimal + Utilities** — Optimal plus the utilities layer scaffold
- **Full** — all of the above

Each bundle ships in readable, minified, and source-mapped variants. Layer-flattened `.flat` versions are also available for environments that do not support `@layer`.

The plugin bundles Essential, Optimal, and Full locally. All five variants are accessible via CDN.

**Design token system**

SLASHED is BEM-first. The primary product is the token API; consumers build components against the token contract rather than using utility classes.

The color system requires a minimum of six brand tokens to rebrand the framework completely:

- `--sf-color-primary-light`
- `--sf-color-secondary-light`
- `--sf-color-tertiary-light`
- `--sf-color-action-light`
- `--sf-color-neutral-light`
- `--sf-color-base-light`

Optional `-dark` counterparts enable per-mode overrides for each. Five status families (success, warning, danger, error, info) auto-derive from the brand palette or accept manual overrides, for a maximum of 22 explicit input tokens.

Derived colors (hover, tint, shade, tonal steps) are computed at runtime using `oklch(from …)` relative color syntax, so the full color system regenerates from the brand inputs without any build step.

**Fluid engine**

Type, display, and space scales are generated at runtime from 12 input scalars: viewport range boundaries and separate modular ratios for minimum and maximum viewport sizes. Changing a single scalar regenerates all dependent scales immediately. Scales use `clamp()` with viewport-aware calculations and require no recompilation.

**Dark mode**

Dark mode is implemented entirely in CSS using the `light-dark()` function:

- Default: follows the OS `prefers-color-scheme` preference
- `data-theme="dark"` on any element forces dark mode for that element and its descendants
- `data-theme="light"` forces light mode for a subtree within an otherwise dark page
- Section-level theming is supported: a single dark section can live inside a light page

No JavaScript is required for theme switching.

**Browser support floor**

SLASHED targets Chrome 125+, Safari 18.0+, and Firefox 129+ (released April–September 2024). The following features are used without fallback:

- `light-dark()` — per-property light/dark value resolution
- `oklch(from …)` — relative color syntax for runtime color derivation
- `@property` with `inherits: true` — animatable CSS custom properties
- `pow()` — math function used by the fluid scale engine
- `animation-timeline: view()` — scroll-driven animations
- `@starting-style` — entry animations for dialogs and overlays

Below this floor, derived colors collapse to `initial`, generative scales stop computing, and scroll animations are unavailable. Cascade layers themselves require approximately 2022-era browser versions.

The `slashed.legacy` layer gates `@supports not (…)` fallbacks for environments above the minimum but below the full feature baseline.

**CSS delivery**

Framework CSS can be served from the bundled local copy inside the plugin directory or from CDN. CDN mode lets you pin any published release tag. The settings page shows the currently bundled framework version and provides a one-click updater with a rollback list.

**Filter hooks**

A documentation page at SLASHED → Filter Hooks lists every available hook with description and example usage:

- `slashed/css_bundle_url` — override the CSS URL globally
- `slashed_bricks/css_bundle_url` — per-integration CSS URL override for Bricks
- `slashed_bricks/registered_variables` — filter the variable array before registration in Bricks
- `slashed_bricks/registered_classes` — filter the class array before registration in Bricks
- `slashed_bricks/inventory` — replace the full token/class inventory
- `slashed_bricks/show_color_panel` — show or hide the Color System floating panel
- `slashed_gutenberg/css_bundle_url` — Gutenberg-specific CSS URL override

**Bricks Builder integration**

When the Bricks integration is enabled, SLASHED registers its tokens and classes natively inside the Bricks editor.

- **Global Variables** — all `--sf-*` tokens appear in the Bricks variable picker, grouped by category. Color tokens include a hex swatch resolved for both light and dark values.
- **Class autocomplete** — all `.sf-*` layout and macro classes and all `.is-*` state classes appear in the Bricks class input with descriptions.
- **Color System panel** — a floating panel in the Bricks editor shows the full framework color palette organized by family and tonal step, with live light/dark preview.
- **Dark mode bridge** — maps Bricks' `[data-brx-theme]` attribute to the SLASHED `data-theme` system so the framework dark palette activates when the Bricks dark mode toggle is switched.
- **reBEMer** — a BEM class manager built into the Bricks structure panel. Select a block, name it, and reBEMer generates the BEM element class names for all descendants in one operation with transactional apply and undo.

**Gutenberg integration**

When the Gutenberg integration is enabled:

- **Color palette** — all `--sf-color-*` tokens are registered as the block editor color palette. Slugs follow the pattern `slashed-{family}-{alias}`, producing predictable utility class names such as `.has-slashed-primary-base-color`.
- **Gradient presets** — all `--sf-gradient-*` tokens are registered as gradient presets.
- **Font size presets** — all `--sf-text-*` size tokens are registered as font size presets.
- **Spacing presets** — all `--sf-space-*` tokens are registered as spacing scale values.
- **Block theme support** — for block themes, token registration is injected via `wp_theme_json_data_theme` so presets flow through theme.json without a custom theme.
- **Dark mode bridge** — maps WordPress's `[data-wp-dark-mode-active]` attribute to the SLASHED `data-theme` system.

== Installation ==

1. Upload the `slashed` folder to the `/wp-content/plugins/` directory.
2. Activate the plugin from the Plugins screen.
3. Go to **SLASHED** in the admin menu.
4. Select the CSS bundle that fits your project (Optimal is recommended for most sites).
5. Enable the integrations you need (Bricks, Gutenberg, or both).

== Frequently Asked Questions ==

= Does it require Bricks Builder or Gutenberg? =

No. The SLASHED CSS framework loads on every WordPress install regardless of which builder or theme is active. Builder integrations are optional and can be toggled on or off from the settings page.

= What is the difference between the CSS bundles? =

Essential contains the core token layers, reset, base, layout, states, themes, motion, accessibility, and print. Optimal adds extended color and size tokens, form element styles, and legacy browser fallbacks — it is the recommended bundle for most sites. Full adds component tokens, component styles, and the utilities layer scaffold. Optimal + Components and Optimal + Utilities are intermediate bundles available via CDN.

= What is the minimum browser requirement? =

Chrome 125+, Safari 18.0+, and Firefox 129+. The framework uses `light-dark()`, `oklch(from …)` relative color syntax, `@property`, `pow()`, scroll-driven animations, and `@starting-style` without fallback. These features were released in mid-2024. Below the floor, the color derivation system and fluid scales stop working.

= Can I use the framework tokens in a custom theme without a builder integration? =

Yes. The framework CSS is enqueued on the frontend regardless of which integrations are active. All `--sf-*` custom properties are available in any stylesheet. Override token values from Design Settings or via the Manual CSS page.

= How do I switch between dark and light mode? =

SLASHED reads the OS `prefers-color-scheme` preference by default with no configuration required. To force a mode, add `data-theme="dark"` or `data-theme="light"` to any element — the theme applies to that element and all its descendants. No JavaScript is needed.

= How do I update the bundled CSS? =

Go to **SLASHED** in the admin menu. Under **CSS Delivery**, click **Check for updates**. If a newer version is available, click **Update** to download and replace the local bundle. To roll back, use the version list on the same page.

= Can I pin a specific framework version? =

Yes. Switch **CSS delivery** to CDN and enter a release tag such as `v0.5.21`. The plugin will load that exact version.

= What is reBEMer? =

reBEMer is a BEM class manager in the Bricks structure panel. Select a block, enter a block name, and reBEMer generates element class names for all child elements following BEM conventions. Changes are applied transactionally and can be undone.

= How are token overrides stored? =

Token overrides are stored in a WordPress option (`slashed_tokens`) and injected as an inline CSS block in `@layer slashed.overrides` after the framework stylesheet. Because `slashed.overrides` is the top layer in the framework's declared stack, these overrides take precedence over all framework defaults without specificity hacks.

= Does the plugin add any frontend JavaScript? =

No. Dark mode switching, fluid scale computation, and color derivation all run in CSS. Admin-side JavaScript is loaded only inside the WordPress admin.

= Where is the framework source? =

The SLASHED CSS framework is maintained at https://github.com/codeslash-dev/SLASHED under the MIT license.

== Screenshots ==

1. Main settings page — bundle selection, CSS delivery controls, framework version management.
2. Design Settings — token editor for overriding individual CSS custom properties.
3. Bricks Global Variables panel showing SLASHED tokens grouped by category with color swatches.
4. Bricks class autocomplete listing .sf-* and .is-* classes with descriptions.
5. reBEMer panel in the Bricks structure panel.
6. Gutenberg color palette populated with SLASHED color tokens.

== Changelog ==

= 0.3.4 =
* Initial public release.
* Core CSS delivery with Essential, Optimal, and Full bundle options.
* Local and CDN delivery modes with framework version management and rollback.
* Manual CSS override mode via `@layer slashed.overrides`.
* Bricks Builder integration: Global Variables, class autocomplete, Color System panel, dark mode bridge, reBEMer.
* Gutenberg integration: color palette, gradient presets, font size presets, spacing presets, block theme support, dark mode bridge.
* Filter hooks for all integration points with a documentation page in the admin.
