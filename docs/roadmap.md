# Roadmap

Bricks Builder and Gutenberg integrations. Framework-level items live in the
[SLASHED framework repo](https://github.com/codeslash-dev/SLASHED/blob/main/docs/roadmap.md).

## Before v1.0 — Bricks

- **reBEMer atomic apply** — route `applyPlan()` mutations through Bricks'
  element mutation API so Bricks' own Ctrl-Z treats the operation as one step;
  restore the pre-apply snapshot on mid-apply error. (Drops the in-panel undo
  ring buffer from scope.)
- **Color contrast tab** — WCAG AA/AAA ratios for every semantic fg/bg token
  pair, light and dark, computed against the user's current saved overrides via
  `class-color-resolver.php`.
- **Class documentation tooltips** — info icon beside each SLASHED class row in
  the Bricks class manager, gated by a `show_class_hints` setting.
- **Inventory stale-detection** — weekly cron checks for a newer framework
  version; surfaces a dashboard widget. Skipped if a version is pinned.
- **REST token validation** — HTTP wrapper around `class-token-sanitizer.php`
  for inline admin-SPA validation.

## Post-1.0 — Gutenberg

- `--sf-*` → `--wp--custom--*` theme.json mapping for the Site Editor Global
  Styles UI.
- Token override admin UI (Svelte panel, parallel to Bricks). Until then,
  override via the `slashed_gutenberg/css_bundle_url` filter or a child theme.
- reBEMer parity (not scoped; currently Bricks-specific).

## Post-1.0 — Bricks

- **Token inheritance explorer** — show the full alias chain for any `--sf-*`
  token. Requires the inventory parser to track alias relationships.
- **Live design token playground** — `<iframe>` preview updating
  `document.documentElement.style` via `postMessage`, no reload, no persistence.

## Out of scope

- Per-page CSS bundle override — covered by the `slashed_bricks/css_bundle_url`
  filter.
