# Contributing to SLASHED for WordPress

This repo packages the Bricks Builder and Gutenberg integrations for the
[SLASHED](https://github.com/codeslash-dev/SLASHED) CSS framework. The framework
itself lives in a separate repo; here we bundle its CSS and build the plugin.

## Setup

```sh
npm ci                                                          # root tooling
npm --prefix SLASHED-for-WP/integrations/bricks/editor-app ci   # editor SPA
npm --prefix SLASHED-for-WP/admin-app                      ci   # admin SPA
```

`npm ci` runs `prepare`, which points git at `.githooks` (commitlint +
pre-commit lint). PHP must be on PATH for the PHP lint and drift checks.

## Build

```sh
npm run build:data    # regenerate data/inventory.json + data/classes-hints.json
npm run sync-dist     # copy framework CSS bundles into SLASHED-for-WP/dist/
npm run build:apps    # build the Svelte editor + admin SPAs
npm run build:zip     # package SLASHED-for-WP/ → dist/slashed.zip
npm run build         # all of the above, in order
```

## Test & check

```sh
npm test              # unit tests (node:test)
npm run lint          # stylelint + php -l
npm run verify        # version metadata is internally consistent
npm run check         # admin-app ↔ framework drift + cheatsheet coverage
```

Before opening a PR, `npm test`, `npm run lint`, and `npm run verify` must pass.
`npm run check` requires the framework checkout (see below) and PHP on PATH. CI
runs all of these.

## Framework sync

The bundled CSS and the `SLASHED_*_CSS_REF` constants track a specific framework
release. Don't edit `SLASHED-for-WP/dist/*.css`, `data/inventory.json`, or
`data/classes-hints.json` by hand — they are generated:

```sh
npm run update-framework                  # newest stable release
npm run update-framework -- --version=0.5.24
```

This shallow-clones the framework into `./.framework`, downloads its CSS
bundles, regenerates the data files, and stamps the `SLASHED_*_CSS_REF`
constants. The `framework-sync` workflow runs this daily and opens a PR when a
newer release exists. Build/check scripts resolve the framework from
`SLASHED_FRAMEWORK_DIR`, then `./.framework`, then a sibling `../SLASHED`.

## Conventions

- **PHP** — every shipped `.php` file must pass `php -l` (a parse error is a
  fatal white screen on activation). WordPress 6.4+, PHP 7.4+.
- **CSS** — bundled framework CSS is generated; only hand-author CSS inside the
  integrations, and keep stylelint green.
- **Editor/admin SPAs** — Svelte sources live under
  `integrations/bricks/{editor-app,admin-app}`; commit the built assets they
  emit into `assets/` so the plugin ships without a build step.
- **Two version concepts** (kept distinct by `verify-sync.js`):
  - **Plugin version** — `package.json`, the `Version:` header + `SLASHED_*_VERSION`
    constants in the three entry files, and `readme.txt` `Stable tag`.
  - **Framework version** — `SLASHED_*_CSS_REF`, owned by `update-framework`.

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `docs:`, `chore:`, …). `commitlint` runs via the `commit-msg`
hook. `CHANGELOG.md` is maintained by hand and follows
[Keep a Changelog](https://keepachangelog.com/).

## Releasing

The plugin version is independent of the bundled framework version.

1. Move the accumulated `## [Unreleased]` entries in `CHANGELOG.md` under a new
   `## [x.y.z] - YYYY-MM-DD` heading; leave a fresh empty `## [Unreleased]`.
2. Bump `version` in `package.json`, then run `npm run version-sync` to
   propagate it into the entry files and `readme.txt`. Commit.
3. Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`.

Pushing a `v*` tag triggers `release.yml`, which stamps the version from the tag
(`version-sync --from-tag`), builds `dist/slashed.zip`, and creates the GitHub
Release with the zip attached. `workflow_dispatch` can rebuild/re-attach the zip
for an existing tag without re-tagging.
