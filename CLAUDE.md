# CLAUDE.md — AI developer guide for SLASHED-Plugins

## Repo structure

```
SLASHED-for-WP/          WordPress plugin
  admin-app/             Svelte SPA — configurator UI embedded in WP admin + frontend overlay
    src/                 ⚠️  VENDORED — see below
    framework-css/       Vendored framework CSS (chrome layers + full bundle)
  assets/                Built SPA output (admin-app/, editor-app/ — committed build artifacts)
  data/                  Generated inventories/hints (classes-hints.json, variables-hints.json…)
  integrations/
    bricks/editor-app/   Bricks Builder panel — independent, NOT vendored
    gutenberg/           Gutenberg integration
  includes/              PHP backend (REST API, CSS generator, token store…)
  dist/                  Framework CSS bundles (updated by npm run update-framework)
scripts/                 Plugin-level build/sync scripts
tests/                   Node --test suite + Playwright admin smoke test
docs/                    Project docs
```

## ⚠️  Vendored files — DO NOT edit in this repo

`SLASHED-for-WP/admin-app/src/` is **vendored** from the SLASHED framework
configurator (`codeslash-dev/SLASHED → configurator/src/`), except for files
protected by `.syncignore` (e.g. `AppOverlay.svelte`, `plugin-main.ts`). All
other files are overwritten on every `npm run sync` (which also runs
automatically as `predev` and `prebuild`).

**Any edit you make directly in `admin-app/src/` — unless the file is listed in
`.syncignore` — will be lost on the next sync.**

### How to find which files are vendored

After every sync, `admin-app/scripts/sync-core.mjs` writes a manifest:

```
SLASHED-for-WP/admin-app/.vendored-manifest.json
```

That file lists every vendored path with its framework source. If a file you
are about to edit appears there — **stop and make the change in the framework
repo instead.**

### Where to make changes

| What you want to change | Where to edit |
|---|---|
| Panel UI (Borders, Typography, Spacing…) | `codeslash-dev/SLASHED → configurator/src/components/` |
| Token logic, persistence, codec | `codeslash-dev/SLASHED → configurator/src/lib/` |
| Configurator data / API index | `codeslash-dev/SLASHED → scripts/gen-api-index.js` + `npm run docs` |
| WordPress overlay behaviour | `admin-app/src/AppOverlay.svelte` (plugin-specific, NOT vendored) |
| WP entry point / Shadow DOM mount | `admin-app/src/plugin-main.ts` (plugin-specific, NOT vendored) |
| Bricks editor panel | `integrations/bricks/editor-app/src/` (independent, safe to edit) |
| PHP CSS emitter / REST API | `includes/` (plugin-only, safe to edit) |

### Files that ARE safe to edit in this repo

These are plugin-specific and never overwritten by sync:

- `admin-app/src/AppOverlay.svelte` — WP frontend overlay (Shadow DOM, admin bar)
- `admin-app/src/plugin-main.ts` — WP-specific Svelte mount entry point
- `admin-app/.syncignore` — add paths here to protect them from future syncs
- Everything in `integrations/`
- Everything in `includes/` (PHP)
- `scripts/` (plugin build/sync scripts)
- `SLASHED-for-WP/dist/` (updated by `npm run update-framework`)

## Syncing the framework into the plugin

`npm run sync` is defined in `SLASHED-for-WP/admin-app/package.json`, not the
root `package.json` — run it from that directory (or via `npm run
build:admin-app` at the root, which runs it as a `prebuild` step):

```bash
cd SLASHED-for-WP/admin-app
npm run sync           # pull latest configurator/src from framework (local sibling or GitHub)
cd ../../..
npm run build:apps     # rebuild admin SPA + bricks editor app
```

`SLASHED_CONFIGURATOR_SRC=/path/to/SLASHED/configurator/src npm run sync`
(run from `SLASHED-for-WP/admin-app`) forces a specific local checkout.

When no local checkout is found, the sync falls back to the GitHub API and
vendors from the framework ref pinned in `slashed.php` (`SLASHED_CSS_REF`),
so vendored UI and bundled CSS stay on the same release. Override with
`SLASHED_SYNC_REF=main` to deliberately track a branch. `SLASHED_SKIP_SYNC=1`
makes the sync (and its prebuild/precheck hooks) a no-op — CI uses it so PR
builds compile the committed vendored tree instead of re-vendoring mid-build.

## Updating the bundled framework CSS

```bash
npm run update-framework                 # latest stable release
npm run update-framework -- --version=0.6.0
```

Downloads release CSS bundles, shallow-clones framework source, regenerates
`data/inventory.json`, `data/classes-hints.json` and `data/variables-hints.json`,
re-vendors the admin-app configurator core from the clone, and stamps PHP
constants — so one run moves every framework-derived artifact to the same
release.

## Key scripts

| Command | What it does |
|---|---|
| `npm run sync` | Vendor configurator/src from framework |
| `npm run update-framework` | Update bundled CSS + data to a framework release |
| `npm run build` | Full build: data + sync-dist + SPA apps + zip |
| `npm run build:apps` | Build admin SPA + Bricks editor app |
| `npm test` | Run test suite |
| `npm run verify` | Verify version metadata is in sync |
| `npm run check` | Verify generated artifacts (class hints, variables hints, vendored admin-app core) aren't stale — exits non-zero on drift, never writes. Needs the framework source (sibling checkout, `.framework`, or `SLASHED_FRAMEWORK_DIR`); CI clones it at the pinned `SLASHED_CSS_REF` and runs this as the per-PR drift gate |
| `composer phpunit` | Run the PHP unit suite (`tests-php/`) |

`tests/` is `node --test` specs, run automatically by `npm test`, with two
exceptions — both manual, local-only dev/QA tools that need a Playwright
browser (not an npm dependency of this repo) and so are wired into neither
`npm test` nor CI. See each file's header for prerequisites.

- `tests/playwright-admin.js` — walks the admin SPA and saves screenshots for
  a human to review. No pass/fail assertions (also needs a locally-running dev
  server serving an uncommitted `test-admin.html`). Run:
  `node tests/playwright-admin.js`.
- `tests/override-effect-probe.mjs` — answers "which configurator controls
  actually change anything on the page?". For each control group it asks the
  real PHP emitter (`tests/php-harness/emit-override-css.php`) for the CSS a
  site would serve, then diffs every live `--sf-*` token in a headless browser
  against the un-overridden page, for both the layered and the flat bundle. A
  control group that changes nothing prints `DEAD` and the run exits non-zero.
  Reach for this first whenever a configurator control appears to do nothing in
  WordPress but works on the standalone configurator. Run:
  `node tests/override-effect-probe.mjs`.

`tests-php/` is a plain PHPUnit suite (`composer phpunit`, wired into CI's
`quality` job) covering pure/near-pure PHP logic that needs no WordPress
runtime — CSS parsing, override-value validation, and REST input
sanitization. `tests-php/bootstrap.php` defines `ABSPATH` and stubs the one
WordPress function this code touches (`sanitize_key()`) rather than pulling
in a mocking framework; it does not boot WordPress, so classes with real
`wpdb`/hook dependencies aren't covered here.
