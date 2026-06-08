# Changelog

Notable changes to the SLASHED WordPress plugin (Bricks Builder and Gutenberg
integrations). Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). The bundled
framework version is tracked separately via the `SLASHED_*_CSS_REF` constants.

## [Unreleased]

## [0.0.1] - 2026-06-08

First standalone release. Bundles the Bricks Builder and Gutenberg integrations
previously developed in the SLASHED framework repo.

### Added

- **Bricks Builder integration** — one-click SLASHED loading in Bricks themes.
- **reBEMer** — subtree-scoped BEM class manager for the Bricks structure panel:
  Add / Rename / Replace / Add Modifier / Migrate-ID-styles modes, per-row
  class-family picker, sibling auto-numbering, a read-only reference-usage
  report (`GET /rebemer/unused`), and a reserved-name guard against SLASHED
  utility classes. Design: [docs/rebemer.md](docs/rebemer.md).
- **Layouts tab — responsive header/sticky offsets** — admin SPA exposes
  `--sf-header-height-{mobile,desktop}` and `--sf-sticky-offset-{mobile,desktop}`
  and generates a `clamp()` for `--sf-header-height` / `--sf-sticky-offset` when
  the two values differ.
