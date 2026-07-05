# Roadmap

Bricks Builder and Gutenberg integrations. Framework-level items live in the
[SLASHED framework repo](https://github.com/codeslash-dev/SLASHED/blob/main/docs/roadmap.md).

## Before v1.0 — Bricks

- **reBEMer atomic apply** — route `applyPlan()` mutations through Bricks'
  element mutation API so Bricks' own Ctrl-Z treats the operation as one step;
  restore the pre-apply snapshot on mid-apply error. (Drops the in-panel undo
  ring buffer from scope.)
- **Inventory stale-detection** — weekly cron checks for a newer framework
  version; surfaces a dashboard widget. Skipped if a version is pinned.

## Post-1.0 — Gutenberg

- `--sf-*` → `--wp--custom--*` theme.json mapping for the Site Editor Global
  Styles UI.
- reBEMer parity (not scoped; currently Bricks-specific).

## Post-1.0 — Bricks

- **Token inheritance explorer** — show the full alias chain for any `--sf-*`
  token. Requires the inventory parser to track alias relationships.
- **Live design token playground** — `<iframe>` preview updating
  `document.documentElement.style` via `postMessage`, no reload, no persistence.

## Out of scope

- Per-page CSS bundle override — covered by the `slashed_bricks/css_bundle_url`
  filter.

The following are **permanently excluded** — deliberate architectural decisions
that mirror the framework's stance, not backlog. They should not be re-proposed
or picked up by accident:

- **A SCSS / preprocessor authoring field** — the plugin will not ship a "custom
  SCSS" input with mixins or functions. The framework is pure CSS with no compile
  step; configuration is done through token overrides plus a plain custom-CSS field,
  and native CSS features are the substitute.
- **Prefix-based automatic component styling** — the plugin will not auto-style
  arbitrary classes by name pattern. Components are explicit BEM classes (`.sf-*`)
  surfaced as builder presets; there is deliberately no "style anything matching this
  prefix" mechanism.
- **Viewport-breakpoint utility / mixin generation** — layout adapts through container
  queries and breakpoint-free techniques. Emitting a media-query breakpoint utility or
  mixin system is out of scope.
- **Generating a full utility-class library** — the plugin stays token- and
  primitive-first. Small, opt-in, token-backed helpers may be surfaced on demand, but
  emitting a broad utility-class surface is out of scope.

---

## Shipped (no longer tracked here)

- **Class documentation hints** — `?` icon beside each SLASHED class row in the
  Bricks class manager, gated by `show_class_hints`. *(shipped)*
- **REST token validation** — `POST /wp-json/slashed/v1/tokens/validate`
  dry-runs the sanitizer without saving. *(shipped)*
- **WCAG contrast tab** — AA/AAA ratios for every semantic fg/bg token pair,
  light and dark, built into the Design Settings SPA. *(shipped)*
- **Frontend design overlay** — click **/ Design** in the admin bar to edit
  tokens on any live page without leaving the site. *(shipped in 0.4.4)*
