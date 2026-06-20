# SLASHED for WordPress — v1.0.0 Roadmap Proposals

> **Status:** brainstorm / proposal doc. The curated, committed roadmap lives in
> [`docs/roadmap.md`](roadmap.md). This file is the wider candidate pool for the
> push to 1.0, tiered by priority. Nothing here is committed scope until it moves
> into `roadmap.md`.

## Framing

Benchmarked against what Automatic.css and Core Framework ship in their WordPress
plugins, plus net-new ideas for DX, governance, and agency workflow. The plugin
has far more green field than the framework (whose token API is already frozen).

The **highest-leverage cluster** for 1.0 positioning:
**embedded Configurator + living style guide + brand-lock + migration codemap** —
i.e. *configure your system, show the client, keep them on-brand, and make
competitors cheap to leave.*

Legend: **★** net-new idea · **◆** already referenced in a roadmap · **△** beyond
what Automatic.css / Core Framework offer.

---

## Tier 1 — v1.0.0 core

### Token authoring in wp-admin (close the gap with the ACSS dashboard)
1. ◆ **Embed the Configurator natively in wp-admin** (targeted ~0.8.0+) — the standalone Svelte app becomes a real admin page. Biggest single UX win.
2. ◆ **WCAG contrast matrix panel** — AA/AAA audit of every semantic fg/bg pair, light + dark, against current overrides.
3. ★ **Config import/export** — override set as JSON *or* portable `slashed.overrides` CSS; re-import on another site. Git-trackable.
4. ◆ **Live token playground in admin** — iframe preview via `postMessage`, no save, audition token changes against real components.

### Builder integrations
5. ◆ **Make the Gutenberg token panel actually work**, then reach Bricks parity on apply-to-block.
6. ◆ **theme.json → FSE Global Styles mapping** — expose `--sf-*` as `--wp--custom--*` so the Site Editor's native UI drives SLASHED tokens.
7. ◆ **reBEMer atomic apply via Bricks' native mutation API** — one real Ctrl-Z step; snapshot-restore on error.

### Output & delivery control (ACSS's "disable what you don't use", via cascade layers)
8. ★△ **Per-layer output control** — toggle which `@layer`s ship (drop motion / print / legacy) to shrink delivered CSS.
9. ◆ **Delivery panel with changelog diff + rollback** — show *what tokens changed* before committing a framework CSS update.

## Tier 2 — fast-follow

### Token authoring
10. ★△ **Token alias / inheritance explorer** — click any `--sf-*` token, see its full derivation chain (source → resolved → derived).
11. ★△ **Override revision history** — named config snapshots with diff + rollback (WP-revisions-style).

### Builder integrations
12. ◆ **reBEMer for Gutenberg** — block-tree BEM naming, Bricks parity.
13. ★△ **Second builder integration (Breakdance or Etch)** — extract a shared integration core; prove it with one more builder.
14. ★ **Component inserter** — once the framework ships `.sf-card` / `.sf-button`, ship matching Bricks elements / Gutenberg blocks that scaffold them with correct BEM + tokens.

### Output & delivery
15. ★ **Critical-CSS inlining** — inline `tokens` + `reset` + `base` in `<head>`, defer the rest. LCP win, trivial given the layer split.
16. ◆ **Stale-version dashboard widget** — weekly check; auto-skips when pinned.

### Agency / DX
17. ★△ **WP-CLI + REST for headless config** — read/set tokens, export bundles, validate overrides; configs live in CI/provisioning.
18. ★△ **Multisite config propagation** — push a master token config network-wide with per-site override allowances.
19. ★ **Starter brand "kits"** — one-click palette + scale presets in admin.
20. ★ **First-run setup wizard** — pick bundle → set 6 brand colors → enable builder, with live preview.

---

## Theme: Client collaboration (design-system-scoped)

> The defensible subset of "client feedback." Generic whole-site annotation /
> bug tracking is a *different product* — integrate with Atarim / ProjectHuddle,
> don't rebuild it.

- ★△ **Auto-generated living style guide page** — shareable URL rendering the site's *actual* live tokens + components. Doubles as client review surface, dev handoff, and QA reference. (Keystone.)
- ★△ **Token-scoped approval mode** — client hits ✓ Approve / 💬 Request changes *per domain* (palette / typography / spacing). Status: pending → approved → changes-requested.
- ★△ **Configurator "suggest mode"** — shareable config URL becomes two-way; client's tweak returns as a suggestion to accept/reject.
- ★ **Brand handoff export** — printable/PDF brand book (palette, type scale, spacing, component samples) generated from live tokens.
- ★△ **White-label / agency mode** — rename plugin, hide SLASHED chrome, agency logo on style guide + client pages. The thing that makes agencies *resell* it.
- ★ **Per-client "kits"** — save an approved config as a named, reusable preset.

**Boundary (don't build):** client accounts, comment threads, email digests,
notification center, generic anywhere-on-page annotation. A signed shareable link
+ a single approve/request action covers ~90% of the value.

---

## Theme: Adoption & migration (biggest growth lever — switching cost)

- ★△ **ACSS / Core Framework → SLASHED codemap** — map their vars + utility classes to `--sf-*` / `.sf-*` equivalents so migration isn't a rebuild.
- ★ **"Adopt incrementally" scanner** — parse existing CSS, report hardcoded values that match a token, offer to swap.
- ★ **Config importers** — seed token overrides from a Tailwind config or raw CSS-variables file.

## Theme: AI-assisted authoring (scoped to tokens — never blind CSS)

- ★△ **Palette from a logo/image** — extract colors, snap to the 6 brand tokens with contrast validation.
- ★ **Natural-language token nudges** in the Configurator — "warmer brand," "more type contrast" → proposes a token delta you approve.
- ★△ **A11y auto-fix suggestions** — "pair fails AA; nearest passing value is oklch L+0.08." Natural fit given oklch derivation.
- **Boundary:** AI proposes reviewable token deltas only. No arbitrary CSS, no blind layout generation.

## Theme: QA & guardrails

- ★△ **Override linter, pre-save** — warn when an override breaks a contrast guarantee or shadows a reserved token *before* it's written.
- ★ **Token / class coverage report** — what's actually used site-wide → safe-prune suggestions, smaller CSS.

## Theme: Editor & governance (under-served, very on-brand)

- ★△ **Brand-lock / constrained editor palette** — expose only approved *semantic* tokens to content editors, not all ~800. Non-devs physically can't pick off-brand colors. Arguably the most differentiated idea here.
- ★ **Component-based block patterns / Bricks templates** — pre-built sections on the `.sf-*` components so editors assemble pages without touching tokens.

---

## Explicitly rejected (scope creep)

- A full project-management / CRM layer.
- A hosted SaaS dashboard.
- End-user analytics tracking.
- An AI "build my whole site" button.

Each pulls off the design-system core into a product a dedicated tool does better.
