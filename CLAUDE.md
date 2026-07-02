# CLAUDE.md — AI developer guide for SLASHED-Plugins

## Repo structure

```
SLASHED-for-WP/          WordPress plugin
  admin-app/             Svelte SPA — configurator UI embedded in WP admin + frontend overlay
    src/                 ⚠️  VENDORED — see below
    framework-css/       Vendored framework CSS (chrome layers + full bundle)
  assets/                Built SPA output (admin-app/, editor-app/ — committed build artifacts)
  data/                  Generated inventories/hints (class-hints.json, variables-hints.json…)
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

## Updating the bundled framework CSS

```bash
npm run update-framework                 # latest stable release
npm run update-framework -- --version=0.6.0
```

Downloads release CSS bundles, shallow-clones framework source, regenerates
`data/inventory.json` and `data/class-hints.json`, stamps PHP constants.

## Key scripts

| Command | What it does |
|---|---|
| `npm run sync` | Vendor configurator/src from framework |
| `npm run update-framework` | Update bundled CSS + data to a framework release |
| `npm run build` | Full build: data + sync-dist + SPA apps + zip |
| `npm run build:apps` | Build admin SPA + Bricks editor app |
| `npm test` | Run test suite |
| `npm run verify` | Verify version metadata is in sync |
| `npm run check` | Verify generated artifacts (class hints, variables hints, vendored admin-app core) aren't stale — exits non-zero on drift, never writes |
