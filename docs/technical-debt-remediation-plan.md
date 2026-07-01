# Remediation plan — SLASHED + SLASHED-Plugins technical debt audits

Companion plan to the audits:
- `docs/technical-debt-audit.md` (this repo) — 34 findings (SL-001..SL-034)
- `SLASHED-Plugins/docs/technical-debt-audit.md` — 37 findings (PL-001..PL-037)

## Context

A full 9-dimension technical-debt audit was completed and committed to both repos on branch `claude/codebase-audit-protocol-qr7xrn`:
- `/home/user/SLASHED/docs/technical-debt-audit.md` — 34 findings (SL-001..SL-034)
- `/home/user/SLASHED-Plugins/docs/technical-debt-audit.md` — 37 findings (PL-001..PL-037)

The goal is to fix **all 71 findings**, delivered as **multiple themed PRs per repo** (not one giant PR, not one-commit-per-finding), with **SLASHED's framework-level fixes landed first**, then **SLASHED-Plugins syncs the vendored copy** (`npm run sync` pulls `SLASHED/configurator/src` into `SLASHED-for-WP/admin-app/src`) before Plugins-only work proceeds — except anything in Plugins that's fully independent of the vendored code (the Critical broken-CI-script bug, the Bricks/Gutenberg color-model drift bug, and the two `.syncignore`'d plugin-specific files), which ships immediately regardless of SLASHED's status.

This plan was validated by a design-review pass that read the actual source files (not just the audit prose) and corrected several assumptions along the way — notably: `stripComments` vs `maskComments` in the scripts/ dedup work are **not** interchangeable (one preserves character offsets for line-number reporting, one doesn't); `npm run verify` in SLASHED-Plugins does something entirely unrelated to what the missing `npm run check` is documented to do, so PL-025 requires **authoring a new script**, not redirecting to an existing one; the target environment has no MySQL, so the new PHP test suite (PL-006) should use **Brain Monkey**, not the official WP core test scaffold. All three corrections are folded into the plan below.

One finding, **PL-009** (`readme.txt`'s `Tested up to: 7.0`), is internally self-consistent and not provably wrong — it is **deferred as a maintainer question**, not auto-fixed in any PR.

## Sequencing overview

```
SLASHED (parallel except noted):
  PR1 (CSS cleanup), PR2 (docs/test hygiene), PR3 (scripts dedup) — independent, any order
  PR4 (codec.ts readability) ─┐ parallel-safe (both touch App.svelte, non-overlapping lines)
  PR5 (configurator UX/deps)  ─┘
  PR6 (preview debounce)      — after PR5
  PR7 (configurator test coverage) — after PR4, PR5, PR6

SLASHED-Plugins Wave 0 (ship immediately, no dependency on SLASHED):
  PR-B1 (color-model -dark fix), PR-C1 (fix broken CI script + doc drift),
  PR-C3 (plugin-specific frontend hardening), PR-C4 (wire playwright-admin.js into CI)

SLASHED-Plugins Wave 1 (sync):
  PR-SYNC — after SLASHED PR4 + PR5 + PR6 merge to main (NOT PR7 — its tests aren't vendored)
            — benefits from PR-C1 already landed (reuses its new drift-check)

SLASHED-Plugins Wave 2 (independent of sync, parallel with Wave 1 or after):
  PR-A1 (PHP hardening), PR-A2 (PHP architecture, low priority), PR-A3 (PHPUnit suite),
  PR-B2 (integrations hardening + Gutenberg README), PR-B3 (apply.js tests),
  PR-C2 (sync mechanism hardening — after PR-C1, same file), PR-C5 (build-artifact policy)

Deferred: PL-009 — resolve via a direct question to the maintainer, not a PR.
```

---

## SLASHED

### PR1 — CSS source cleanup (SL-001..005)
Independent, any order, low risk.
- **SL-001**: don't unify the duplicated dark/light OKLCH formulas (`core/tokens.css:361-421` vs `core/themes.css:77-165`) without maintainer input on intent (see open question) — add a cross-link comment in both files for now.
- **SL-002**: doc-comment only, above `.sf-clickable-parent` (`core/accessibility.css:166-183`).
- **SL-003**: grep `core/**/*.css` and `configurator/src/**` for `var(--sf-is-dark)` reads before touching anything — prefer strengthening the "internal only" comment over renaming a public custom property.
- **SL-004/005**: mechanical — match `core/tokens.css`/`core/macros.css`'s existing section-comment style in `core/layout.css`; consolidate the repeated `@container` hardcoded-breakpoint explanation into one comment near the top of the file.

**Verify:** `npm run lint:css && npm run build && npm test` — diff of `core/` should be comment-only.

### PR2 — Docs & test hygiene (SL-014, 027-034)
Independent, parallel-safe with PR1.
- **SL-027/028**: rename `tests/coverage.spec.js` → `coverage.test.js` (confirm no Playwright fixtures used first), add to `pretest`/`test:unit` in `package.json` alongside existing `tier1-p*.test.js` entries, add a one-line convention note in `tests/`.
- **SL-029**: reorder README's à-la-carte `<link>` example to match `core/layers.css:6-20`'s real `@layer` order.
- **SL-030**: annotate `docs/llm-guide.md:63`'s `optional/utilities.css` line with the same `(staged — commented out, not yet active)` wording README already uses.
- **SL-031**: retitle `docs/migration.md:6` to the version range that actually shipped, matching other headers in the file.
- **SL-032**: add one comment explaining the tier-numbering gaps in `tests/tier1-p*.js`; don't renumber.
- **SL-033**: diff the 3+ duplicated `page.setContent(...)` blocks character-by-character before extracting a shared `renderWithBundle(page, html, bundle)` helper — parameterize rather than force uniformity if they differ.
- **SL-034**: add a small `tests/fluid-scale.spec.js` (low priority, keep minimal).
- **SL-014**: add the 16 missing script rows to CLAUDE.md's "Key scripts" table, prioritizing the two CI gates (`check:macros`, `check:registry`).

**Verify:** `npm run test:unit && npx playwright test && npm run check:llm-guide && npm test`.

### PR3 — Build script hardening (SL-006..013)
Independent, **highest technical risk** in this wave.
- **Do SL-007 first**: extract `scripts/lib/parse.js`. Confirmed `stripComments` (used in `audit.js:42`, `check-macro-catalog.js:43`, `gen-token-index.js:42`) removes comments and collapses length, while `gen-api-index.js:124`'s `maskComments` blanks characters in place to **preserve offsets** for line-number reporting — export both as distinct named functions, do not merge them. Same caution applies to `readFile`/`readValue` variants across `audit.js`, `gen-api-index.js`, `gen-token-reference.js`, `version-sync.js` — diff behavior before consolidating any pair.
- **SL-006**: split `gen-api-index.js` (859 lines) along its existing section-comment boundaries into `scripts/lib/api-index/extract.js` + `render.js`, after SL-007's lib extraction so it isn't done twice.
- **SL-010 + SL-012**: add a minimal hand-rolled shape/size-sanity check before the three `fs.writeFileSync` sites (`gen-api-index.js:847`, `gen-token-registry.js:133`, `gen-token-index.js:137`) — no new dependency needed.
- **SL-008/009/011/013**: comment/doc-only additions — no restructuring (audit itself says "not urgent at this scale").

**Verify (this is the load-bearing check for this PR):**
```bash
cd /home/user/SLASHED
npm run docs && cp docs/api-index.json token-registry.json "$TMPDIR/audit-verify-before/"
# apply the refactor
npm run docs
diff "$TMPDIR/audit-verify-before/api-index.json" docs/api-index.json        # must be empty
diff "$TMPDIR/audit-verify-before/token-registry.json" token-registry.json   # must be empty
npm run check:macros && npm run check:registry && npm run check:llm-guide && npm run audit:check && npm test
```
If either diff is non-empty, bisect by reverting one script's import at a time — regex changes here fail silently, not loudly.

### PR4 — Configurator codec.ts readability & type-safety (SL-016, 017, 024, 026)
Parallel-safe with PR5. Must land before PR7.
- **SL-016/026**: rename internal 1-2 letter symbols (`Wa`, `Ra`, `za`...) to their already-existing readable names — confirmed present as export aliases at `configurator/src/lib/codec.ts:283-292` (`encode`, `decode`, `sanitizeValue`, `generateCSS`, `parseCSS`, `encodeOverrides`, `buildShareUrl`, `readShareFromHash`). **Keep the public export surface unchanged** — only rename internals. Use IDE scope-aware rename, not find/replace, to avoid touching string/wire-format literals.
- **SL-017/024**: add `TokenRegistry`/`ApiIndex`/`DecodeOptions` interfaces once in `configurator/src/lib/types.ts` (extending the existing `SlashedToken`), replace the 7 `any`-typed sites at `codec.ts:73,115,257,277`, `App.svelte:16`, `CheatsheetPanel.svelte:11,20,31`.

**Verify:** `npx tsc --noEmit && npx svelte-check --tsconfig ./tsconfig.json && npm run test:unit` (codec.test.js/css.test.js/share.test.js must pass unchanged) — run incrementally per-rename, not just at the end.

### PR5 — Configurator correctness, UX & dependency cleanup (SL-015, 018, 019, 021, 022, 025)
Parallel-safe with PR4. Before PR6/PR7.
- **SL-018** (top priority): in `configurator/src/App.svelte:109-112`, add `'error'` to the `saveState` union, set it in the catch instead of reverting to `'idle'`, and add a render branch in `StudioHeader`/status-bar mirroring its existing `'saved'` state. **Requires a manual `npm run dev` check** — a type-only union change passes `tsc` even if the UI has no render branch for it.
- **SL-019**: reuse `savedThemes.ts:13-40`'s existing shape-guard for `persistence.ts:217-220`'s unguarded `JSON.parse(local)` — import the guard, don't duplicate it.
- **SL-015**: extract `isOverridden(overrides, name)` into `lib/`, replace ~15 call sites across `ColorsPanel.svelte`, `BordersPanel.svelte`, `AllTokensTab.svelte`, `GenericTokenPanel.svelte` — confirm `name in overrides` and `overrides[name] !== undefined` are truly equivalent here (no key ever explicitly set to `undefined`) before collapsing both idioms into one helper.
- **SL-021**: re-grep for `motion` imports immediately before removing from `configurator/package.json`; `npm install` to update the lockfile.
- **SL-022**: migrate `lucide-svelte` → `@lucide/svelte` file-by-file (not one mechanical batch) across the ~9 confirmed files, building after each since the two packages' API surface isn't guaranteed identical.
- **SL-025**: doc-comment only, near `previewResolver.svelte.ts:34`'s module-level `$state` singleton.

**Verify:** `npx tsc --noEmit && npx svelte-check ... && npm run test:unit && npm run test && npm run test:e2e && npm audit`, then `cd /home/user/SLASHED && npm run check:version` (CLAUDE.md requires this after touching `configurator/package.json`).

### PR6 — Configurator preview debounce (SL-020)
After PR5.
- `previewResolver.svelte.ts` has an existing comment warning `bumpPreviewVersion()` must stay a pure write with no reactive read (avoids an `effect_update_depth` infinite loop) — any debounce must preserve this. Coalesce at the call site in `PreviewPanel.svelte:515-548` (rAF-coalesce-to-latest), not inside `previewResolver.svelte.ts` itself.
- Explicitly out of scope: `persistence.ts`'s separate `injectLivePreview` call path has no debounce either, but that's a different path — not fixed here (it's fixed independently in SLASHED-Plugins' PR-C3 for the frontend-overlay case).

**Verify:** `tsc`/`svelte-check`/`test:unit`/`test:e2e`, plus **manual**: `npm run dev`, drag a slider rapidly, confirm smooth updates, no console errors about effect loops, and the settled value after release exactly matches the last dragged position (no dropped trailing frame).

### PR7 — Configurator test coverage buildout (SL-023)
Last — after PR4, PR5, PR6.
- Tooling already present: `vitest`, `@testing-library/svelte`, `jest-dom`, `jsdom` are already in `configurator/package.json` devDependencies; a `test:components` script already exists (`configurator/tests-components/header.test.js` is the only current example — follow its pattern).
- Priority 1: `persistence.ts` — `loadInitialOverrides`/`saveOverrides` in both standalone (localStorage) and WP-embedded (REST) branches, plus the malformed-localStorage case (closes the loop on PR5's SL-019 guard). Follow `codec.test.js`/`css.test.js`'s existing structure.
- Priority 2: `previewResolver.svelte.ts` resolution/caching, including confirming PR6's debounce still invalidates `resolveCache` correctly without looping.
- Priority 3: component tests for `SliderRow`/`TokenRow` (bind → override-set → reset) via `@testing-library/svelte`; query by role/label, not CSS class.
- A save-error-state test closing PR5's SL-018 loop.

**Verify:** `npm run test:unit && npm run test:components && npm run test && npx tsc --noEmit && npx svelte-check ...`.

---

## SLASHED-Plugins

### Wave 0 — ship immediately

**PR-B1 — Fix color-model `-dark` filter drift + regression tests (PL-013, 014, 015)**
- `SLASHED-for-WP/integrations/bricks/editor-app/src/lib/color-model.js` (~line 140): change `if (suffix === 'light') return null;` to also check `'dark'`, matching Gutenberg's already-correct JS. Also port Gutenberg's `Array.isArray` guards (lines 377/380) into Bricks' `filterModel`, which is missing them.
- `SLASHED-for-WP/integrations/gutenberg/includes/class-presets.php` (~line 337): same fix, `'light' === $suffix` → also check `'dark'`.
- PL-015: add a cross-implementation regression test. Since PHP can't be imported into `node:test` directly and PR-A3 (PHPUnit) hasn't landed yet, shell out via `execSync('php -r ...')` against a shared fixture set for now; leave a comment noting eventual migration into the PHPUnit suite once PR-A3 exists.

**Verify:** `node --test tests/color-model.test.js tests/*.test.js && composer phpstan && vendor/bin/phpcs ... && npm test`.

**PR-C1 — Fix broken CI script + related doc drift (PL-025, 033, 036, 037)**
This is **not** a simple redirect. `scripts/verify-sync.js` (the closest existing script) only checks version-metadata consistency — a different concern from what README.md:74/CONTRIBUTING.md:34 claim `npm run check` does ("admin-app drift + cheatsheet coverage"). Git history confirms `check` never existed in this repo.
- Author a genuinely new `scripts/check.js` that runs, in sequence: `gen-class-hints.js --check` and `gen-variables-hints.js --check` (both already support a `--check` flag, confirmed), plus a new `--check`/`--dry-run` mode added to `admin-app/scripts/sync-core.mjs` that performs the same `.syncignore`-aware file resolution but diffs/hashes against the current `admin-app/src/` instead of writing, exiting non-zero on drift.
- Add `"check": "node scripts/check.js"` to root `package.json` — `framework-sync.yml:50` already calls it correctly, no workflow change needed once the script exists.
- **PL-036**: fix CLAUDE.md's `npm run sync` references to `npm --prefix SLASHED-for-WP/admin-app run sync` (the script only exists there, not at root).
- **PL-033**: trim `.syncignore`'s stale PR-#443 historical framing, same commit as PL-036.
- **PL-037**: add `docs/`, `tests/`, `SECURITY.md`, `CONTRIBUTING.md`, `phpstan.neon.dist`/`phpcs.xml.dist` to CLAUDE.md's structure diagram.

**Verify:** `node scripts/check.js && SLASHED_FRAMEWORK_DIR=/home/user/SLASHED npm run check && npm test && npm run verify && npm run lint`. **Critical manual step**: hand-edit one non-`.syncignore`'d vendored file to introduce throwaway drift and confirm the new check catches it (exits non-zero) — this is the single most important verification here. Also confirm the `--check` mode of `sync-core.mjs` never writes to disk.

**PR-C3 — Plugin-specific frontend hardening (PL-029, 030, 031)**
Both files are the only two `.syncignore` entries — zero interaction with the sync wave.
- **PL-029**: read `class-frontend-configurator.php:83-91`'s actual `esc_url_raw()` usage first, then add a same-origin/scheme check before `plugin-main.ts:36-51` injects `<link>` from `window.slashedApp?.cssUrl` — don't over-restrict against a legitimate case the server already allows.
- **PL-030**: add a `.d.ts` ambient declaration for `window.slashedApp`, sourced field-for-field from the real PHP `wp_localize_script` payload.
- **PL-031**: `AppOverlay.svelte:106-113`'s `$effect` calling `injectLivePreview` on the live frontend has no debounce and is **not** covered by SLASHED's PR6 (different call path — `persistence.ts`'s `injectLivePreview`, not `PreviewPanel.svelte`'s). Add a local rAF-coalesce directly in this PR.

**Verify:** `npx tsc --noEmit && npx svelte-check ... && npm run build:admin-app && npm test`, plus manual check on a live/local WP frontend: rapid override edits should produce exactly one eventual update per edit, no jank, no dropped edits.

**PR-C4 — Wire `playwright-admin.js` into CI (PL-034)**
- Read the file first to confirm what it actually needs (likely `@playwright/test` + a built/running admin instance) before wiring it into `npm test`'s `node --test tests/*.test.js` glob (would break if forced in). Rename to `playwright-admin.test.js` and add a dedicated script/CI step if the infra is available; if it needs infra not present here or in CI, rename + document + leave a CI TODO rather than force a false-green wiring.

**Verify:** `head -30 tests/playwright-admin.js` to confirm framework/deps, then attempt `npx playwright test tests/playwright-admin.test.js`; `npm test` must still pass unaffected.

---

### Wave 1 — sync (after SLASHED PR4, PR5, PR6 merge — not PR7, since its new tests aren't vendored)

**PR-SYNC — Sync vendored framework fixes**
1. `SLASHED_CONFIGURATOR_SRC=/path/to/updated/SLASHED/configurator/src npm --prefix SLASHED-for-WP/admin-app run sync`.
2. Confirm `.syncignore` respected (`git diff` shows zero changes to `plugin-main.ts`/`AppOverlay.svelte`).
3. **Manual cross-check required** (these two files consume vendored exports without being overwritten): confirm PR4's codec rename kept its export surface identical (tsc should show nothing); confirm `AppOverlay.svelte`/`plugin-main.ts` handle PR5's new `saveState: 'error'` gracefully if they branch on it; confirm PR6's debounce plus PR-C3's separate local debounce don't compound into excessive lag (manual check on live frontend).
4. Commit the vendored diff as its own commit referencing the upstream SLASHED commit/PR, matching this repo's existing "chore: sync framework..." convention.
5. Run PR-C1's new `npm run check` drift sub-check immediately after, to confirm the sync fully completed.

**Verify:** `git status`/`git diff --stat` on `admin-app/src/`, `npm run build:apps`, `npm run check`, `npm test`, `npm run verify`, `cd SLASHED-for-WP/admin-app && npx tsc --noEmit`, plus manual: force a save failure (confirm new error UI) and rapid token edits on both admin UI and frontend overlay.

---

### Wave 2 — Plugins-only, independent of sync

**PR-A1 — PHP backend hardening (PL-002, 004, 005, 007, 008, 010, 012)**
- **PL-002**: return `WP_Error`/400 at `class-rest-controller.php:296-299` when *all* submitted overrides are rejected — this is the server-side half of SL-018's client-side error-state fix.
- **PL-004/005**: add `rest_sanitize_boolean` callbacks and `additionalProperties` shape constraints to the REST route schemas at `class-rest-controller.php:60-114` and `:107-110`, mirroring the existing `overrides` route's pattern.
- **PL-007**: wrap `build_family_scales()` in a transient keyed by the overrides hash, mirroring the existing CSS-parsing cache's transient pattern.
- **PL-008**: add `WP_DEBUG`-gated `error_log()` at `class-css-loader.php:57-58` and `class-inventory.php:744-761`.
- **PL-010**: extract the `html_font_size` allowlist to a `Slashed_Token_Store::ALLOWED_HTML_FONT_SIZES` constant, mirroring the existing `ALLOWED_CSS_BUNDLES` pattern; update both call sites.
- **PL-012**: leave `flush()` as intentional public API, note it as PR-A3's future test target.

**Verify:** `composer phpstan && vendor/bin/phpcs && php -l <touched files> && npm test`. PL-002 is the riskiest change here (a previously-silent-success path now returns 400) — double check no other caller relies on the old behavior.

**PR-A2 — PHP backend architecture cleanup, low priority (PL-001, 003, 011)**
- **PL-001**: add internal section-comment banners to `class-color-resolver.php` (876 lines) instead of splitting it — audit's own recommendation is conditional on future growth.
- **PL-003**: type only methods actually touched by this PR and PR-A1 — not a big-bang pass across ~145 methods. Re-run `composer phpstan` after each newly-typed method, since new types can surface real bugs phpstan couldn't previously see.
- **PL-011**: one-line docblock cross-reference at `class-rest-controller.php:296`, no rename/extract.

**Verify:** `composer phpstan && vendor/bin/phpcs && php -l ... && npm test`.

**PR-A3 — PHPUnit test suite (PL-006, 035)**
Confirmed: no MySQL in this environment, no PHPUnit in `composer.json` today, PHP 8.4 CLI available. **Use Brain Monkey** (mocks WP core functions, no DB/bootstrap needed) rather than the official WP core test suite — matches the audit's priority targets, which are pure-logic-plus-WP-function-call surfaces.
- Add `phpunit/phpunit:^9` (PHP 7.4-compatible; v10+ drops 7.4) and `brain/monkey:^2` to `composer.json` `require-dev`.
- Add `phpunit.xml.dist` at repo root (alongside `phpstan.neon.dist`/`phpcs.xml.dist`), `tests/php/bootstrap.php` + a base TestCase wrapping `Brain\Monkey\setUp()`/`tearDown()`.
- Priority targets: `validate_override_value()`, `sanitize_rebemer_element_map()`, `Slashed_Token_Store` round-trips, and PL-035's `POST /wp-json/slashed/v1/tokens/validate` handler specifically (roadmap.md claims it's "shipped" with zero test evidence).
- Add a `composer test`/`vendor/bin/phpunit` entry point, kept separate from `npm test` (PHP and Node toolchains stay independently invoked). Add a CI step reusing `framework-sync.yml`'s existing `shivammathur/setup-php` pattern.
- Document Brain Monkey's mock-based scope/limits (no real DB/capability integration) in a short `tests/php/README.md` so future contributors know what the suite does and doesn't cover.

**Verify:** `composer require --dev ...`, then `composer phpstan` (check whether `tests/` needs excluding from analysed paths), `vendor/bin/phpcs` (may need a tests-directory exclusion), `vendor/bin/phpunit`, `php -l` on all new test files.

**PR-B2 — Integrations hardening + Gutenberg README (PL-017, 018, 019, 020, 021, 022)**
- **PL-017**: write `integrations/gutenberg/README.md` using Bricks' README as a template, adapted for Gutenberg's actually-different architecture (no REST routes, `wp_localize_script`/`theme.json`).
- **PL-018/019**: add `console.warn` on the identified silent-failure branches (`bricks-api.js:294-307`, `apply.js:112-118`, `panel.js:464-470`) without changing existing return/catch behavior.
- **PL-020**: comment only — no memoization until profiling shows it matters (per audit).
- **PL-021**: read what `class-rebemer-rest.php` (accepts `bricks_full_access` OR `manage_options`) and `class-fonts-rest.php` (requires `manage_options` only) actually gate before deciding which direction to align — this is a real access-control change, not cosmetic. Extract a shared `Slashed_Bricks_REST_Base::check_permissions()` regardless of the chosen direction.
- **PL-022**: extend `verify-sync.js`'s existing `inventory.json`-comparison pattern to also warn (not hard-fail) on `svelte`/`vite`/`svelte-check`/`typescript` version drift between `integrations/bricks/editor-app/package.json` and `admin-app/package.json`.

**Verify:** `npm run lint:php && composer phpstan && vendor/bin/phpcs && npm --prefix SLASHED-for-WP/integrations/bricks/editor-app run build && npm test && npm run verify`. Manual: test both REST routes with a user having `bricks_full_access` but not `manage_options` (and vice versa) to confirm PL-021's chosen behavior matches intent.

**PR-B3 — Bricks `apply.js` test coverage (PL-016)**
- Verify whether `applyToSubtree` performs live DOM mutations directly or only computes a plan before assuming full unit-testability — prioritize `buildPlan()`'s plan-generation logic (self-documented pure, highest complexity/blast-radius) regardless. Build representative Bricks element-tree fixtures, following `tests/color-model.test.js`'s `node:test` style. Keep any newly-exported helpers additive — don't restructure the module boundary as a side effect.

**Verify:** `node --test tests/apply.test.js && npm test && npm --prefix SLASHED-for-WP/integrations/bricks/editor-app run build`.

**PR-C2 — Vendoring/sync mechanism hardening (PL-024, 026, 027, 028, 032)**
Land after PR-C1 (both touch `sync-core.mjs` — avoid parallel edits to the same file; builds on PR-C1's new `--check` flag).
- **PL-024**: align `sync-configurator-core.yml`'s direct-push-to-main with `framework-sync.yml`'s PR-based model — re-read the workflow's own comments for deliberate rationale first; test via `workflow_dispatch` on a fork before trusting in production (a misconfigured PR step would silently stop the sync entirely, worse than today).
- **PL-026**: add `node:test` unit tests for `sync-core.mjs`'s file-selection logic, explicitly including a deliberately malicious `../`-containing input against the path-traversal/TOCTOU guards at lines 87-109/304-320.
- **PL-027**: differentiate 404 (file gone) vs 403 (rate-limited) log messages — logging change only, keep the existing fallback behavior.
- **PL-028**: replace rm-then-copy-in-place with copy-to-temp-dir-then-atomic-`renameSync`-swap — the one real correctness fix in this PR. Test explicitly: simulate a mid-copy failure and confirm `src/` is left in its original pre-sync state.
- **PL-032**: align `sync-core.mjs`'s import style with root scripts, folded in as a final mechanical pass.

**Verify:** `node --test SLASHED-for-WP/admin-app/scripts/*.test.js`, `sync-core.mjs --check`, a full real sync on a throwaway branch, `npm test`, `npm run verify`.

**PR-C5 — Build-artifact policy (PL-023)**
Implement only the near-term fix per explicit scoping — do **not** implement a release-time-build architectural change (that's a separate maintainer decision, restate it verbatim in the PR description as deferred).
- Create `.gitattributes` marking `SLASHED-for-WP/assets/admin-app/app.js`/`app.css` (and optionally `SLASHED-for-WP/dist/*.css`, same rationale) with `linguist-generated=true`, with a comment matching `.gitignore:11-13`'s existing tone.

**Verify:** `git check-attr linguist-generated -- <files>`, `npm run build:apps` (must be completely unaffected — diff-display-only change), `npm test`.

---

## Deferred — not auto-fixed

**PL-009** (`SLASHED-for-WP/readme.txt`'s `Tested up to: 7.0`) — internally consistent, not provably wrong, so no PR touches it. Resolve by asking the maintainer directly: *"Is `Tested up to: 7.0` accurate, or should it read the actual tested WP version?"* Once answered, fold the one-line fix into PR-C1's docs batch.

Also unresolved without maintainer input, addressed with a placeholder mitigation only: **SL-001**'s duplicated dark-mode formula (cross-link comment added, not unified) pending confirmation of whether the duplication is intentional.

## Overall rollout verification

After each wave, in addition to the per-PR checks above:
- SLASHED: `npm run check:version` and `npm run check:llm-guide` before any commit that touched `configurator/package.json`, `core/*.css`, `optional/*.css`, or `token-registry.json` (CLAUDE.md CI gates).
- SLASHED-Plugins: `composer phpstan`, `vendor/bin/phpcs`, `npm test`, `npm run verify` after every PR touching PHP or the sync tooling.
- Before merging PR-SYNC specifically: full manual pass through the WP admin configurator UI and the frontend overlay (save/load, error state, rapid slider drags) since this is the one PR that crosses the repo boundary and the two `.syncignore`'d files can't be verified by the sync script alone.
