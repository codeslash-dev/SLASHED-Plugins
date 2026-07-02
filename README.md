# SLASHED for WordPress

WordPress plugin for the [SLASHED](https://github.com/codeslash-dev/SLASHED)
cascade-layer CSS framework. Ships two integrations that load from the unified
`slashed.php` bootstrap:

- **Bricks Builder** — CSS loading, `--sf-*` variable pickers, `.sf-*`/`.is-*`
  class autocomplete, color swatches, a Color System panel, class hints, and
  reBEMer (subtree-scoped BEM class manager in the structure panel).
- **Gutenberg** — CSS loading in the block editor and frontend, color palette /
  gradient / font-size / spacing presets, a token panel, and a dark-mode bridge.

A **Design Settings** admin page (SLASHED → Design Settings) lets you set every
design token visually — colors, typography, spacing, layouts, borders, shadows,
motion, z-index — with a live light/dark preview. The same editor runs as a
floating overlay on any frontend page: click **/ Design** in the WordPress admin
bar to open it without leaving the site.

## Layout

```
SLASHED-for-WP/            Plugin (PHP + bundled CSS + built SPA assets)
  slashed.php              Unified bootstrap entry point
  readme.txt               WordPress.org plugin header
  includes/                Shared PHP classes
  data/                    Generated inventory + class hints
  dist/                    Bundled CSS, synced from framework releases
  integrations/bricks/     Bricks integration (PHP + Svelte editor/admin apps)
  integrations/gutenberg/  Gutenberg integration (PHP)
scripts/                   Build + sync tooling
tests/                     Unit tests (node:test)
docs/                      reBEMer, Bricks template workflow, roadmap
```

## Framework sync

The plugin tracks the SLASHED framework (separate repo) and consumes two
artifacts: source CSS (`core/`, `optional/`) to regenerate the token/class
inventory, and built bundles (`slashed.<bundle>.css`) shipped in
`SLASHED-for-WP/dist/`.

```sh
npm run update-framework                  # newest stable release
npm run update-framework -- --version=0.5.21
```

This shallow-clones the framework at the target tag into `./.framework`,
downloads its CSS bundles into `SLASHED-for-WP/dist/`, regenerates
`data/inventory.json` + `data/classes-hints.json`, and stamps the
`SLASHED_*_CSS_REF` constants. Build scripts resolve the framework from
`SLASHED_FRAMEWORK_DIR`, then `./.framework`, then a sibling `../SLASHED`.

The framework CSS always loads locally from the plugin's bundled `dist/` folder
— no external CDN requests are made. New framework CSS arrives through plugin
updates or `npm run update-framework`.

## Build

```sh
npm --prefix SLASHED-for-WP/integrations/bricks/editor-app ci   # one-time
npm --prefix SLASHED-for-WP/admin-app                      ci   # one-time

npm run build:data    # regenerate data/inventory.json + data/classes-hints.json
npm run sync-dist     # copy framework CSS bundles into SLASHED-for-WP/dist/
npm run build:apps    # build the Svelte editor + admin SPAs
npm run build:zip     # package SLASHED-for-WP/ → dist/slashed.zip
npm run build         # all of the above, in order
```

## Test & check

```sh
npm test              # unit tests (node:test)
npm run check         # admin-app drift + cheatsheet coverage
```

`npm run check` requires PHP on PATH and the framework checkout.

## Docs

- [reBEMer](docs/rebemer.md) — BEM class manager design
- [Bricks template workflow](docs/bricks-template-workflow.md)
- [Roadmap](docs/roadmap.md)
- [Bricks integration](SLASHED-for-WP/integrations/bricks/README.md)

## Versioning

- **Plugin version** — `slashed.php` header, `SLASHED_VERSION`, `readme.txt`
  `Stable tag`.
- **Framework version** — `SLASHED_*_CSS_REF`, bumped by
  `npm run update-framework`.
