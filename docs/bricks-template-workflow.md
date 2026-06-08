# Bricks template workflow

Building and moving Bricks templates that render identically on every site
running the SLASHED plugin.

## Why templates break

Bricks stores values in template JSON in portable or non-portable forms:

| Value | Source | Portable |
|------|--------|----------|
| `var(--sf-color-primary)` | SLASHED palette in the colour picker | Yes |
| `#4a90e2` | Colour wheel / hand-typed | No — ignores brand tokens |
| `bricks-color-abc123` | Bricks "Global Colors" | No — site-specific ID, renders transparent elsewhere |

Same applies to spacing (`24px` vs `var(--sf-space-6)`), typography (`"Inter"`
vs `var(--sf-font-body)`), and SLASHED tokens — token overrides
(`slashed_bricks_tokens`) do **not** travel inside the Bricks JSON; export them
separately (Phase 2).

## Prerequisites (both sites)

- Bricks Builder ≥ 1.9.2
- SLASHED Bricks plugin active
- Same or higher CSS bundle on the destination (Essential ≤ Optimal ≤ Full)
- Fonts loaded via WordPress or Bricks

## Phase 1 — Design (source site)

**Colours: only from SLASHED palettes** (`SLASHED · Primary`, `· Secondary`,
`· Tertiary`, `· Action`, `· Neutral`, `· Base`, `· Status`, `· Semantic`).
Never use the colour wheel, Bricks "Global Colors", or a hand-typed value.
Verify in DevTools that the value reads `var(--sf-color-*)`, not `#rrggbb`.

**Custom CSS: use tokens.**

```css
.my-element {
  background: var(--sf-color-primary);
  padding: var(--sf-space-4) var(--sf-space-6);
  font-size: var(--sf-text-base);
  font-family: var(--sf-font-body);
  border-radius: var(--sf-radius-md);
  box-shadow: var(--sf-shadow-md);
  transition: all var(--sf-duration-normal) var(--sf-ease-out);
}
```

**Layout: use `sf-*` classes** (Bricks class manager → "SLASHED Layout").

| Instead of | Use |
|------------|-----|
| `display: flex; gap; flex-wrap` | `sf-cluster` |
| `display: grid; grid-template-columns; gap` | `sf-grid` |
| `max-width; margin: 0 auto` | `sf-center` |
| `display: flex; flex-direction: column; gap` | `sf-stack` |

## Phase 2 — Export (source site)

1. **Admin → SLASHED → Design Tokens → Export / Import → Download token file**
   (`slashed-tokens-YYYY-MM-DD.json`).
2. **Bricks → Templates → Export** the page/section JSON.
3. Bundle both files together.

## Phase 3 — Import (destination site)

1. Confirm prerequisites (plugin active, bundle ≥ source, Bricks ≥ 1.9.2, fonts).
2. **Admin → SLASHED → Design Tokens → Export / Import → Import token file**,
   then reload.
3. **Bricks → Templates → Import** the template JSON.
4. Open in the Bricks editor to verify.

## Phase 4 — Verify

- Colours match tokens; dark mode switches (`data-brx-theme="dark"`); spacing,
  fonts, radii, shadows, animations correct.
- DevTools console:

  ```js
  getComputedStyle(document.documentElement).getPropertyValue('--sf-color-primary')
  // empty string → SLASHED CSS not loaded
  ```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Colours wrong / unchanged | Elements hold hard-coded hex | Re-pick the colour from a SLASHED palette |
| Everything grey | CSS bundle not loaded (`document.querySelector('link[href*="slashed"]')` is null) | Confirm plugin active; Admin → SLASHED → Bundle set |
| Tokens are defaults | Token file not imported | Repeat Phase 3 step 2 |
| `sf-*` classes do nothing | Bundle lacks them (Essential used) | Admin → SLASHED → Bundle → Optimal or Full |
| Dark mode broken | `[data-brx-theme="dark"]` rule missing from loaded CSS | Update the plugin to the current release |
