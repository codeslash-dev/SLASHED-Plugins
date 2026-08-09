# Changelog

Notable changes to the SLASHED WordPress plugin (Bricks Builder and Gutenberg
integrations). Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). The bundled
framework version is tracked separately via the `SLASHED_*_CSS_REF` constants.

> **History note:** This plugin was split out of the [SLASHED framework](https://github.com/codeslash-dev/SLASHED) repository into its own repo. The work below was developed while the plugin still lived in the framework repo and is consolidated here as the first standalone release, in the order it landed.

## [Unreleased]

## [0.6.9] - 2026-08-09

### Fixed

- Resolve high-severity advisories via npm audit fix
- Isolate admin panel in a shadow DOM and harden SPA against JS optimizers

## [0.6.9] - 2026-08-09

### Fixed

- Resolve high-severity advisories via npm audit fix
- Isolate admin panel in a shadow DOM and harden SPA against JS optimizers

## [0.6.8] - 2026-07-28

### Added

- Check whether the space ladder is generated from the knobs

### Fixed

- Derive layer mode from the served bundle, not just the setting
- Only treat root-matching rules as shadowing, and name the map
- Emit token overrides unlayered when serving the flat CSS bundle

## [0.6.8] - 2026-07-28

### Added

- Check whether the space ladder is generated from the knobs

### Fixed

- Derive layer mode from the served bundle, not just the setting
- Only treat root-matching rules as shadowing, and name the map
- Emit token overrides unlayered when serving the flat CSS bundle

## [0.6.7] - 2026-07-25

### Fixed

- Stop dropping composite token values in override validation
- Accept gradient values in token override validation

## [0.6.7] - 2026-07-25

### Fixed

- Stop dropping composite token values in override validation
- Accept gradient values in token override validation

## [0.6.6] - 2026-07-24
## [0.6.6] - 2026-07-24
## [0.6.5] - 2026-07-23

### Fixed

- Bump js-yaml and fast-uri to patched versions (audit high)
- Ship the in-editor token panel assets so it actually loads

## [0.6.5] - 2026-07-23

### Fixed

- Bump js-yaml and fast-uri to patched versions (audit high)
- Ship the in-editor token panel assets so it actually loads

## [0.6.4] - 2026-07-22
## [0.6.4] - 2026-07-22
## [0.6.3] - 2026-07-21

### Fixed

- Drop non-colour classes from the color-picker cheatsheet

## [0.6.3] - 2026-07-21

### Fixed

- Trim the SF color-picker class cheatsheet to genuinely colour/surface classes — drop `sf-bg-layer` (a layout primitive), `sf-color-pulse` (motion), `sf-text-protect` (legibility overlay) and `sf-surface-bg` (background-image preset)

## [0.6.2] - 2026-07-20

### Added

- Add colour/surface class cheatsheet to SF color picker

### Fixed

- Stabilise cheatsheet tab selection + complete ARIA tab wiring
- Use non-deprecated overflow-wrap in class cheatsheet CSS

## [0.6.2] - 2026-07-20

### Added

- Colour/surface class cheatsheet in the SF color picker (Bricks): a "Classes" view with category tabs that copies utility class names (`.sf-surface--*`, coloured `.sf-btn--*`, `.sf-marker--*`, text/link helpers) to the clipboard

## [0.6.1] - 2026-07-20

### Added

- Expose all semantic color tokens in SF color picker

## [0.6.1] - 2026-07-20

### Added

- Expose all semantic color tokens in SF color picker

## [0.6.0] - 2026-07-19
## [0.6.0] - 2026-07-19
## [0.5.13] - 2026-07-16
## [0.5.13] - 2026-07-16
## [0.5.12] - 2026-07-16

### Fixed

- Cover minified CSS bundles in verify-sync's drift check
- Serve minified framework CSS bundles by default

## [0.5.12] - 2026-07-16

### Fixed

- Cover the minified CSS bundles (`slashed.*.min.css`) in `verify-sync`'s
  drift check, so a corrupted or version-mismatched minified bundle — the
  variant now served by default — fails CI instead of shipping undetected.

## [0.5.11] - 2026-07-13
## [0.5.11] - 2026-07-13
## [0.5.10] - 2026-07-10
## [0.5.10] - 2026-07-10
## [0.5.9] - 2026-07-10
## [0.5.9] - 2026-07-10
## [0.5.8] - 2026-07-10
## [0.5.8] - 2026-07-10
## [0.5.7] - 2026-07-09

### Fixed

- Ship flat CSS bundles and settings-page stylesheet in the plugin

## [0.5.7] - 2026-07-09

### Fixed

- Ship the flat (no `@layer`) CSS bundles so the "Flat CSS — no cascade layers"
  setting actually loads framework CSS instead of resolving a missing file.
- Include `assets/admin/` in the plugin zip so the settings-page stylesheet
  (`settings.css`) loads and the page renders styled.

## [0.5.6] - 2026-07-09

### Added

- Reduce CSS bundles to optimal + full and redesign the picker

## [0.5.6] - 2026-07-09

### Added

- Reduce CSS bundles to optimal + full and redesign the picker

## [0.5.5] - 2026-07-09

### Fixed

- Recognize renamed -tint color alias in WP integrations
- Sanitize resolved framework tag before use
- Resolve "latest" from GitHub API, fall back to jsDelivr

## [0.5.5] - 2026-07-09

### Fixed

- Recognize renamed -tint color alias in WP integrations
- Sanitize resolved framework tag before use
- Resolve "latest" from GitHub API, fall back to jsDelivr

## [0.5.4] - 2026-07-08
## [0.5.4] - 2026-07-08
## [0.5.4] - 2026-07-08
## [0.5.4] - 2026-07-08
## [0.5.2] - 2026-07-08
## [0.5.2] - 2026-07-08
## [0.5.1] - 2026-07-08

### Fixed

- Keep live preview visible on desktop in WP Studio

## [0.5.1] - 2026-07-08

### Fixed

- Keep live preview visible on desktop in WP Studio

## [0.5.0] - 2026-07-08

### Fixed

- Install editor-app deps in release build and require all class-hint sources
- Gate built assets and guard generators against silent drift

## [0.5.0] - 2026-07-08

### Fixed

- Install editor-app deps in release build and require all class-hint sources
- Gate built assets and guard generators against silent drift

## [0.4.25] - 2026-07-07

### Fixed

- Repair CI drift gate and admin-app type-check
- Sync share base URL validation from framework
- Close CI drift gaps, pin vendoring ref, repair update-framework pipeline
- Sync configurator header fixes (mobile toolbar, share link)

## [0.4.25] - 2026-07-07

### Fixed

- Repair CI drift gate and admin-app type-check
- Sync share base URL validation from framework
- Close CI drift gaps, pin vendoring ref, repair update-framework pipeline
- Sync configurator header fixes (mobile toolbar, share link)

## [0.4.24] - 2026-07-07

### Fixed

- Resync ComponentsPanel.svelte fix for stale computed radius display
- Sync package-lock.json license field with package.json
- Vendor optional/ CSS layers and track framework's dist/ rename
- Avoid positioning Bricks SF preview label
- Preserve Bricks color preview placement

## [0.4.24] - 2026-07-07

### Fixed

- Resync ComponentsPanel.svelte fix for stale computed radius display
- Sync package-lock.json license field with package.json
- Vendor optional/ CSS layers and track framework's dist/ rename
- Avoid positioning Bricks SF preview label
- Preserve Bricks color preview placement

## [0.4.22] - 2026-07-03

### Added

- Sync Studio light-mode support into the admin-app

### Fixed

- Use real forceTheme and fix vendored dark-mode contrast bugs
- Stylelint failure and overlay theme mismatch on Studio sync
- Correct status color count to four
- Restore brand-color dark-value coverage in wp.org copy
- Sync draft wp.org readme version metadata to actual 0.4.21
- Undo scope leak from stale-branch file checkout

## [0.4.22] - 2026-07-03

### Added

- Sync Studio light-mode support into the admin-app

### Fixed

- Use real forceTheme and fix vendored dark-mode contrast bugs
- Stylelint failure and overlay theme mismatch on Studio sync
- Correct status color count to four
- Restore brand-color dark-value coverage in wp.org copy
- Sync draft wp.org readme version metadata to actual 0.4.21
- Undo scope leak from stale-branch file checkout

## [0.4.21] - 2026-07-02

### Added

- Add --check mode to sync-core.mjs and a check orchestrator

### Changed

- Extract color-math and category-map into their own classes
- Re-sync deduped domain-scoped override key filter from framework

### Fixed

- Precheck mutating on type-check, AppOverlay missing save-error state
- Eliminate reentrant-lock deadlock risk in the sync concurrency limiter
- Harden sync-core.mjs's GitHub API sync path
- Guard ABSPATH definition in PHPUnit bootstrap
- Pin composer platform.php to the project's 7.4 floor
- Correct wrong relative path to class-color-math.php in Bricks bootstrap
- Restore reactivity in AppOverlay's rAF-coalesced preview effect
- Harden frontend overlay's cssUrl injection and live-preview effect
- Close TOCTOU/symlink gaps flagged by CodeQL and Qodo
- Run sync before svelte-check via a precheck hook
- Update AppOverlay.svelte for upstream codec/lucide renames
- Filter -dark source tokens consistently across Bricks/Gutenberg
- Re-sync All-tokens badge count fix from framework
- Re-sync category-reset domain-scoping fix from framework
- Restore reset-confirm modal z-index above in-panel tooltips
- Re-sync per-category reset button and reset-icon visibility fix from framework
- Stop frontend configurator overlay from covering admin bar dropdowns

## [0.4.21] - 2026-07-02

### Added

- Add --check mode to sync-core.mjs and a check orchestrator

### Changed

- Extract color-math and category-map into their own classes
- Re-sync deduped domain-scoped override key filter from framework

### Fixed

- Precheck mutating on type-check, AppOverlay missing save-error state
- Eliminate reentrant-lock deadlock risk in the sync concurrency limiter
- Harden sync-core.mjs's GitHub API sync path
- Guard ABSPATH definition in PHPUnit bootstrap
- Pin composer platform.php to the project's 7.4 floor
- Correct wrong relative path to class-color-math.php in Bricks bootstrap
- Restore reactivity in AppOverlay's rAF-coalesced preview effect
- Harden frontend overlay's cssUrl injection and live-preview effect
- Close TOCTOU/symlink gaps flagged by CodeQL and Qodo
- Run sync before svelte-check via a precheck hook
- Update AppOverlay.svelte for upstream codec/lucide renames
- Filter -dark source tokens consistently across Bricks/Gutenberg
- Re-sync All-tokens badge count fix from framework
- Re-sync category-reset domain-scoping fix from framework
- Restore reset-confirm modal z-index above in-panel tooltips
- Re-sync per-category reset button and reset-icon visibility fix from framework
- Stop frontend configurator overlay from covering admin bar dropdowns

## [0.4.20] - 2026-07-01

### Fixed

- Resolve dependabot lockfile/peer conflicts
- Re-sync min-h toolbar fix from framework
- Re-sync single-row mobile preview toolbar from framework

## [0.4.20] - 2026-07-01

### Fixed

- Resolve dependabot lockfile/peer conflicts
- Re-sync min-h toolbar fix from framework
- Re-sync single-row mobile preview toolbar from framework

## [0.4.19] - 2026-07-01

### Changed

- Re-sync deduped mobile fold-toggle button from framework

### Fixed

- Register the live page as the preview doc in the WP frontend overlay
- Re-sync mobile Controls/Preview switcher relocation from framework
- Re-sync mobile domain panel overflow fix from framework

## [0.4.19] - 2026-07-01

### Changed

- Re-sync deduped mobile fold-toggle button from framework

### Fixed

- Register the live page as the preview doc in the WP frontend overlay
- Re-sync mobile Controls/Preview switcher relocation from framework
- Re-sync mobile domain panel overflow fix from framework

## [0.4.18] - 2026-07-01

### Fixed

- Re-sync hasWpBoot() layout fix, make app-page CSS notice-safe
- Stop configurator clipping inside WP admin's layout chrome

## [0.4.18] - 2026-07-01

### Fixed

- Re-sync hasWpBoot() layout fix, make app-page CSS notice-safe
- Stop configurator clipping inside WP admin's layout chrome

## [0.4.17] - 2026-06-30

### Fixed

- Move CodeQL paths-ignore into the inline config input
- Validate JSON-import keys (App.svelte sync + AppOverlay.svelte)
- Sync JSON-import guard and dark-surface precedence fix from SLASHED#462
- Sync codec.ts key-sanitization fix from SLASHED#462
- Sync vendored bug fixes from SLASHED#462
- Clear framework-css/ and assets/admin-app/ before restoring in release.yml
- Sync configurator from PR 460/461 and close the release-sync gap

## [0.4.17] - 2026-06-30

### Fixed

- Sync vendored configurator (`admin-app/src/`) with framework PRs #460/#461 — saved themes, motion panel overhaul, base color palette and live semantic preview — which had silently failed to land.
- `release.yml` now commits the configurator sync (`admin-app/src/`, `.vendored-manifest.json`, `framework-css/`, `assets/admin-app/`) back to the default branch instead of discarding it after each release build.
- Remove `.syncignore` entries for files no longer divergent from upstream `SLASHED#443`.

## [0.4.16] - 2026-06-30
## [0.4.16] - 2026-06-30
## [0.4.16] - 2026-06-30
## [0.4.16] - 2026-06-30
## [0.4.15] - 2026-06-30
## [0.4.15] - 2026-06-30
## [0.4.14] - 2026-06-30

### Fixed

- Remove load_plugin_textdomain (auto-loaded since WP 4.6)

## [0.4.14] - 2026-06-30

### Fixed

- Remove load_plugin_textdomain (auto-loaded since WP 4.6)

## [0.4.13] - 2026-06-30

### Fixed

- Defer textdomain loading to init for WP 6.7 compatibility

## [0.4.13] - 2026-06-30

### Fixed

- Defer textdomain loading to init for WP 6.7 compatibility

## [0.4.12] - 2026-06-30

### Fixed

- Load textdomain at plugins_loaded to prevent WP 6.7 translation notice

## [0.4.12] - 2026-06-30

### Fixed

- Load textdomain at plugins_loaded to prevent WP 6.7 translation notice

## [0.4.11] - 2026-06-30

### Added

- Generate .vendored-manifest.json on sync + add CLAUDE.md

### Fixed

- Remove unused num_or_default() and align equals in css-generator
- Correct radius aliases, guard non-numeric scales, fix phpcs formatting
- Clear configurator diagnostics
- Reliably hide frontend overlay when collapsed in shadow DOM
- Derive scale token overrides

## [0.4.11] - 2026-06-30

### Added

- Generate .vendored-manifest.json on sync + add CLAUDE.md

### Fixed

- Remove unused num_or_default() and align equals in css-generator
- Correct radius aliases, guard non-numeric scales, fix phpcs formatting
- Clear configurator diagnostics
- Reliably hide frontend overlay when collapsed in shadow DOM
- Derive scale token overrides

## [0.4.10] - 2026-06-30

### Fixed

- Restore frontend overlay pointer events
- Restore frontend overlay pointer events
- Address WordPress.org plugin review (prefixes + remote files)

## [0.4.10] - 2026-06-30

### Fixed

- Restore frontend overlay pointer events
- Restore frontend overlay pointer events
- Address WordPress.org plugin review (prefixes + remote files)

## [0.4.9] - 2026-06-29

### Fixed

- Address PR #95 review findings (Qodo + CodeRabbit)
- Remove blank line before class brace in rest-controller (PHPCS)
- Restore configurator interactivity, redesign modular scale, drop legacy token system

## [0.4.9] - 2026-06-29

### Fixed

- Stop standalone Bricks/Gutenberg bootstraps from `require_once`-ing the deleted `class-token-sanitizer.php` and `class-tab-registry.php` (fatal error on standalone activation)
- Accept easing (`cubic-bezier()`, `linear()`, `steps()`) and scroll-timeline range (`entry 0%`, `cover 30%`) values in `Slashed_CSS_Generator::validate_override_value()` so motion-panel overrides are no longer silently dropped
- Align `Slashed_CSS_Generator::has_overrides()` with the emitter by validating values, so a stored invalid value no longer reports overrides while emitting no CSS
- Add accessible `aria-label`s to the modular-scale ratio preset select and custom ratio input in `ClampField.svelte`

## [0.4.8] - 2026-06-29

### Fixed

- Address all unresolved CodeRabbit PR review comments
- Address Qodo PR review bugs in css-generator, persistence, and SliderRow
- Eliminate TOCTOU race with fd-based stat+read; revert paths-ignore
- Rewrite preserved array to use inline resolve+startsWith; exclude compiled assets
- Add same-origin check to compiled wpSave to resolve CodeQL CWE-918
- Inline resolve+startsWith guard for CodeQL path-injection
- Validate REST URL is same-origin before fetch
- Guard preserved syncignore paths against path traversal
- Move Save button before Undo/Redo in plugin StudioHeader; fix PHPCS array formatting
- Frontend panel layout push + modular scale live preview

## [0.4.8] - 2026-06-29

### Fixed

- Address all unresolved CodeRabbit PR review comments
- Address Qodo PR review bugs in css-generator, persistence, and SliderRow
- Eliminate TOCTOU race with fd-based stat+read; revert paths-ignore
- Rewrite preserved array to use inline resolve+startsWith; exclude compiled assets
- Add same-origin check to compiled wpSave to resolve CodeQL CWE-918
- Inline resolve+startsWith guard for CodeQL path-injection
- Validate REST URL is same-origin before fetch
- Guard preserved syncignore paths against path traversal
- Move Save button before Undo/Redo in plugin StudioHeader; fix PHPCS array formatting
- Frontend panel layout push + modular scale live preview

## [0.4.7] - 2026-06-29

### Fixed

- Gate toggle event on mount readiness; keep nav fallback
- Admin bar button navigates to activate panel when assets not loaded

## [0.4.7] - 2026-06-29

### Fixed

- Gate toggle event on mount readiness; keep nav fallback
- Admin bar button navigates to activate panel when assets not loaded

## [0.4.6] - 2026-06-29

### Added

- Reset-all confirmation; save button left; panel gated on query param

### Changed

- Replace JSON.stringify comparisons with shallow equality in AppOverlay

### Fixed

- Address CodeRabbit/Qodo review findings + page-squeeze layout

## [0.4.6] - 2026-06-29

### Added

- Reset-all confirmation; save button left; panel gated on query param

### Changed

- Replace JSON.stringify comparisons with shallow equality in AppOverlay

### Fixed

- Address CodeRabbit/Qodo review findings + page-squeeze layout

## [0.4.5] - 2026-06-29

### Added

- Replace auto-save with explicit Save button

### Fixed

- Harden save state with snapshot-based dirty tracking
- Update AppOverlay + syncignore for explicit save
- Set mounted flag after mount() succeeds to allow retries on failure
- Harden overlay mount against stalled CSS and duplicate invocations
- Defer overlay mount until CSS loads; guard against script optimisers

## [0.4.5] - 2026-06-29

### Added

- Replace auto-save with explicit Save button

### Fixed

- Harden save state with snapshot-based dirty tracking
- Update AppOverlay + syncignore for explicit save
- Set mounted flag after mount() succeeds to allow retries on failure
- Harden overlay mount against stalled CSS and duplicate invocations
- Defer overlay mount until CSS loads; guard against script optimisers

## [0.4.4] - 2026-06-29

### Added

- Frontend overlay configurator — edit tokens on any page

### Fixed

- Comply with WordPress.org guidelines (local-only CSS, enqueued assets)
- Isolate overlay CSS, keyboard a11y, and shortcut normalization
- Correct PHPCS whitespace errors in frontend configurator

## [0.4.4] - 2026-06-29

### Added

- Frontend overlay configurator — edit tokens on any page

### Fixed

- Comply with WordPress.org guidelines (local-only CSS, enqueued assets)
- Isolate overlay CSS, keyboard a11y, and shortcut normalization
- Correct PHPCS whitespace errors in frontend configurator

## [0.4.3] - 2026-06-28

### Fixed

- Rewrite SEMVER regex to eliminate ReDoS (CodeQL)
- Validate semver after tag strip in changelog-release resolveVersion
- Deduplicate CHANGELOG.md version sections
- Apply brand color overrides on frontend; repair v0.4.2 release

## [0.4.3] - 2026-06-28

### Fixed

- Rewrite SEMVER regex to eliminate ReDoS (CodeQL)
- Validate semver after tag strip in changelog-release resolveVersion
- Deduplicate CHANGELOG.md version sections
- Apply brand color overrides on frontend; repair v0.4.2 release

## [0.4.2] - 2026-06-28

### Fixed

- Drop /i flag from --sf- key regex (CSS props are case-sensitive)
- Address two Qodo review findings
- Sanitize POST rebemer_map values at read time
- Restrict emit-side override key to --sf- namespace

## [0.4.1] - 2026-06-28

### Fixed

- Harden override validation per CodeRabbit review
- Render the configurator's flat override map on the frontend
- Validate flat override map against the typed CSS allowlist

## [0.4.0] - 2026-06-28

### Added

- Replace deactivated fork with the framework configurator

### Fixed

- Harden handleImport JSON guard against null and arrays
- Isolate WP embedded mode and surface save failures in persistence.ts
- Wipe src/ before remote sync to prevent stale vendored files
- Protect all upstream-changed files from CI sync
- Unblock CI on PR#80

## [0.3.15] - 2026-06-26

### Added

- Add flat CSS bundle toggle to plugin settings

## [0.3.14] - 2026-06-26

### Fixed

- Move @layer bricks preamble to integration bootstrap
- Inject @layer bricks preamble to prevent cascade override
- Update remaining bundle allowlists and license metadata
- Replace essential/optimal/full with the new four-bundle framework set

## [0.3.13] - 2026-06-24

### Fixed

- Sync package-lock.json version in version-sync + release commit-back
- Bump package.json to 0.3.11 to resolve pre-existing version drift
- Include package.json in release commit-back to prevent version drift

## [0.3.11] - 2026-06-23

### Fixed

- Commit synced registry-sources.js back to main after release
- Remove deleted tokens.sizes-extended.css from registry-sources; sync from framework on update

## [0.3.9] - 2026-06-22

### Fixed

- Pass GITHUB_TOKEN to admin-app build and tolerate 403 in sync-core

## [0.3.8] - 2026-06-22

### Added

- "Import shared config" — paste a config code or configurator link to load a
  shared design; applies through the token-override pipeline (undoable)

### Removed

- Manual CSS page and mode — raw-CSS injection is gone; token overrides are the
  single styling path
- Legacy Bricks-specific admin app and its standalone-plugin bundle fallback;
  the unified admin app is now the only admin SPA

## [0.3.7] - 2026-06-21

### Added

- "Open in configurator" with current tokens preloaded

### Fixed

- Vendor bundles manifest so the synced build resolves
- Re-vendor hardened config codec
- Tolerate missing token registry during core sync

## [0.3.6] - 2026-06-21

### Added

- New **reBEMer** tab in Bricks settings holding the reBEMer enable/disable
  toggle (the in-builder BEM badges + panel) alongside the element default-name
  list.
- Bricks settings → Options now has a toggle for the bottom-right "Colors"
  launcher pill.
- Layout containers (section / container / div / block) can now be given
  default BEM names in the reBEMer element list; they still default to their
  own Bricks type when left blank.

### Fixed

- Sync plugin version to 0.3.5; address review nits

## [0.3.5] - 2026-06-21

### Added

- Consolidate Bricks options into a tabbed settings page
- Move BEM defaults to a dedicated admin subpage
- List all registered Bricks elements in settings

### Changed

- Consolidated every Bricks-specific option into one tabbed **Bricks settings**
  admin subpage (Element names / Options / Filter hooks), placed after Manual
  CSS. Class hints moved off Plugin Settings; the standalone Filter Hooks page
  was folded into a tab.
- reBEMer now always names layout containers (section / container / div / block)
  after their own Bricks type. The `role` and `generic` container-naming modes,
  and the `rebemer_container_mode` setting, were removed.

### Fixed

- Address CodeRabbit review findings
- Address review findings on the elements helper + tab

## [0.3.4] - 2026-06-20

### Added

- Auto-sync readme.txt changelog on release

### Fixed

- Only suppress ENOENT in syncReadmeChangelog, re-throw other errors
- Preserve free-form changelog lines in readme sync, add missing JSDoc
- Derive readme.txt changelog from mergedBody not raw commits
- Eliminate TOCTOU race in syncReadmeChangelog (CodeQL)

## [0.3.3] - 2026-06-20

### Added

- Default layout containers to their Bricks type name
- Surface mapping settings in the active admin app

### Fixed

- Reset to 'type' default and reconcile docs
- Mark readme.txt and license.txt as required in zip packaging
- Include readme.txt and license.txt in plugin zip, fix phpcs:disable scope
- Extend phpcs:disable to cover both lines of the manual CSS POST read

## [0.3.2] - 2026-06-20

### Added

- Smarter default BEM names + configurable type mapping

### Fixed

- Resolve WordPress Plugin Check errors and warnings

## [0.3.1] - 2026-06-20

### Changed

- Update readme.txt

### Fixed

- Mark Gutenberg in-editor panel as not yet functional
- Correct four factual errors

## [0.3.0] - 2026-06-20

### Added

- Auto-sync readme.txt changelog on release
- Sync plugin data with latest framework tokens and classes
- Update plugin data and UI for SLASHED v0.6.0 token changes

### Changed

- Cleanup changelog by removing outdated entries

### Fixed

- Only suppress ENOENT in syncReadmeChangelog, re-throw other errors
- Preserve free-form changelog lines in readme sync, add missing JSDoc
- Derive readme.txt changelog from mergedBody not raw commits
- Eliminate TOCTOU race in syncReadmeChangelog (CodeQL)
- Mark readme.txt and license.txt as required in zip packaging
- Include readme.txt and license.txt in plugin zip, fix phpcs:disable scope
- Extend phpcs:disable to cover both lines of the manual CSS POST read
- Resolve WordPress Plugin Check errors and warnings
- Preserve sf- prefix in variable hints for Bricks lookup
- Correct sf-bento--compact description to row height not gap
- Correct PHPCS alignment and class hint accuracy
- Replace deprecated word-wrap with overflow-wrap in panel.css
- Fix variable picker ? button, add descriptions to tooltip

## [0.2.7] - 2026-06-18

### Fixed

- Replace --sf-equal-cols with --sf-equal-min-col for v0.5.46
- Update cheatsheet-data.js to cover all v0.5.46 inventory entries
- Update bundled CSS to framework v0.5.46
- Bump SLASHED_BRICKS_CSS_REF and SLASHED_GUTENBERG_CSS_REF to v0.5.46
- Restore bundled CSS v0.5.46 (fix corrupted agent push)
- Sync classes-hints.json to framework v0.5.46
- Sync inventory.json and classes-hints.json to framework v0.5.46
- Sync data files and SLASHED_CSS_REF to framework v0.5.46

## [0.2.6] - 2026-06-18

### Added

- Add variable hints tooltip to Bricks variable picker

### Fixed

- Associate tooltip with button via aria-describedby; add reduced-motion fallback

## [0.2.5] - 2026-06-17

### Added

- Add variable-hints.js; wire into main.js

### Changed

- Add variable hint tooltip and button styles to panel.css
- Split editor data out of rebemer-enqueue; add variable hints

### Fixed

- Restore native color preview to label row, keep SF btn right of input

## [0.2.4] - 2026-06-17

### Fixed

- Push both color swatches to right, add red X overlay, fix input sync

## [0.2.3] - 2026-06-17

### Changed

- Relocate class hints to builder integrations, add SF preview label

### Fixed

- Add missing textContent to SF preview label, extract shared preview helper

## [0.2.2] - 2026-06-15

### Fixed

- Remove always-true if guard on active_fw_version
- Resolve short ternary errors and alignment warnings
- Framework version display, CDN ver param, configurator link, SF swatch selector

## [0.2.1] - 2026-06-15

### Changed

- Remove ManualCssTab from Design Settings SPA

### Fixed

- Use div instead of button for non-interactive sidebar item

## [0.2.0] - 2026-06-15

### Added

- Move SF color swatch next to native preview, add active glow
- Comprehensive framework showcase with 7 tabbed sections

### Fixed

- Address CodeRabbit review findings
- Glow uses actual selected colour, not a fictitious accent
- Address CodeRabbit a11y findings

## [0.1.7] - 2026-06-14

### Fixed

- Show actually-installed framework version, not compile-time constant

## [0.1.6] - 2026-06-14

### Changed

- Remove redundant ternary in title attribute

### Fixed

- Fix CSS loading and modernise sidebar for mobile readability

## [0.1.5] - 2026-06-14

### Fixed

- Use targeted injection check instead of wp_strip_all_tags
- Show actual loaded framework version + fix WCAG navigation
- Fix configurator UX bugs and add Manual CSS subpage

## [0.1.4] - 2026-06-14

### Fixed

- Include assets/admin-app in release zip

## [0.1.3] - 2026-06-14

### Added

- Add GitHub Actions for auto-sync and rebuild of admin-app
- Update PHP — new admin-app path, overrides endpoint, settings fields
- Add WP-specific tab components (ManualCssTab, VersionTab, SettingsTab)
- Add WP store adapter, App shell and WpSidebar
- Add admin-app scaffold — configurator-based WP panel infrastructure
- Unify palette generator + on-color usage preview
- In-context WCAG resolution + color locks
- Bring configurator-parity CSS export to the WP panel

### Changed

- Generate palettes in OKLCH, not HSL
- Share WCAG/scale/font logic with the configurator + DX polish

### Fixed

- Exclude synced and compiled css from stylelint
- Three correctness bugs in admin-app and REST controller
- Wp coding standards — multiline array and aligned assignment in class-token-page.php
- Payload wrapper, parseCssOverrides import, a11y toggle, duplicate sync, constants guard
- Guard against path traversal in sync-core.mjs (CodeQL)
- Address self-review of the WCAG checker + generator
- A11y + robustness from review feedback
- Derive FontFamilyField source to clear state_referenced_locally

## [0.1.2] - 2026-06-08

### Changed

- Clear residual PHPCS warnings and the PHPStan baseline
- Adopt full WordPress coding standard and tighten PHPStan

### Fixed

- Remove duplicate import in WcagTab, add actions:read to CodeQL

## [0.1.1] - 2026-06-08

### Changed

- Settings page rebuilt: bundle cards, version rollback UI, renamed menus, merged tab
  layout for a cleaner admin experience
- Tab consolidation: Bundle and Hooks settings migrated from Svelte SPA to PHP-rendered
  tab; WCAG palette optimizer added to color admin

### Fixed

- Correct stale `SLASHED_VERSION`, `SLASHED_BRICKS_VERSION`, and
  `SLASHED_GUTENBERG_VERSION` constants that did not match the WordPress plugin header
- Release workflow: handle pre-existing GitHub Releases without erroring; add
  `workflow_dispatch` retry support so the zip can be rebuilt without re-pushing the tag

### Infrastructure

- Contributor scaffolding: `CONTRIBUTING.md`, Git commit-msg and pre-push hooks,
  Dependabot config, issue/PR templates, `SECURITY.md`
- Dependency updates: `actions/checkout` v4 → v6, `actions/setup-node` v4 → v6,
  `peter-evans/create-pull-request` v7 → v8, Svelte and vite-plugin-svelte

## [0.0.1] - 2026-06-08

First standalone release. Bundles the Bricks Builder and Gutenberg integrations
previously developed in the SLASHED framework repo.

### Bricks Builder Integration — Initial Development (PRs #60–74)

- **#60** — add generic flat bundles, drop bricks-branded bundle
  > Replaces the single bricks-branded flat bundle with a generic *.flat.css sibling for every tier, and produces them in dist/.
- **#61** — add generic flat bundles, replace bricks-branded bundle
  > Adds generic *.flat.css bundles for every tier, replacing the single bricks-branded flat bundle.
- **#71** — add Bricks Builder integration plugin
  > Adds a WordPress plugin at integrations/bricks/ that natively integrates SLASHED with Bricks Builder, providing the same type of in-builder experience
- **#74** — use jsDelivr CDN as default CSS source for Bricks
  > Changes the default CSS source for the Bricks Builder integration plugin to load from jsDelivr CDN instead of requiring local files.
- **#81** — inject all framework classes and variables into Bricks UI
  > The Bricks integration was supposed to populate the Bricks Builder UI with every SLASHED token and class so users get a complete picker / autocomplete
- **#83** — separate color palette + HEX picker + Contrast tab in admin
  > Three GUI/integration improvements to the SLASHED ↔ Bricks integration, addressing user feedback (PL):
- **#84** — register variables/classes via canonical options and stop CSS bleed into builder UI
  > Fixes two bugs in the Bricks integration that were surfacing together:
- **#92** — use official bricks/builder/color_palette filter for color injection
  > The previous option_bricks_color_palette filter only fires when WordPress

### Admin Panel & API Coverage (PRs #97–127)

- **#97** — resolve color swatches + add HTML font-size option
  > Fixes two issues with the SLASHED for Bricks plugin:
- **#98** — expand admin panel to full API + add cheatsheet tab
  > Expands the Svelte 5 admin SPA (integrations/bricks/admin-app/) to cover the entire SLASHED Bricks plugin public API and adds a comprehensive Cheatshe
- **#103** — sync Bricks color palette with admin-saved overrides
  > Fixes the disconnect between admin-saved color customizations and the Bricks Builder color palette swatches.
- **#105** — port remaining 7 token tabs to Svelte admin SPA
  > Bring the Svelte v2 admin SPA (SLASHED → Tokens (v2)) to functional parity with the legacy jQuery admin page (SLASHED → SLASHED), so the next PR can p
- **#106** — extract Token_Store / Token_Sanitizer / Tab_Registry helpers
  > Extracts the data-layer pieces of class-admin-page.php into three small, stateless helper classes so the Svelte SPA, the REST controller, and the lega
- **#108** — promote Svelte SPA to the primary admin slug
  > Promotes the Svelte SPA to the primary admin page (top-level "SLASHED" menu, slug slashed-bricks). Moves the legacy jQuery form behind an opt-in filte
- **#109** — remove the legacy jQuery admin page
  > Final PR of the migration: deletes the legacy jQuery admin page, the transitional opt-in filter, and the Slashed_Bricks_Admin_Page class entirely. The
- **#114** — bridge data-brx-theme to SLASHED theme system
  > Adds a CSS-only bridge in the Bricks integration plugin that maps Bricks' data-brx-theme attribute to SLASHED's theme system.
- **#116** — resolve REST 404 and add dark mode colors
  > Fixes three issues in the Svelte admin app:
- **#119** — add Export CSS button to admin panel
  > Adds a client-side CSS export feature to the Bricks admin panel so users can download a slashed-custom.css file containing only their non-default toke
- **#120** — remove dead constructor hook + document sanitizer contract
  > Follow-up to #116 (merged). Addresses two non-blocking review findings:
- **#122** — add CSS export functionality (rebased)
  > Rebased PR #119 (feat/export-css) onto current main (which now includes PRs #116, #117, #120). All merge conflicts resolved.
- **#127** — auto-bundle WordPress plugin zip in dist folder
  > Adds automatic packaging of the "SLASHED for Bricks" WordPress plugin into a distributable zip (dist/slashed-bricks.zip) as part of the standard build

### reBEMer Implementation (PRs #124–132)

- **#124** — add reBEMer — subtree BEM class manager for the Bricks structure panel
  > - Five operation modes: Add, Rename, Replace, Add Modifier, Migrate ID styles.
- **#125** — reBEMer MVP — subtree BEM class manager
  > Stripped-down MVP of reBEMer: add/rename/replace BEM classes for an element and its children via the Bricks Builder structure panel.
- **#129** — natural-sort palette so -50 lands before -500 + reBEMer design refinements
  > Two related changes from this design-review pass:
- **#132** — hover-only badge that matches Bricks action-icon size
  > Three small fixes to the reBEMer badge in the Bricks structure panel:

### Bundle Selection & REST API (PRs #134–157)

- **#134** — CSS bundle selector in admin panel, remove legacy admin page
  > - Add css_bundle plugin setting (essential / optimal / full) so admins
- **#142** — Add token export/import and Bricks template workflow
  > - REST: GET /tokens/export returns all token overrides + plugin settings
- **#157** — REST validation, stale detection, and class hints
  > - REST validation endpoint — POST /slashed-bricks/v1/tokens/validate runs Token_Sanitizer on submitted values without saving; returns { section, sanit

### Bricks Font Manager & Builder Integration (PRs #163–180)

- **#163** — include Google Fonts from Bricks font manager in Bricks tab
  > - The bricks-fonts REST endpoint was only probing bricks_custom_fonts (uploaded fonts) and bricks_adobe_fonts. Fonts added via Bricks > Settings > Goo
- **#164** — use title as family name fallback for Bricks custom fonts
  > Fonts added via Bricks > Settings > Custom Fonts (including Google Fonts downloaded for local serving) store the CSS family name only in title — no se
- **#170** — builder-agnostic CSS delivery and de-Bricks admin UI
  > SLASHED is a CSS framework, not a Bricks tool. This PR makes the core CSS delivery work on any WordPress site — custom theme, classic theme, or no pag
- **#171** — builder-agnostic architecture, global token infrastructure, Bricks CPT font fix
  > - Move token infrastructure to global includes/ — Slashed_Token_Store, Slashed_CSS_Generator, Slashed_CSS_Loader, Slashed_Token_Page, and REST control
- **#172** — builder-aware admin UI and fix Bricks Font Manager fonts in dropdown
  > - Fix Bricks Font Manager fonts missing in dropdown — fonts created via the new Font Manager start as post_status = 'draft' and were excluded by the p
- **#173** — Fix Bricks font tab always visible + WCAG oklch color resolution
  > - Bricks font tab always shows when the Bricks integration is enabled — the tab is no longer hidden if no fonts are registered yet; instead it shows a
- **#174** — Fix fatal error when opening Bricks editor (Slashed_Token_Page not found)
  > - Slashed_Token_Page::get_class_hints() is called from Slashed_Bricks_ReBEMer_Enqueue::enqueue() on the wp_enqueue_scripts hook — a frontend hook that
- **#176** — Gutenberg CSS bleed into Bricks editor + dark mode toggle + misc
  > - Bricks editor CSS bleed: Slashed_Gutenberg_Enqueue::enqueue_frontend_styles() lacked a bricks_is_builder_main() guard. In the unified plugin both in
- **#177** — Show class hints in Bricks editor
  > This PR implements "Show class hints" in the Bricks editor. When enabled in the SLASHED plugin settings, hovering over a SLASHED class (sf-* or is-*) 
- **#178** — restore sf-container max-width overridden by Bricks generic selector
  > Bricks emits [class*=brxe-] { max-width: 100% } as unlayered author CSS. SLASHED's container classes live inside @layer slashed.layout, and unlayered 
- **#180** — class documentation tooltips in builder
  > Completes the class documentation tooltips feature for the Bricks integration. All the data/admin/PHP plumbing already existed on main (generator → da

### SF Colors Panel & Polish (PRs #182–212)

- **#182** — skip color-palette injection on Bricks 2.2+ Color Manager
  > Dark/light mode silently breaks for SLASHED colors in Bricks 2.2+. Bricks 2.2's new Color Manager materializes every color-palette entry into :root as
- **#184** — add color swatches to variable-picker dropdown
  > Restores colour swatches in the Bricks builder without re-introducing the dark-mode bug that #182 fixed. Closes the follow-up tracked in #183.
- **#189** — add missing *-strong status swatches to variable-picker hex map
  > The five status *-strong tokens appeared as plain text in the Bricks variable-picker dropdown while every other variant for the same family (-subtle, 
- **#190** — complete color swatch coverage in variable picker
  > - Add hex entries for all 11 --sf-color-{family}-light source tokens (previously the resolver read them as inputs but never wrote them to the hex map,
- **#191** — Bricks swatch coverage + lightweight CSS normalize
  > - Add hex entries for all 11 --sf-color-{family}-light source tokens — the resolver read them as inputs but never wrote them to the hex map, leaving c
- **#193** — add in-builder Color System panel with light/dark preview
  > A floating Color System panel for the Bricks builder, launched from a
- **#195** — Add SF Colors button to Bricks colour fields for quick variable access
  > This PR adds a contextual "SF Colors" button to Bricks colour input fields, allowing users to quickly insert SLASHED color variables directly into any
- **#202** — SF Colors panel — pick flow, icon, and remove Color Manager palette injection
  > - Remove class-colors.php — the class injected SLASHED tokens into Bricks' Color Manager as static hex values, overriding the framework's adaptive lig
- **#206** — prevent focus-steal that closed border/box-shadow colour picker
  > For border and box-shadow controls, Bricks renders the colour input inside
- **#208** — SF colour panel broken for border/box-shadow + missing admin inputs
  > - SF colour panel — border/box-shadow fix: clicking a swatch closed the Bricks settings panel and showed "input not found" for border and box-shadow c
- **#212** — remove SF colour border/box-shadow fixes
  > - Reverts the three SF colour border/box-shadow fix commits (93da924, cafa170, 18303c0) that were introduced to handle event-ordering issues with Bric

### Class Manager & Final Polish (PRs #227–258)

- **#227** — lock framework classes by default in Class Manager
  > Adds a lock_framework_classes plugin setting (default: true) so all
- **#230** — emit brand `base` token in CSS export + color overrides; de-dupe font collector
  > Focused re-audit of plugins/SLASHED-for-WP. Most prior High/Medium audit items were already resolved (CSS-generator allowlist validation, slashed.php 
- **#231** — Refresh Bricks fonts dropdown on mount via REST endpoint
  > Previously bricksFonts was a const read once from the PHP bootstrap
- **#238** — translate Bricks workflow to English, fix stale facts, trim redundancy
  > A documentation/comment cleanup pass across the repo: ensure everything is in English, fix factual claims that had drifted from the source, and trim g
- **#258** — Refactor bundle settings and improve Bricks font CPT handling
  > This PR refactors the CSS bundle selection UI, improves Bricks Font Manager CPT compatibility, and adds support for legacy color fallback tokens. The 

---

*Generated from 54 merged PRs — auto-updated by release workflow on each tag push*
