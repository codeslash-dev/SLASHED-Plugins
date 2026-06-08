# Changelog — SLASHED for WordPress

All notable changes to the SLASHED WordPress plugin (Bricks Builder and
Gutenberg integrations) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **History note:** this plugin was split out of the
> [SLASHED framework](https://github.com/codeslash-dev/SLASHED) repository.
> Entries below were migrated from that repo's changelog; earlier framework
> versions (`0.2.11` and below) predate the plugin.

## [Unreleased]

### Added

- **reBEMer** (`integrations/bricks/`) — Subtree-scoped BEM class manager
  for the Bricks Builder structure panel. Adds a "BEM" badge to every
  structure-panel item; clicking it opens a draggable modal that names a
  block + every descendant element + an optional modifier and applies the
  result as global classes in one transaction. Five operation modes
  (Add / Rename / Replace / Add Modifier / Migrate ID styles), a
  client-side reference-usage check (via `GET /rebemer/unused`) so destructive
  ops surface cross-element class usage before they run, snapshot + rollback for
  every apply, an in-panel undo ring buffer, and a reserved-name guard
  against SLASHED's own utility classes. Full design at
  [docs/rebemer.md](docs/rebemer.md). The editor app lives in
  `integrations/bricks/editor-app/` (Svelte 5 runes + Vite); the PHP side
  is `Slashed_Bricks_ReBEMer_{Policy,REST,Enqueue}` under
  `integrations/bricks/includes/`.
- **Layouts tab — responsive header/sticky offsets** — the admin SPA exposes
  `--sf-header-height-mobile`/`-desktop` and `--sf-sticky-offset-mobile`/`-desktop`
  as number fields and generates a fluid `clamp()` for `--sf-header-height` /
  `--sf-sticky-offset` when the two values differ. Tracks the matching framework
  token additions.

## [0.2.12] - 2026-05-23

Initial Bricks Builder integration.

### Added

- **Bricks Builder integration** — WordPress plugin for one-click SLASHED
  loading in Bricks Builder themes (PR #71)
