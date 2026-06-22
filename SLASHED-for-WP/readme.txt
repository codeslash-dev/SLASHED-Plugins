=== SLASHED ===
Contributors: codeslash
Tags: css, bricks, design-tokens, dark-mode, bem
Requires at least: 6.4
Tested up to: 7.0
Stable tag: 0.3.8
Requires PHP: 7.4
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A no-build CSS framework for WordPress with deep Bricks Builder tooling: token pickers, a color browser, class hints, and BEM automation.

== Description ==

SLASHED is an open-source CSS framework that loads on any WordPress site with zero build step, no Node, and no JavaScript on the frontend. This plugin enqueues the framework and wires it into **Bricks Builder** (and, more modestly for now, the Gutenberg block editor) so you author with the framework's design tokens and classes instead of hand-typing them.

If you build sites in Bricks and want a real design-token system — not another utility-class soup — this is for you.

= What SLASHED stands for =

The name is a working philosophy, one letter at a time:

* **S — Standalone.** One stylesheet. No build pipeline, no package manager, no runtime.
* **L — Lean.** Ships tokens and a thin layer of structure, not a 10,000-class kitchen sink.
* **A — Agnostic.** Works with any theme, any builder, any stack. It styles the cascade, not your tooling.
* **S — Structured.** 15 named CSS cascade layers in a fixed precedence order, so "what wins" is never a specificity guessing game.
* **H — Hybrid.** A token API first, with opt-in classless styling for prose and forms when you want it.
* **E — Explicit.** You rebrand by setting tokens you can read, not by overriding mystery selectors.
* **D — Deterministic.** Colors, dark mode, and fluid scales are computed in plain CSS — same inputs, same output, every time.

In practice that means the **design tokens are the product**. You set a handful of brand colors and scale ratios; the framework derives the rest at runtime with native CSS (`oklch(from …)`, `light-dark()`, `clamp()`), no recompilation. SLASHED is BEM-first and ships no utility classes in the 0.x line — you build components against the token contract.

= Bricks Builder integration =

This is where the plugin does the most work. Enable the Bricks integration and the framework shows up natively inside the editor:

* **Token pickers.** Every `--sf-*` custom property is registered with the Bricks variable pickers and code-editor autocomplete, grouped by category. Color tokens get a hex swatch resolved for both light and dark, so you pick `var(--sf-color-primary)` from a list instead of remembering it.
* **Class autocomplete.** Every `.sf-*` layout/macro class and every `.is-*` state class is registered in the Bricks class input under "SLASHED Layout" and "SLASHED State".
* **Color System panel.** A floating, in-builder browser for the whole `--sf-color-*` palette, organized by family and tonal step. Each swatch previews its light and dark value; a Light/Dark toggle drives the canvas theme. Click a swatch and it copies the token's `var(--sf-color-*)` reference and applies it to the selected element's background, text, or border.
* **Class tooltip hints.** With "Show class hints" enabled, a small **?** icon appears beside each SLASHED class row — in the element's class list, in autocomplete, and in the global class manager. Hover it for a styled tooltip explaining what the class does and which category it belongs to. The icon is the only trigger, so it never covers Bricks' own row controls.
* **reBEMer — BEM automation.** A subtree-scoped BEM class manager built into the Bricks structure panel. Select an element, name the block, and reBEMer generates clean `block__element` / `block--modifier` class names for the whole subtree in one pass. It supports add, rename, replace, add-modifier, and migrate-ID-styles modes, auto-numbers colliding siblings, and guards against shadowing reserved SLASHED utilities. reBEMer never deletes a global class — that stays your call in Bricks' own manager.
* **Dark mode bridge.** Maps Bricks' `data-brx-theme` attribute to the SLASHED theme system (`--sf-is-dark` / `color-scheme`), so the builder's dark-mode toggle activates the SLASHED dark palette.

The token and class lists are parsed from the actual loaded CSS bundle at runtime — no hand-maintained list — so they stay in sync with whichever framework release you're running.

= Design System Configurator =

SLASHED has a full visual configurator for tuning **every** token and knob — colors, typography, spacing, borders, shadows, fluid scales — with a live light/dark preview, then exporting ready-to-paste override CSS.

For now it runs as a standalone web app at **https://slashed.codeslash.dev/configurator**. It is **not yet built into this plugin's admin UI** — full in-WordPress integration is planned for framework **version 0.8.0+**. Until then, configure your tokens in the web app, copy the generated `@layer slashed.overrides { … }` block, and paste it into the plugin's Manual CSS page or your theme.

= Gutenberg integration =

The Gutenberg integration is an early implementation — the core preset wiring works today, but the deeper editor tooling is still in development. When enabled, what works now:

* Loads the framework CSS in the block editor canvas and on the frontend.
* Registers `--sf-color-*` tokens as the editor color palette, `--sf-gradient-*` as gradient presets, `--sf-text-*` as font-size presets, and `--sf-space-*` as spacing presets. On block themes, presets flow through `wp_theme_json_data_theme` so no custom theme.json is needed.
* **Dark mode bridge.** Maps WordPress's `data-wp-dark-mode-active` attribute to the SLASHED theme system, so the editor's dark-mode toggle activates the framework's dark palette.

An in-editor token panel (browse/apply colors and gradients, toggle classes, copy variables) is in progress but not yet functional. reBEMer and native class autocomplete are not on the Gutenberg side. If you want the full tooling today, use Bricks.

= Cascade layers, in one breath =

SLASHED declares 15 named layers up front, in precedence order:

`tokens → reset → base → forms → layout → components → macros → utilities → states → themes → motion → accessibility → print → legacy → overrides`

Later layers always win, regardless of selector specificity. `slashed.overrides` sits on top and is yours — token overrides you set in the plugin land there, so they beat framework defaults without `!important` or specificity hacks. Because every layer is declared upfront, the order in which stylesheets concatenate never changes the cascade.

= Rebrand with a handful of tokens =

Six `-light` brand tokens fully recolor the framework:

`--sf-color-primary-light`, `--sf-color-secondary-light`, `--sf-color-tertiary-light`, `--sf-color-action-light`, `--sf-color-neutral-light`, `--sf-color-base-light`

Add optional `-dark` counterparts for per-mode control. Five status families (success, warning, danger, error, info) have their own built-in defaults and can each be overridden independently — for a maximum of 22 explicit source tokens (11 light + 11 dark). Everything else (hover, tint, shade, tonal steps) is computed at runtime with `oklch(from …)`.

= Dark mode with no JavaScript =

Dark mode runs entirely in CSS via `light-dark()`:

* Follows the OS `prefers-color-scheme` by default.
* `data-theme="dark"` on any element forces dark for it and its descendants.
* `data-theme="light"` carves a light subtree out of a dark page.

Section-level theming works too — a single dark section inside an otherwise light page, no script required.

= CSS bundles =

Pick the bundle that fits the project from the settings page:

* **Essential** — core token layers, reset, base, layout, states, themes, motion, accessibility, print.
* **Optimal** (recommended) — Essential plus extended palette and size tokens, form styles, and legacy browser fallbacks.
* **Full** — everything, including the in-progress component stubs and the utilities scaffold.

Two more variants (Optimal + Components, Optimal + Utilities) are available via CDN. The plugin bundles Essential, Optimal, and Full locally; all variants are reachable over CDN, where you can pin any published release tag.

= Browser support =

SLASHED targets **Chrome 125+, Safari 18.0+, Firefox 129+** (released April–September 2024). It uses `light-dark()`, `oklch(from …)`, `@property`, `pow()`, scroll-driven animations, and `@starting-style` without fallback. Below that floor, derived colors collapse to `initial`, fluid scales stop computing, and scroll animations are unavailable. If you must support older engines, SLASHED isn't the right tool.

= Open source =

The framework is maintained at https://github.com/codeslash-dev/SLASHED. Source and documentation for the plugin and its integrations live alongside it.

== Installation ==

1. Upload the `slashed` folder to `/wp-content/plugins/`, or install the plugin ZIP from **Plugins → Add New → Upload Plugin**.
2. Activate the plugin from the Plugins screen.
3. Open **SLASHED** in the admin menu.
4. Choose the CSS bundle for your project — **Optimal** is recommended for most sites.
5. Enable the integrations you need (Bricks, Gutenberg, or both).
6. For Bricks: open the builder and you'll find SLASHED tokens in the variable pickers, classes in autocomplete, the Color System panel, and reBEMer in the structure panel.

== Frequently Asked Questions ==

= Do I need Bricks Builder or Gutenberg to use it? =

No. The CSS framework loads on every WordPress install regardless of theme or builder. The builder integrations are optional and toggle on or off from the settings page.

= Is this just another utility-class framework? =

No. SLASHED ships no utility classes in the 0.x line. It's BEM-first: the design-token API is the product, and you build components against it. The classes it does register in Bricks are structural layout/macro classes (`.sf-*`) and state classes (`.is-*`), not atomic utilities.

= Where is the Design System Configurator? =

It currently runs as a standalone web app at https://slashed.codeslash.dev/configurator. It is not yet embedded in the plugin admin — full in-WordPress integration is planned for framework version 0.8.0+. For now, tune your tokens there, copy the generated override CSS, and paste it into the plugin's Manual CSS page or your theme.

= How complete is the Gutenberg integration? =

It's an early implementation. What works today: loading the CSS, registering color/gradient/font-size/spacing presets, and bridging WordPress dark mode. The in-editor token panel is still in development and not yet functional, and there's no reBEMer or class autocomplete on the Gutenberg side. For the full tooling, use Bricks.

= What is reBEMer? =

A BEM class manager in the Bricks structure panel. Select an element, name the block, and reBEMer generates `block__element` / `block--modifier` class names for the whole subtree in one transactional pass. It supports add, rename, replace, add-modifier, and migrate-ID-styles modes, auto-numbers colliding siblings, and refuses to shadow reserved SLASHED utilities. It never deletes a class globally.

= What are the class tooltip hints? =

When "Show class hints" is enabled, a **?** icon appears next to each SLASHED class row in Bricks. Hovering it shows a short, styled description of what that class does and its category — handy when you're learning the framework. The icon is the only trigger, so it never blocks Bricks' own row buttons.

= How do I rebrand the framework? =

Set the six `-light` brand color tokens (optionally their `-dark` counterparts). Everything else derives at runtime. Override tokens from Design Settings, the Manual CSS page, or the Configurator's exported CSS. Overrides are stored in the `slashed_tokens` option and injected into the top `slashed.overrides` cascade layer, so they win without specificity hacks.

= What's the minimum browser requirement? =

Chrome 125+, Safari 18.0+, Firefox 129+. The framework relies on `light-dark()`, `oklch(from …)`, `@property`, `pow()`, scroll-driven animations, and `@starting-style` with no fallback — all released in mid-2024.

= Does it add any frontend JavaScript? =

No. Dark mode, fluid scales, and color derivation all run in CSS. JavaScript loads only inside the WordPress admin (settings pages, Bricks editor, and block editor).

= Can I pin a specific framework version? =

Yes. Switch CSS delivery to CDN and enter a release tag (e.g. `v0.5.21`). The plugin loads that exact version. Local mode serves the bundled `dist/` CSS, with a one-click updater and rollback list.

== Changelog ==

= 0.3.8 =
* Added: "Import shared config" — paste a config code or configurator link to load a shared design (undoable)
* Removed: Manual CSS page and mode; token overrides are now the single styling path
* Removed: Legacy Bricks-specific admin app and standalone-plugin bundle fallback

= 0.3.7 =
* Added: "Open in configurator" with current tokens preloaded
* Fixed: Vendor bundles manifest so the synced build resolves
* Fixed: Re-vendor hardened config codec
* Fixed: Tolerate missing token registry during core sync

= 0.3.6 =
* Added: New **reBEMer** tab in Bricks settings holding the reBEMer enable/disable
* Added: toggle (the in-builder BEM badges + panel) alongside the element default-name
* Added: list.
* Added: Bricks settings → Options now has a toggle for the bottom-right "Colors"
* Added: launcher pill.
* Added: Layout containers (section / container / div / block) can now be given
* Added: default BEM names in the reBEMer element list; they still default to their
* Added: own Bricks type when left blank.

= 0.3.5 =
* Changed: Consolidated every Bricks-specific option into one tabbed **Bricks settings**
* Changed: admin subpage (Element names / Options / Filter hooks), placed after Manual
* Changed: CSS. Class hints moved off Plugin Settings; the standalone Filter Hooks page
* Changed: was folded into a tab.
* Changed: reBEMer now always names layout containers (section / container / div / block)
* Changed: after their own Bricks type. The `role` and `generic` container-naming modes,
* Changed: and the `rebemer_container_mode` setting, were removed.

= 0.3.4 =
* Maintenance release.

= 0.3.3 =
* Adds default layout container type names, surface mapping settings, and fixes the type-default reset.

= 0.3.2 =
* Adds smarter default BEM names with configurable type mapping.

= 0.3.1 =
* Rewrites the plugin description to cover the SLASHED philosophy and all Bricks tooling.

= 0.3.0 =
* Initial public release.
</content>
