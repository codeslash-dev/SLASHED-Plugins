# reBEMer

Subtree-scoped BEM class manager for the Bricks Builder structure panel,
shipped as part of SLASHED for Bricks.

## What it does

reBEMer adds a "BEM" badge to every item in the Bricks structure panel.
Clicking it opens a draggable panel that names a **block** plus every
descendant **element**, optionally appends a **modifier**, and applies the
result as global classes to that subtree in one pass. A read-only reference
check (`GET /rebemer/unused`) surfaces classes still used by other elements
before a destructive operation.

## Glossary

- **Block** — top-level BEM token, e.g. `card`, `site-header`.
- **Element** — part of a block, `block__element` (flat, regardless of DOM
  depth: `card__title`, not `card__body__title`).
- **Modifier** — additive flag, `block--modifier` or `block__element--modifier`;
  the base class always remains.
- **Subtree** — the clicked structure item plus its full descendant chain.
- **Global class** — an entry in Bricks' `bricks_global_classes` option
  (`id`, `name`, `settings`).

## Operation modes

| Mode | Old classes on subtree | Globally |
|---|---|---|
| **Add** | None to remove. | New global class(es) created. |
| **Rename** | Selected class family detached (base + matching modifiers renamed); unrelated classes kept. | Old class kept if used elsewhere; new class inherits old settings. |
| **Replace** | Selected family detached and new class attached; with "— All classes —" (default), every class detached. | Old class kept as-is; new class created empty. |
| **Add Modifier** | Old classes preserved. | New `--modifier` class created empty. |
| **Migrate ID styles** | New class attached; ID-level style settings moved into it. Other classes preserved. | New class created with migrated settings. |
| **All-in-one (Mixed)** | Per-row op (Add / Rename / Replace). | New class(es) per row's effective op. |

reBEMer never deletes a class globally — use Bricks' Global Class Manager for
that.

- **Class-family picker** (Rename / Replace / Mixed) — each row picks which
  existing class family the operation targets. Replace adds a leading
  "— All classes —" option (default).
- **"Remove all existing classes" toggle** (Rename / Replace / Mixed) — leaves
  each row's element with only the class(es) that row creates. Ignored by Add
  and Migrate.
- **Migrate-mode preview chips** — each migrate row lists the element-settings
  keys (from an allowlist, `lib/migrate-keys.js`) that will be lifted into the
  new class.
- **Per-row skip toggle** — unchecked rows stay in the plan for transparency
  but produce no mutations and are excluded from auto-numbering.
- **Sibling auto-numbering** — when two rows would produce the same class name,
  `-1`, `-2`, … are appended in document order. User-typed names are
  authoritative and never auto-numbered.
- **Element-type pre-fill** — `lib/element-types.js` maps Bricks element types
  to BEM labels (`heading`→`heading`, `text-basic`→`text`, `image`→`image`,
  `nav-nested`→`nav`, …) so rows are pre-filled on first open. Seeding order
  per row: (1) your custom Bricks label, slugified; (2) the built-in type map
  merged with any admin overrides; (3) the human label Bricks shows for the
  type (read from its element registry via `bricks-api.getElementTypeLabel`,
  slugified); (4) the generic `item`. Layout containers
  (`section`/`container`/`div`/`block`) skip the type-label step above and are
  instead named by the configured container mode (see *Configurable defaults*):
  by default they take their own Bricks type (`container`, `section`, …), or —
  in `role` mode — a role inferred from their children
  (`header`/`body`/`content`/`actions`/…) via `suggestContainerName`.
- **Configurable defaults** — a dedicated **reBEMer** admin subpage
  (`Slashed_ReBEMer_Page`, a sibling of Manual CSS under the SLASHED menu —
  *not* part of the Design Settings SPA) persists a sparse element-type →
  BEM-name override map (`rebemer_element_map`) and a container-naming mode
  (`rebemer_container_mode`: `type` *(default)* = name each container after its
  own Bricks type (`container`/`section`/`div`/`block`), `role` = child-aware
  inference (`header`/`content`/…), `generic` = `item` + auto-numbering). Both
  are stored in the `slashed_bricks_settings` option, sanitized against the same
  BEM grammar as `validate.js` (the page reuses
  `Slashed_REST_Controller::sanitize_rebemer_element_map`), and localized onto
  `window.slashedBricksEditor` by `class-editor-data.php`; `element-types.js`
  merges the overrides over the frozen built-in map at panel-open time. The page
  lists **every** element registered in Bricks — core, plugin, and custom — not
  just the built-in map: `Slashed_Bricks_Elements::get_all()` reads Bricks'
  `\Bricks\Elements::$elements` registry (cached per element-set). Layout
  containers are omitted from that table since their naming comes from the
  container mode. (The standalone Bricks plugin, which has no top-level SLASHED
  menu, still exposes the same controls as a tab in its admin SPA.)

## Architecture

```
integrations/bricks/
  slashed-bricks.php
  editor-app/                  Vite + Svelte source
    src/
      main.js                  badge injector + panel mount
      lib/
        bricks-api.js          ONLY seam to __vue_app__
        slugify.js             pure
        validate.js            BEM grammar validation
        element-types.js       element-type → BEM name suggester
        apply.js               buildPlan + applyPlan
        migrate-keys.js        migrate allowlist
        class-hints.js
        color-model.js
        color-swatches.js
      components/
        BemBadge.svelte  BemPanel.svelte  Row.svelte  Toast.svelte
        ColorApp.svelte  ColorLauncher.svelte  ColorPanel.svelte  ColorSwatch.svelte
      styles/panel.css
  assets/editor-app/           Vite build output
  includes/
    class-rebemer-enqueue.php
    class-rebemer-rest.php
```

### Bricks-API seam

Every reach into `appElement.__vue_app__.config.globalProperties.$_state` goes
through `lib/bricks-api.js`. This surface is undocumented by Bricks and can move
in any release. If the probe fails, the badge is not injected and a non-blocking
notice is shown. Mutations splice the existing reactive references Bricks owns
(`element.settings._cssGlobalClasses`, `element.label`, `state.globalClasses`),
which are already reactive — no fake-mutation hack.

### Enqueue data

`class-rebemer-enqueue.php` localizes `window.slashedBricksEditor` with the
class-hints, color-swatch, and color-panel data, and loads the editor bundle as
an ES module.

## REST: `GET /wp-json/slashed/v1/rebemer/unused`

Read-only report of classes no longer referenced by any element, used to warn
before destructive operations. Permission:
`bricks_full_access` or `manage_options`. The endpoint never mutates state.

## Reserved-name guard

A class name is reserved when it:

1. Exactly matches a SLASHED utility (`sf_classes` / `is_classes` from
   `data/inventory.json`).
2. Starts with `sf-` or `is-`.
3. Shadows a CSS keyword (`auto`, `inherit`, `initial`, `unset`, `revert`,
   `revert-layer`).

CSS-keyword blocking is wired; the full SLASHED utility list is being wired in.

## ID generation

`crypto.randomUUID()`, dashes stripped, first 8 hex chars (matching Bricks'
class-id length), retried on collision against existing ids.

## Compatibility

- **Bricks** — requires `bricks_is_builder_main()` and a `__vue_app__` Vue 3
  app; both are probed. If either is missing, reBEMer does not enqueue / inject.
- **Browsers** — ES2020; requires `crypto.randomUUID`, `AbortController`.
- **PHP** 7.4+, **WordPress** 6.0+.
