# Troubleshooting: a configurator control changes nothing on the page

Symptom: a control works in the standalone configurator (and in the plugin's own
live preview) but changes nothing on the WordPress page. The spacing/typography
**modular scale** is the usual reporter, because it works indirectly — it moves
a *source knob* that the framework's generative `clamp()`s read, rather than
writing the concrete value.

Work through it in this order; each step is a measurement, not a guess.

## 1. Is the emitted CSS itself capable of moving the page?

```bash
node tests/override-effect-probe.mjs
```

This asks the real PHP emitter for the CSS a site would serve for each control
group, then diffs every live `--sf-*` token in a headless browser against the
un-overridden page — for both the layered and the flat bundle. `DEAD` means the
control cannot work anywhere; `OK` means the problem is specific to the site.
See the file header for prerequisites (`playwright`, `php`).

If everything is `OK` here, the defect is in the page's CSS environment, and no
amount of reading plugin code will find it. Go to step 2.

## 2. What does the actual page say?

Open the page where the change should be visible (the front end, or the Bricks
canvas iframe — pick the iframe as the console context, not the builder panel),
and paste the whole of [`scripts/diagnose-page-tokens.js`](../scripts/diagnose-page-tokens.js)
into DevTools.

Read the output against this table. "Source knob" = `--sf-space-ratio-min` et al;
"derived output" = `--sf-space-m`, `--sf-space-4xl`, …

| What the output shows | What it means | Fix |
|---|---|---|
| Section 4 says the ladder does NOT match the knobs | The decisive case. The concrete output tokens are declared by something that is not the framework's generative CSS, so the knobs feed a formula whose result is discarded — they read back correctly at `:root` and change nothing. Note this does **not** require the outputs to sit at their defaults: an unrelated hand-set ladder reads as "not default" and still proves the knobs are inert. Section 2 names the declaring rule. | Remove that source. If it is another SLASHED copy loaded by a theme/optimizer, stop the duplicate load. |
| Source knob = your value, derived outputs = defaults | Same shadowing, in its most obvious form. Section 2 names it — look for `layer=(unlayered …)`, which beats every `@layer`, or a declaration in a layer after `slashed.overrides`. | As above. |
| Source knob = default value | The override never reached the page. Section 2 will show no `slashed.overrides` declaration. | Page cache or CSS optimizer serving HTML from before the save — purge it. Confirm `<style id="slashed-framework-inline-css">` exists in view-source. |
| Section 4 says the ladder matches, and the knobs show your values | The tokens *are* live on the page. | The element you are looking at does not consume them — e.g. the builder sets padding in px. Check the element's own computed padding in DevTools, not the token. |
| Section 1 flags a `.flat.` bundle | Flat bundles carry no `@layer`. The emitter follows this automatically (`Slashed_CSS_Loader::layers_enabled()`), but a *third-party* optimizer that strips `@layer` from the bundle recreates the same mismatch from outside, and the plugin cannot detect that. | Disable the optimizer's layer stripping, or switch the plugin to flat mode deliberately so both sides agree. |

## 3. Is a concrete value stored in the override map?

```bash
wp option get slashed_overrides --format=json
```

An explicit output token in the map (say `--sf-space-m`) **beats the scale knob
by design** — fine-tuning wins over the knob that generated it, in both the JS
preview and the PHP emitter (`array_merge($derived, $overrides)`). Such entries
can arrive from the All-tokens tab or an imported theme. Then only that one rung
looks broken while the rest of the scale moves; the fix is to reset that token in
the configurator, not to change precedence.

## What is already known-good (don't re-audit these)

- The configurator writes only live token names — every `--sf-*` literal in
  `configurator/src` resolves against `data/inventory.json`.
- The vendored `admin-app/src/` and `framework-css/` match the framework at the
  pinned `SLASHED_CSS_REF`; `npm run check` is the gate for that.
- The live preview injects **unlayered** `:root` CSS including pre-computed
  derived tokens (`persistence.ts:injectLivePreview`), which is why the preview
  can look right while the saved page is wrong. A preview/page mismatch is a
  symptom of a cascade conflict on the page, not of a broken control.
