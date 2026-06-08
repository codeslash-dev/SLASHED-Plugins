# SLASHED for WordPress

WordPress plugin for the [SLASHED](https://github.com/codeslash-dev/SLASHED)
cascade-layer CSS framework. Ships two independent integrations that can each
run as a standalone plugin or load together from the unified `slashed.php`
bootstrap:

- **Bricks Builder** — CSS loading, `--sf-*` variable pickers, `.sf-*`/`.is-*`
  class autocomplete, a Color System panel, and **reBEMer** (subtree-scoped BEM
  class manager in the structure panel).
- **Gutenberg** — CSS loading in the block editor canvas + frontend, color
  palette sync, and a dark-mode bridge.

## Repository layout

```
SLASHED-for-WP/            The plugin (PHP + bundled CSS + built SPA assets)
  slashed.php              Unified bootstrap entry point
  readme.txt               WordPress.org plugin header
  includes/                Shared PHP classes
  data/                    Fallback inventory + class hints (generated)
  dist/                    Bundled CSS for local-first delivery (synced)
  integrations/bricks/     Bricks integration (PHP + Svelte editor/admin apps)
  integrations/gutenberg/  Gutenberg integration (PHP)
scripts/                   Build + drift-check tooling
tests/                     Unit tests for the editor-app libs (node:test)
docs/                      reBEMer design doc, Bricks template workflow, roadmap
```

## Syncing with the framework

The plugin tracks the [SLASHED framework](https://github.com/codeslash-dev/SLASHED),
which lives in a separate repo. It consumes two of the framework's published
artifacts:

- **Source CSS** (`core/`, `optional/`) — parsed to regenerate the token/class
  inventory and class hints.
- **Built bundles** (`slashed.<bundle>.css`) — shipped in `SLASHED-for-WP/dist/`
  for local-first delivery, downloaded from the framework's GitHub Release assets.

### Update to the latest (or a chosen) framework version

```sh
npm run update-framework                  # newest stable release
npm run update-framework -- --version=0.5.21
npm run update-framework -- --version=v0.6.0
```

This resolves the target version, shallow-clones the framework source at that
tag into `./.framework`, downloads that release's CSS bundles into
`SLASHED-for-WP/dist/`, regenerates `data/inventory.json` + `data/classes-hints.json`,
and stamps the `SLASHED_*_CSS_REF` constants in the PHP entry points. Then:

```sh
npm run build:apps && npm run build:zip   # rebuild SPA assets + package the plugin
```

### How the framework version is resolved by the build scripts

The data/check scripts read the framework from the first of:

1. `SLASHED_FRAMEWORK_DIR` (explicit override)
2. `./.framework` (created by `npm run update-framework`)
3. a sibling `../SLASHED` checkout

| Script | Reads from framework |
| --- | --- |
| `scripts/gen-bricks-inventory.js` | `core/`, `optional/` token + class CSS |
| `scripts/gen-class-hints.js` | `core/`, `optional/forms.css` section comments |
| `scripts/check-admin-app.js` | `docs/registry.json`, `core/`, `optional/` CSS |
| `scripts/sync-plugin-dist.js` | `dist/slashed.{essential,optimal,full}.css` (for a locally-built checkout) |

### Runtime: how the WordPress plugin loads the framework

End users pick the framework version from the plugin's settings page (**CSS source**):

- **Local** (default) — serves the bundled `dist/` CSS; the **Update framework**
  button downloads any chosen or the latest release into `dist/` (from GitHub
  Release assets).
- **CDN** — `latest` serves the always-current jsDelivr `dist`-branch mirror; a
  pinned version tag serves that release's immutable GitHub Release asset.

A daily cron (Bricks) and the settings page check the framework's published tags
(via jsDelivr metadata) and surface an update notice when a newer release exists.
`scripts/check-cheatsheet.js` and `scripts/zip-plugin.js` are self-contained
(operate only on plugin files).

## Build

```sh
# one-time: install SPA dependencies
npm --prefix SLASHED-for-WP/integrations/bricks/editor-app ci
npm --prefix SLASHED-for-WP/integrations/bricks/admin-app  ci

npm run build:data    # regenerate data/inventory.json + data/classes-hints.json
npm run sync-dist     # copy framework CSS bundles into SLASHED-for-WP/dist/
npm run build:apps    # build the Svelte editor + admin SPAs into assets/
npm run build:zip     # package SLASHED-for-WP/ → dist/slashed.zip
npm run build         # all of the above, in order
```

## Test & check

```sh
npm test              # unit tests for the editor-app libs (node:test)
npm run check         # admin-app cssVar/default drift + cheatsheet coverage
```

`npm run check` requires PHP on PATH (executes `Slashed_Token_Defaults` to read
canonical factory defaults) and the framework checkout (for `registry.json`).

## Documentation

| Guide | What's inside |
| --- | --- |
| [reBEMer](docs/rebemer.md) | BEM class manager design doc |
| [Bricks template workflow](docs/bricks-template-workflow.md) | template build workflow |
| [Roadmap](docs/roadmap.md) | integration roadmap |
| [Bricks integration README](SLASHED-for-WP/integrations/bricks/README.md) | full Bricks docs |

## Versioning

Two independent version axes:

- **Plugin version** — this plugin's own releases (`slashed.php` header,
  `SLASHED_VERSION`, `readme.txt` `Stable tag`). Bumped when you release the plugin.
- **Framework version** — which SLASHED framework the plugin tracks
  (`SLASHED_*_CSS_REF`). Bumped by `npm run update-framework`.

`npm run update-framework` keeps the framework axis in sync. If you automate
plugin releases, add a release step that bumps the plugin axis and `readme.txt`.
