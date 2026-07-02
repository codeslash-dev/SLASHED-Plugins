# SLASHED for WordPress

[SLASHED](https://github.com/codeslash-dev/SLASHED) is a cascade-layer CSS framework that runs entirely on design tokens — no build step, no frontend JavaScript. This plugin puts it to work inside WordPress: it bundles the framework CSS, serves it locally from your own server, and wires it into the editors you already use.

Three pieces, one plugin:

- **Design Settings** — a visual editor for every framework token, built into wp-admin, with a live light/dark preview.
- **Bricks Builder integration** — variable pickers, class autocomplete, color swatches, a Color System panel, class hints, and reBEMer.
- **Gutenberg integration** — editor presets, a token panel, and a dark-mode bridge.

## Design Settings

Open **SLASHED → Design Settings** and set your design system visually — brand and status colors, typography, fluid type and spacing scales, layout, borders, shadows, and motion. Set six brand colors (each with an optional separate dark value) and the framework derives everything else: hover and active states, tints, shades, tonal steps, and the four status colors. You only ever set validated token values; there is no raw-CSS field.

The same editor runs as a floating overlay on any frontend page — click **/ Design** in the admin bar to tweak tokens against the live site. It's also available as a standalone web app at [slashed.codeslash.dev/configurator](https://slashed.codeslash.dev/configurator/): "Open in configurator" launches it preloaded with your current tokens, and "Import shared config" pulls a shared design back in from a code or link.

## Bricks Builder

Enable the Bricks integration and the framework shows up natively in the builder:

- **Variable pickers** — every `--sf-*` custom property in the active bundle is registered with Bricks' variable pickers and code-editor autocomplete, grouped by category. Color entries get a swatch resolved for both light and dark.
- **Class autocomplete** — every `.sf-*` and `.is-*` class appears in the Bricks class input, under "SLASHED Layout" and "SLASHED State". The list is parsed from the CSS bundle you actually loaded, so it always matches.
- **Color System panel** — a floating in-builder browser for the full palette, organized by family and tone, with a light/dark canvas toggle. Click a swatch to copy its variable or apply it to the selected element's background, text, or border.
- **Class hints** — a **?** icon next to each SLASHED class explains what it does and which category it belongs to.
- **reBEMer** — a BEM class manager in the structure panel. Select an element, name the block, and it generates `block__element` / `block--modifier` names across the whole subtree in one pass, with add, rename, replace, add-modifier, and migrate-ID-styles modes. It never deletes a global class. See [docs/rebemer.md](docs/rebemer.md).
- **Dark-mode bridge** — the Bricks dark-mode toggle drives the SLASHED dark palette.

Filter hooks and architecture details are in the [Bricks integration README](SLASHED-for-WP/integrations/bricks/README.md).

## Gutenberg

- Framework CSS in the editor canvas and on the frontend.
- SLASHED colors, gradients, font sizes, and spacing registered as native editor presets.
- A floating token panel to browse and apply colors and gradients, toggle classes, and copy variables.
- A dark-mode bridge for the editor's dark toggle.

reBEMer and class autocomplete are Bricks-only.

## Install

Download `slashed.zip` from [Releases](https://github.com/codeslash-dev/SLASHED-Plugins/releases) and install it via **Plugins → Add New → Upload Plugin**. Then pick a CSS bundle on the SLASHED settings page (**Optimal** suits most sites) and enable the integrations you use.

Requirements: WordPress 6.4+, PHP 7.4+. The Bricks integration needs Bricks 1.9.2+ (variable pickers 1.9.8+, class registration 1.9.5+). The framework itself targets Chrome 125+, Safari 18.0+, Firefox 129+.

The framework CSS always loads locally from the plugin's bundled `dist/` folder — no CDN, no external requests, nothing phones home. New framework CSS arrives through plugin updates.

## Repository layout

```
SLASHED-for-WP/            Plugin (PHP + bundled CSS + built SPA assets)
  slashed.php              Unified bootstrap entry point
  readme.txt               WordPress.org plugin header
  includes/                Shared PHP classes (REST API, CSS generator, token store…)
  admin-app/               Svelte SPA — Design Settings + frontend overlay
  data/                    Generated inventory + class hints
  dist/                    Bundled framework CSS, synced from framework releases
  integrations/bricks/     Bricks integration (PHP + Svelte editor app)
  integrations/gutenberg/  Gutenberg integration (PHP)
scripts/                   Build + sync tooling
tests/                     Unit tests (node:test)
docs/                      reBEMer, Bricks template workflow, roadmap
```

> **Contributing? Read this first.** Most of `SLASHED-for-WP/admin-app/src/` is vendored from the framework's configurator and overwritten on every `npm run sync` — check `.vendored-manifest.json` before editing, and make configurator changes in the [framework repo](https://github.com/codeslash-dev/SLASHED) instead. Details in [CLAUDE.md](CLAUDE.md).

## Development

```sh
npm run sync              # vendor configurator/src from the framework
npm run update-framework  # update bundled CSS + data to a framework release
npm run build             # full build: data + sync-dist + SPA apps + zip
npm run build:apps        # build the admin SPA + Bricks editor app
npm test                  # unit tests (node:test)
npm run verify            # verify sync consistency
```

`npm run update-framework -- --version=0.6.0` pins a specific framework release. `SLASHED_CONFIGURATOR_SRC=/path/to/SLASHED/configurator/src npm run sync` forces a local checkout.

## Documentation

- [reBEMer](docs/rebemer.md) — BEM class manager design
- [Bricks template workflow](docs/bricks-template-workflow.md)
- [Roadmap](docs/roadmap.md)
- [Bricks integration](SLASHED-for-WP/integrations/bricks/README.md)

## License

[MIT](LICENSE) © CODE/
