# Bricks template workflow

A repeatable, step-by-step process for building and moving Bricks templates
that look identical on every site running the SLASHED plugin.

---

## Why templates break

Bricks stores colour values in the template JSON in one of three ways:

| Form | How it gets into the template | Portable? |
|------|-------------------------------|-----------|
| `var(--sf-color-primary)` | Picked from a SLASHED palette in the colour picker | ✅ Yes — works on any site with SLASHED |
| `#4a90e2` | Typed by hand or picked from the colour wheel | ❌ Hard-coded — ignores brand tokens |
| `bricks-color-abc123` | Picked from Bricks' "Global Colors" | ❌ Site-specific ID — renders transparent on another site |

The same problem applies to:

- **Spacing** — `padding: 24px` instead of `var(--sf-space-6)` doesn't scale.
- **Typography** — `font-family: "Inter"` instead of `var(--sf-font-body)` ignores tokens.
- **SLASHED tokens** — values from the admin panel (`slashed_bricks_tokens`) do
  **not** travel inside the Bricks JSON file; export them separately (see Phase 2).

---

## Prerequisites

On **both** the source and destination sites:

- Bricks Builder ≥ 1.9.2
- SLASHED Bricks plugin active
- A chosen CSS bundle (Essential / Optimal / Full) — the same or higher on the destination
- Fonts loaded via WordPress or Bricks (Google Fonts, self-hosted, …)

---

## Phase 1 — Design the template (source site)

### Rule 1: colours only from SLASHED palettes

In the Bricks colour picker, expand the palette groups and use **only**:

- `SLASHED · Primary`
- `SLASHED · Secondary`
- `SLASHED · Tertiary`
- `SLASHED · Action`
- `SLASHED · Neutral`
- `SLASHED · Base`
- `SLASHED · Status`
- `SLASHED · Semantic`

**Never** use:

- The colour wheel (writes a hex `#rrggbb`).
- Bricks' "Global Colors" section (writes a site-internal ID).
- The colour text field with a hand-typed value.

> **How to check:** inspect the element in DevTools. The colour should read like
> `color: var(--sf-color-primary)`, not `color: #4a90e2`.

### Rule 2: CSS variables in "Custom CSS" fields

In an element's CSS tab, use tokens in every custom rule:

```css
/* ✅ Good */
.my-element {
  background: var(--sf-color-primary);
  padding: var(--sf-space-4) var(--sf-space-6);
  font-size: var(--sf-text-base);
  font-family: var(--sf-font-body);
  border-radius: var(--sf-radius-md);
  box-shadow: var(--sf-shadow-md);
  transition: all var(--sf-duration-normal) var(--sf-ease-out);
}

/* ❌ Bad */
.my-element {
  background: #4a90e2;
  padding: 16px 24px;
  font-size: 16px;
  font-family: "Inter", sans-serif;
}
```

### Rule 3: `sf-*` classes for layout

Use SLASHED layout classes instead of hand-written Flexbox/Grid values:

| Instead of… | Use the class |
|-------------|---------------|
| `display: flex; gap: 16px; flex-wrap: wrap` | `sf-cluster` |
| `display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px` | `sf-grid` |
| `max-width: 1200px; margin: 0 auto` | `sf-center` |
| `display: flex; flex-direction: column; gap: 16px` | `sf-stack` |

The classes are available in the Bricks class manager (category "SLASHED Layout").

### Rule 4: don't use Bricks Global Colors

Bricks has its own "Global Colors" (a colour with a custom name, e.g. "Accent
Blue"). These carry an internal ID specific to the WordPress install.
**After importing the template on another site those IDs don't exist → the
colour is invisible.** Use the SLASHED Color Palette instead.

---

## Phase 2 — Export (source site)

### Step 1: export SLASHED tokens

1. Open **WordPress Admin → SLASHED → Design Tokens**.
2. Go to the **Export / Import** tab.
3. Click **Download token file**.
4. Save `slashed-tokens-YYYY-MM-DD.json`.

This file contains all your colour, typography, spacing, etc. overrides.

### Step 2: export the Bricks template

1. In Bricks, open the page/section you want to export.
2. **Bricks → Templates → Export**, or save it as a template.
3. Download the template JSON file.

### Step 3: bundle both files together

Suggested naming convention:

```text
my-template/
  ├── bricks-template-hero.json        # Bricks template
  ├── slashed-tokens-2026-05-28.json   # SLASHED tokens
  └── README.txt                       # optional: font / bundle notes
```

---

## Phase 3 — Import (destination site)

### Step 1: check prerequisites

- [ ] SLASHED Bricks plugin installed and active
- [ ] CSS bundle the same or higher (Essential ≤ Optimal ≤ Full)
- [ ] Bricks ≥ 1.9.2
- [ ] Fonts configured (Google Fonts, Adobe Fonts, self-hosted)

### Step 2: import the SLASHED tokens

1. **Admin → SLASHED → Design Tokens → Export / Import**.
2. Choose the `slashed-tokens-*.json` file.
3. Click **Import token file**.
4. Wait for "Imported N section(s) successfully".
5. **Reload the page** — the tokens are now active.

### Step 3: import the Bricks template

1. **Bricks → Templates → Import**.
2. Choose the `bricks-template-*.json` file.
3. Import.

### Step 4: check in the Bricks editor

Open the page in the Bricks editor. The canvas should render the template with
the correct colours.

---

## Phase 4 — Verification

### Visual checklist

- [ ] Colours match the tokens (Primary, Secondary, etc.)
- [ ] Dark mode switches correctly (`data-brx-theme="dark"`)
- [ ] Spacing/gaps look proportional
- [ ] Fonts load correctly (not the serif/sans-serif fallback)
- [ ] Radii, shadows, and animations work

### Technical check (DevTools)

Open the inspector and run:

```js
// In the browser console, on the page with the template:
getComputedStyle(document.documentElement).getPropertyValue('--sf-color-primary')
// Should return an OKLCH colour, not an empty string
```

If the value is empty → the SLASHED CSS isn't loaded (see Troubleshooting).

---

## Troubleshooting

### Colours are wrong / don't change

**Cause:** elements hold hard-coded hex values instead of `var()`.

**Diagnosis:** in DevTools → Inspector → Computed, look for values that read like
`#rrggbb` or `rgb(...)` instead of `var(--sf-color-*)`.

**Fix:** re-style the element by picking a colour from a SLASHED palette, not the
colour wheel.

---

### Everything is colourless / grey

**Cause:** the SLASHED CSS bundle isn't loaded on the page.

**Diagnosis:**

```js
// In the console:
document.querySelector('link[href*="slashed"]')
// Should return a <link> element. null = bundle not loaded.
```

**Fix:**

1. Check the SLASHED Bricks plugin is active.
2. Admin → SLASHED → Bundle — confirm a bundle is set.
3. Check no other plugin is blocking the CSS.

---

### Tokens are the defaults, not yours

**Cause:** the token file wasn't imported, or the import failed.

**Diagnosis:** Admin → SLASHED → Colors — the colours should show your overrides.
If everything is the default (purple), the file didn't reach the database.

**Fix:** repeat the token import (Phase 3, Step 2).

---

### `sf-*` classes don't work (no styling)

**Cause:** the CSS bundle doesn't include those classes (e.g. Essential was used
instead of Optimal/Full).

**Diagnosis:**

```js
// Check whether the CSS rule exists:
[...document.styleSheets].flatMap(s => [...s.cssRules]).find(r => r.selectorText?.includes('sf-cluster'))
// undefined = the rule isn't in the bundle
```

**Fix:** Admin → SLASHED → Bundle → switch to Optimal or Full.

---

### Dark mode doesn't work

**Cause:** Bricks uses `data-brx-theme` instead of SLASHED's `data-theme`. The
plugin bridges the two attributes automatically, but only when the CSS is loaded.

**Check** that the loaded CSS contains this rule:

```css
[data-brx-theme="dark"] { color-scheme: dark; --sf-is-dark: 1 }
```

If it's missing → check the plugin version (requires the current release or newer).

---

## Quick cheatsheet

```text
Before designing:
  ✅ Colour     → from a SLASHED palette group
  ✅ Custom CSS → var(--sf-*)
  ✅ Layout     → sf-* class
  ❌ Colour     → hex from the colour wheel
  ❌ Custom CSS → px / hex literal
  ❌ Colour     → Bricks Global Colors

Export (from this site):
  1. Admin → SLASHED → Design Tokens → Export / Import → Download token file
  2. Bricks → Export template

Import (on the new site):
  1. Admin → SLASHED → Design Tokens → Export / Import → Import token file
  2. Bricks → Import template
  3. Reload the page
  4. Verify in the editor
```
