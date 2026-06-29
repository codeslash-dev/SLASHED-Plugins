# Changelog

Notable changes to the SLASHED WordPress plugin. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

- Fixed frontend overlay not appearing when CSS loaded after mount, or when a script optimiser stripped `type="module"` and moved the script to `<head>`.

## [0.4.4] - 2026-06-29

- Added a floating frontend overlay to edit tokens on any live page — "/ Design" in the admin bar opens the panel without leaving the site.
- Framework CSS is now always bundled locally; CDN delivery and the automatic background version-check were removed.
- Bug fixes.

## [0.4.3] - 2026-06-28

- Bug fixes.

## [0.4.2] - 2026-06-28

- Brand and status color overrides set in Design Settings now recolor the live site.
- Bug fixes.

## [0.4.1] - 2026-06-28

- Bug fixes.

## [0.4.0] - 2026-06-28

- Added the SLASHED design-system configurator built into the plugin at SLASHED → Design Settings.
- Bug fixes.

## [0.3.15] - 2026-06-26

- Added a flat CSS bundle option to the settings page.

## [0.3.14] - 2026-06-26

- Switched to four CSS bundle options: Optimal, Optimal + Components, Optimal + Utilities, and Full.
- Bug fixes.

## [0.3.13] - 2026-06-24

- Bug fixes.

## [0.3.11] - 2026-06-23

- Bug fixes.

## [0.3.9] - 2026-06-22

- Bug fixes.

## [0.3.8] - 2026-06-22

- Added "Import shared config" — paste a code or configurator link to load a shared design.
- Removed the manual-CSS page; design tokens are now the only styling path.

## [0.3.7] - 2026-06-21

- Added "Open in configurator", launching the hosted editor preloaded with your current tokens.
- Bug fixes.

## [0.3.6] - 2026-06-21

- Added reBEMer to the Bricks structure panel and a Colors launcher panel to the builder.
- Bug fixes.

## [0.3.5] - 2026-06-21

- Consolidated all Bricks options into a single tabbed settings page.
- Bug fixes.

## [0.3.4] - 2026-06-20

- Bug fixes.

## [0.3.3] - 2026-06-20

- Added default BEM names for layout containers (section, container, div, block).
- Bug fixes.

## [0.3.2] - 2026-06-20

- Added smarter default BEM names and configurable type mapping for reBEMer.
- Bug fixes.

## [0.3.1] - 2026-06-20

- Bug fixes.

## [0.3.0] - 2026-06-20

- Initial public release. Synced with SLASHED framework v0.6.0.

## [0.2.7] - 2026-06-18

- Bug fixes.

## [0.2.6] - 2026-06-18

- Added variable hints tooltip to the Bricks variable picker.
- Bug fixes.

## [0.2.5] - 2026-06-17

- Added variable hints panel to the Bricks builder.
- Bug fixes.

## [0.2.4] - 2026-06-17

- Bug fixes.

## [0.2.3] - 2026-06-17

- Bug fixes.

## [0.2.2] - 2026-06-15

- Bug fixes.

## [0.2.1] - 2026-06-15

- Bug fixes.

## [0.2.0] - 2026-06-15

- Added a comprehensive framework showcase with tabbed sections to the admin panel.
- Bug fixes.

## [0.1.7] - 2026-06-14

- Bug fixes.

## [0.1.6] - 2026-06-14

- Bug fixes.

## [0.1.5] - 2026-06-14

- Bug fixes.

## [0.1.4] - 2026-06-14

- Bug fixes.

## [0.1.3] - 2026-06-14

- Added a WordPress admin panel built on the SLASHED configurator, with token editing, CSS export, and a WCAG color checker.
- Added GitHub Actions for admin-app auto-sync and rebuild on release.
- Bug fixes.

## [0.1.2] - 2026-06-08

- Bug fixes.

## [0.1.1] - 2026-06-08

- Rebuilt settings page with bundle cards, version rollback UI, and a merged tab layout.
- Bug fixes.

## [0.0.1] - 2026-06-08

First standalone release. Bundles the Bricks Builder and Gutenberg integrations previously developed in the SLASHED framework repo. Includes the in-builder token/class pickers, Color System panel, reBEMer, class hints, dark mode bridge, and the Svelte admin SPA.
