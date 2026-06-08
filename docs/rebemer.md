# reBEMer — design doc

> A subtree-scoped BEM class manager for the Bricks Builder structure
> panel, shipped as part of **SLASHED for Bricks**.

Status: **v1 partial implementation in progress** — see §0 Implementation status.
License: MIT, same as the host plugin.

---

## 0. Implementation status

Section bodies describe the full v1 design; this table tracks what has shipped
in code. Spec-only rows (§7, §8, §10, §12, §13) describe accurate design that
lands in follow-up PRs.

| Capability | Status | Where |
|---|---|---|
| Badge injection in structure panel (§3.1) | ✅ shipped | `editor-app/src/main.js` + `BemBadge.svelte` |
| Panel mount + close (§3.2) | ✅ shipped | `editor-app/src/main.js` + `BemPanel.svelte` |
| Add / Rename / Replace / Add Modifier modes (§3.3) | ✅ shipped | `editor-app/src/lib/apply.js` |
| Class-family picker in dedicated Rename & Replace (§3.3) | ✅ shipped | `Row.svelte` family `<select>` (driven by `effectiveOp`) + `apply.js` honors `row.renameFamilyId` in all modes |
| "Remove all existing classes" toggle (§3.3) | ✅ shipped | `BemPanel.svelte` toolbar checkbox → `applyToSubtree({ removeExisting })`; ignored by Add/Migrate |
| All-in-one (Mixed) mode — per-row op toggle + family picker (§3.3) | ✅ shipped | `apply.js` (`'mixed'` mode; per-op `effectiveMode` dispatch) + `BemPanel.svelte` + `Row.svelte` |
| Migrate ID styles mode (§3.3, §6) | ✅ shipped | `apply.js` + `lib/migrate-keys.js` allowlist |
| Migrate-mode preview chips (§3.3) | ✅ shipped | `Row.svelte` chip strip |
| Element-aware row pre-fill (§6.3) | ✅ shipped | `lib/element-types.js` consumed by `BemPanel` |
| Sibling auto-numbering (§6.2) | ✅ shipped | `applyAutoNumbering()` in `apply.js` |
| Per-row skip toggle (§3.2, §6) | ✅ shipped | `Row.svelte` include checkbox |
| `suggestedFrom` provenance tracking (§6) | ✅ shipped | `'user' \| 'label' \| 'element-type' \| 'fallback' \| 'auto-number'`; `AUTHORITATIVE_PROVENANCE` set in `apply.js` covers user + label |
| "Use existing class" client-side hint (§8.3 `recommendedAction: "attach"`) | ✅ shipped (client snapshot only) | `Row.svelte` derived `existingClassMatch` |
| Unused-class read-only report | ✅ shipped | `GET /rebemer/unused`, `class-rebemer-rest.php` |
| BEM grammar policy (§5) | ⚠️ partial | basic `validateName()` exists; no policy hydration yet |
| Reserved-name guard (§10) | ⚠️ partial | CSS keywords blocked; SLASHED utility list not yet wired |
| Cross-page reference-count preflight (§8.1–8.3) | ❌ spec-only | needs server endpoint + client preflight call |
| Snapshot/rollback transactional apply (§7) | ❌ spec-only | current apply is best-effort, no snapshot |
| Real undo via in-panel ring buffer (§12) | ❌ spec-only | no undo yet |
| `nameCollisions.recommendedAction: "rename" / "replace"` (§8.3) | ❌ spec-only | needs preflight; `"attach"` is client-side via match-by-name |
| i18n string table (§13) | ❌ spec-only | strings are hardcoded English |

---

## 1. One-paragraph summary

reBEMer adds a small "BEM" badge to every item in the Bricks Builder
structure panel. Clicking it opens a draggable panel that lets the user
name a **block** plus every descendant **element**, optionally append a
**modifier**, and apply the result as global classes — to that subtree
only — in one transaction. Destructive operations are gated by a REST
preflight that counts other elements still using the old class, so a
rename cannot silently break unrelated parts of the site. A snapshot
of the Bricks state is taken before every apply, with a single Cmd-Z
inside the panel reverting the whole operation.

> This paragraph describes the full v1 design. For what is actually shipped
> today versus spec-only, see the status table in §0 — the cross-element
> preflight, transactional snapshot/rollback, and in-panel undo are design
> targets landing in follow-up PRs; the shipped reference check is the
> read-only `GET /rebemer/unused` report.

## 2. Glossary

- **Block** — top-level BEM token. A single word or kebab-case phrase
  identifying a UI component, e.g. `card`, `site-header`.
- **Element** — a part of a block, written `block__element`. Elements
  do not nest semantically: BEM uses flat element names regardless
  of DOM depth (e.g. `card__title`, not `card__body__title`).
- **Modifier** — a flag on a block or element, written
  `block--modifier` or `block__element--modifier`. Always additive:
  the base class must remain on the element.
- **Subtree** — the structure-panel item the user clicked plus its
  full descendant chain, regardless of element type.
- **Global class** — a class entry in Bricks' shared registry
  (`bricks_global_classes` option). Has an `id`, `name`, and
  `settings` blob.
- **Element settings** — the per-element settings blob in the page
  data tree (`element.settings`). Includes `_cssGlobalClasses` (a
  list of global-class ids attached to that element) plus inline
  style settings keyed by Bricks control name.
- **ID-level styles** — style settings written directly into
  `element.settings` rather than into a global class. Migrating these
  up into a class is a known Auto-BEM feature; reBEMer matches it.
- **Plan** — the structured representation of "what would happen if I
  apply", produced by `buildPlan()`. Pure data, fully serializable,
  testable in isolation, sent to the preflight endpoint.
- **Reference count** — the number of elements *outside the current
  subtree* still using a given class id; reported by preflight.


## 3. UX flow

### 3.1 Badge in the structure panel

A small "BEM" badge is injected into every `li[data-id]` inside
`#bricks-structure`, before the element actions cluster. Clicking it:

- **Single-click** → opens the reBEMer panel scoped to that subtree.
- **Double-click** → applies the most recent successful plan for
  that subtree if any, otherwise falls through to single-click.
  *(Defer double-click apply to v1.1 if it complicates testing.)*

The badge:

- Is a real `<button type="button">` with `aria-label` and `title`.
- Survives Bricks structure re-renders (`MutationObserver` scoped to
  the structure tree container only, debounced).
- Does not steal focus from the row.
- Cleans up its observer + listeners with an `AbortController` on
  panel destruction.

### 3.2 Panel layout

```
┌─────────────────────────────────────────────────┐
│ reBEMer · <block-label>                       × │  header (drag)
├─────────────────────────────────────────────────┤
│ Operation:  [Add ▾]   ☐ Sync labels             │  toolbar
│  · Add       · Rename                           │
│  · Replace   · Add modifier                     │
│  · Migrate ID styles                            │
├─────────────────────────────────────────────────┤
│ ☑ block-name                          [block]   │  rows
│ │   ☑ block__element-1     [--mod]    [elem]   │
│ │   ☐ block__element-2     [--mod]    [elem]   │  ← skipped
│ │      ☑ block__element-3  [--mod]    [elem]   │
├─────────────────────────────────────────────────┤
│ Migrate keys: padding · radius · background     │  preview chips
│                                  (migrate mode) │  (only in §3.3 migrate)
├─────────────────────────────────────────────────┤
│ ⚠ 2 classes will remain on 5 elements outside  │  preflight strip
│   this subtree. [Show details]                  │  (only if needed)
├─────────────────────────────────────────────────┤
│ Cancel                                  [Apply] │  footer
└─────────────────────────────────────────────────┘
```

The leftmost `☑` / `☐` per row is the **include / skip toggle**.
Unchecked rows are kept in the plan for transparency (so the user
sees the full subtree they opened the panel on) but produce no
mutations at apply time and are excluded from the preflight count.
Toggling skip never affects the plan's atomicity — apply remains a
single transaction over the still-included operations.


### 3.3 Operation modes

| Mode | What happens to old classes on subtree | What happens globally |
|---|---|---|
| **Add** | Subtree had none; nothing to remove. | New global class(es) created. |
| **Rename** | The selected class family is detached (its base + matching modifiers are renamed); unrelated classes are kept. Per row, the user picks which family to rename when an element has several. | Old class kept globally if used elsewhere; new class created and inherits the old class settings. |
| **Replace** | The selected class family is detached and the new class attached; unrelated classes are kept. With "— All classes —" selected (the default), every class is detached. | Old class kept globally as-is. New class created (empty settings). |
| **Add Modifier** | Old classes preserved. | New `--modifier` global class created (empty settings). |
| **Migrate ID styles** | New class attached. ID-level style settings on the element are *moved* into the new class. Other classes preserved. | New class created with the migrated settings. |
| **All-in-one** | Per-row: Add keeps old classes; Rename retargets a selected class family (unrelated classes kept, modifiers of that family renamed too); Replace strips all old classes or, when a family is selected, removes only that family and its modifiers (unrelated classes kept). | New global class(es) created per row's effective operation. |

reBEMer **never** deletes a class globally. To remove a class entirely
from the registry, use Bricks' Global Class Manager.

#### Class-family selection (Rename & Replace)

In **Rename**, **Replace**, and **All-in-one** modes, each row shows a
class-family picker so the user controls *which* existing class the
operation targets, instead of always acting on the first class:

- **Rename** lists the element's families; the chosen family's base is
  renamed to the new name (its settings seed the new class) and its
  modifier siblings (`base--mod`) are renamed too. Unrelated classes
  stay. When the element has only one family, the picker collapses to
  an inline note.
- **Replace** offers the same families plus a leading **— All classes —**
  option (the default). Pick a family to remove only that family (and
  its modifiers) while keeping the rest; leave it on "— All classes —"
  to detach everything before attaching the new class.

#### "Remove all existing classes" toggle

A panel-level toggle is available in **Rename**, **Replace**, and
**All-in-one** modes (hidden for Add and Migrate). When on, every
renamed/replaced row leaves its element with **only** the class(es)
that row creates — the new/renamed base plus any modifier-input classes
— stripping all other pre-existing classes. For Rename this also drops
the family's untouched modifier siblings; the new base still inherits
the source family's settings. The toggle never affects Add or Migrate
rows (which always preserve other classes).

#### Migrate-mode preview chips

When the operation mode is `migrate`, each migrate row shows a small
chip strip listing the element-settings keys (and a hover tooltip with
their values) that will be lifted up into the new class. Drawn from
`Operation.migrateFrom.keys`, this lets the user sanity-check the
allowlisted keys before pressing Apply — and surfaces immediately
when a setting *would* be migrated but is not on the allowlist
(see §9 threat-model entry "Bricks introducing a new style key").

### 3.4 Validation, accessibility, keyboard

- **Empty class field** highlighted red, focused, panel does not apply.
- **Invalid grammar** (per policy) → inline message under the row.
- **Reserved-name collision** (SLASHED utility) → inline message,
  apply blocked.
- **Conflict with existing global class** → inline warning, apply
  allowed (the row will attach the existing class instead of creating
  a duplicate; this is intentional and documented in the row tooltip).
- **Keyboard**:
  - Tab cycles inputs in row order, then toolbar, then footer.
  - Shift-Tab reverses.
  - `Enter` on any input → Apply (after validation).
  - `Esc` → Cancel.
  - `Cmd/Ctrl-Z` while panel is open and the operation has been
    applied → Undo (snapshot restore).
- Focus trap inside the panel; focus restored to the BEM badge on close.


## 4. Architecture

### 4.1 File layout

```
integrations/bricks/
├── slashed-bricks.php                  # bootstrap reBEMer (existing file, edited)
├── editor-app/                         # new — Vite source
│   ├── package.json
│   ├── svelte.config.js
│   ├── vite.config.js
│   ├── vitest.config.js
│   ├── index.html                      # dev harness
│   └── src/
│       ├── main.js                     # bootstrap, mounts inside builder DOM
│       ├── App.svelte                  # root: badge injector + panel host
│       ├── lib/
│       │   ├── bricks-api.js           # ONE seam to __vue_app__
│       │   ├── slugify.js              # pure
│       │   ├── bem.js                  # grammar validate + name builder
│       │   ├── element-types.js        # element-type → BEM-name suggester
│       │   ├── plan.js                 # buildPlan + applyPlan + snapshot/rollback
│       │   ├── preflight.js            # POST to /rebemer/preflight, format result
│       │   ├── policy.js               # reads window.slashedReBEMer.policy
│       │   ├── reserved-names.js       # SLASHED utility lookup (from inventory)
│       │   ├── ids.js                  # crypto-random id with collision check
│       │   ├── storage.js              # validated localStorage prefs
│       │   ├── i18n.js                 # __ helper bound to localized strings
│       │   └── undo.js                 # in-panel snapshot ring buffer
│       ├── components/
│       │   ├── BemBadge.svelte
│       │   ├── BemPanel.svelte
│       │   ├── Row.svelte
│       │   ├── ConfirmDestructive.svelte
│       │   ├── Toast.svelte
│       │   └── PolicyHint.svelte
│       ├── styles/
│       │   └── panel.css
│       └── __tests__/
│           ├── slugify.test.js
│           ├── bem.test.js
│           ├── element-types.test.js
│           ├── plan.test.js
│           ├── policy.test.js
│           └── ids.test.js
├── assets/
│   └── editor-app/                     # new — Vite build output
│       ├── app.js
│       └── app.css
└── includes/
    ├── class-rebemer-enqueue.php       # new
    ├── class-rebemer-rest.php          # new
    └── class-rebemer-policy.php        # new
```


### 4.2 Module responsibilities

| Module | Responsibility | Pure? |
|---|---|---|
| `bricks-api.js` | The **only** module allowed to touch `__vue_app__` or any Bricks internal. Feature-detects the Vue app, exposes `getState()`, `findElement(id)`, `getDescendants(id)`, `getGlobalClasses()`, `upsertGlobalClass(entry)`, `setElementClasses(id, classIds)`, `setElementLabel(id, label)`, `mutateElementSettings(id, fn)`, `subscribe(fn)`. Falls back to a recorded no-op API in test/dev mode. | No (impure by design — wraps mutations). |
| `slugify.js` | `slugify(input, policy) → string` and `slugifyOrThrow(...)`. Honors `allowUnicode` policy flag; otherwise ASCII-only. | Yes |
| `bem.js` | `validateName(name, policy) → {ok, code, message}`, `buildBlockName(label, policy)`, `buildElementName(block, label, policy)`, `buildModifierName(base, modifier, policy)`. | Yes |
| `element-types.js` | `suggestElementName(elementType, fallback, policy) → string`. Maps Bricks element types to BEM element labels (`heading` → `heading`, `text-basic` → `text`, `image` → `image`, `icon` → `icon`, `button` → `button`, `nav-nested` → `nav`, default → `fallback` or `item`). The mapping is filterable from PHP via `slashed_bricks/rebemer_element_type_map`. Used by `buildPlan` to pre-fill row names so the panel is usable on first open without typing every name. | Yes |
| `plan.js` | `buildPlan({rootId, descendants, mode, inputs, policy, existingClasses}) → Plan`. `applyPlan(plan, bricksApi) → ApplyResult`. Plan execution is wrapped in snapshot/restore. Pure-builder + impure-applier separation. | `buildPlan`: yes. `applyPlan`: no. |
| `preflight.js` | Fetch `POST /rebemer/preflight` with the plan, format the response into UI-ready warnings. | No (network) but trivially mockable. |
| `policy.js` | `readPolicy() → Policy`, `defaultPolicy() → Policy`. Reads from `window.slashedReBEMer.policy`, validates shape, fills defaults. | Yes |
| `reserved-names.js` | `isReserved(name, policy) → boolean`, backed by `window.slashedReBEMer.reservedClassNames` (built from `data/inventory.json`). | Yes |
| `ids.js` | `newClassId(existing) → string`, uses `crypto.randomUUID().slice(0,8)` with collision retry. | Yes (with crypto polyfill in test). |
| `storage.js` | Validated `getPrefs()` / `setPrefs(prefs)` with schema fallback. | Yes |
| `i18n.js` | `__(key) → string` bound to `window.slashedReBEMer.i18n`. | Yes |
| `undo.js` | A ring buffer of snapshots scoped to the active panel; `push(snapshot)`, `undo() → snapshot \| null`, `clear()`. | Yes |
| `App.svelte` | Mounts the badge injector observer + the panel host. | n/a |

The line between pure and impure is intentional: every pure module is
unit-tested in isolation. The Vue/DOM-touching code is concentrated
in `bricks-api.js` and the `App.svelte` mount, which we cover with
manual smoke tests in the builder until a Playwright harness exists.


### 4.3 The Bricks-API seam

Every reach into `appElement.__vue_app__.config.globalProperties.$_state`
goes through one module. This is the most fragile part of the whole
plugin — Bricks does not document this surface, and any minor release
can move it.

```js
// bricks-api.js (sketch)
let state = null;
export function probe() {
  const app = document.querySelector('[data-v-app]');
  state = app?.__vue_app__?.config?.globalProperties?.$_state ?? null;
  return state !== null;
}
export function isReady() { return state !== null; }
export function getState() { return state; }
export function findElement(id) {
  if (!state) return null;
  for (const area of ['header','content','footer']) {
    const list = state[area];
    if (!Array.isArray(list)) continue;
    const found = list.find(el => el && el.id === id);
    if (found) return found;
  }
  return null;
}
// ...
```

If `probe()` ever returns `false`, the rest of the editor app shows
a one-line non-blocking notice in the panel ("reBEMer paused: this
Bricks build is not supported. Please report at <link>.") and **does
not inject the BEM badge**. This avoids broken UI and leaves a clear
breadcrumb when Bricks restructures internals.

Reactivity entry: instead of the `state.globalClasses.push({});
setTimeout(...pop, 50)` hack from the original `samirhp` plugin, we
use Vue's reactivity by mutating arrays in place via splice on the
existing reactive references that Bricks owns — every property we
touch (`element.settings._cssGlobalClasses`, `element.label`,
`state.globalClasses`) is already reactive because it was created
inside Vue's reactive context. No fake-mutation hack needed.


## 5. BEM grammar policy

A `Policy` is a plain object hydrated from the server, validated on
the client, and consumed by `bem.js`, `slugify.js`, and `reserved-names.js`.

```js
/**
 * @typedef {Object} Policy
 * @property {'two-dash'|'single-dash'} flavor
 *   'two-dash'    → block__element--modifier   (default)
 *   'single-dash' → block__element-modifier
 * @property {boolean} allowUnicode
 *   When true, slugify preserves non-ASCII letters and digits.
 *   When false (default), input is transliterated to ASCII or rejected.
 * @property {number} maxDepth
 *   Maximum subtree depth reBEMer will operate on. 0 = unlimited.
 *   Default 6 — anything deeper usually means the user picked the
 *   wrong root.
 * @property {string[]} reservedPrefixes
 *   Class-name prefixes that cannot be used as block names. Defaults
 *   to ['sf-', 'is-'] (the SLASHED utility namespace).
 * @property {string[]} reservedExact
 *   Exact class names that cannot be used. Defaults populated from
 *   data/inventory.json sf_classes + is_classes lists.
 * @property {RegExp} blockNameRe
 *   Block name acceptance regex. Default
 *   /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/  (lowercase kebab-case).
 * @property {RegExp} elementNameRe
 *   Element name acceptance regex (the part after __). Same default
 *   as blockNameRe.
 * @property {RegExp} modifierNameRe
 *   Modifier name acceptance regex (the part after -- or -). Same
 *   default as blockNameRe.
 */
```

The default policy is hard-coded in PHP (`Slashed_Bricks_ReBEMer_Policy::defaults()`),
filterable via `slashed_bricks/rebemer_policy`, and serialized into
`window.slashedReBEMer.policy` for the editor app.


## 6. Plan model

{% raw %}
```js
/**
 * @typedef {Object} Plan
 * @property {string} mode  'add'|'rename'|'replace'|'modifier'|'migrate'
 * @property {string} rootId Bricks element id of the subtree root.
 * @property {string} blockName Final block class name (slugified, validated).
 * @property {Operation[]} operations Per-element operations, in apply order.
 * @property {Policy} policy The policy used to build this plan.
 */

/**
 * @typedef {Object} Operation
 * @property {string} elementId
 * @property {'block'|'element'} role
 * @property {string} finalClassName e.g. 'card' or 'card__title' or 'card__title--lg'
 * @property {string[]} oldClassIds class ids currently on this element
 *                                  that the operation will detach
 * @property {string[]} keepClassIds class ids on this element that the
 *                                   operation will preserve
 * @property {ClassUpsert} upsert    the class entry to create/find
 * @property {{from:'element-settings', keys:string[]}|null} migrateFrom
 *           Set only on 'migrate' ops; lists the element-settings keys
 *           that will be moved into the new class' settings.
 * @property {string|null} newLabel  if labelSync is on, the new label
 * @property {boolean} skip          when true, the operation is recorded
 *                                   in the plan for transparency but
 *                                   applyPlan produces no mutations for
 *                                   this row; preflight ignores its
 *                                   old/new class ids; auto-numbering
 *                                   in §6.2 excludes it from the tally.
 * @property {string} suggestedFrom  'user' | 'element-type' | 'auto-number'
 *                                   — provenance tag for the row's name,
 *                                   used by the UI to show a "suggested"
 *                                   styling and by tests to assert which
 *                                   path produced the name.
 */

/**
 * @typedef {Object} ClassUpsert
 * @property {string} name        BEM class name
 * @property {Object} seedSettings if matching existing class, ignored;
 *                                 if creating new, used for initial settings
 *                                 (e.g. 'rename' carries over settings of the
 *                                  first old class)
 * @property {boolean} preferExisting if a global class with the same name
 *                                    already exists, attach to it rather than
 *                                    creating a duplicate
 */
```
{% endraw %}

### 6.1 buildPlan

`buildPlan` is a **pure function** of (subtree snapshot, mode, user
inputs, policy, existing global-classes list). It does no I/O and
mutates nothing. It is unit-tested with snapshot fixtures.

The result is fully serializable JSON, suitable for sending to the
preflight endpoint without any reshaping.

### 6.2 Sibling auto-numbering

When two or more operations within a single plan would produce the
same `finalClassName` (e.g. two `image` rows under one block both
suggesting `card__image`), `buildPlan` appends `-1`, `-2`, … in
document order to disambiguate. The numbering is **plan-local**:

- Skipped operations (`skip:true`) are excluded from the collision
  tally — a skipped row never claims a number.
- Collisions *against existing global classes* are still resolved by
  `upsert.preferExisting` (§6, ClassUpsert), independently of the
  in-plan numbering. The two mechanisms compose: the in-plan number
  is appended first, then the resulting name is matched against
  existing globals.
- A user-typed name (with `suggestedFrom === 'user'`) is treated as
  authoritative and never auto-numbered. If two user-typed names
  collide, that's a validation error (`code: 'in_plan_duplicate'`)
  reported under the offending row, not silently mangled.

### 6.3 Element-type pre-fill

When `buildPlan` is called for an `add` or `migrate` plan and a
descendant row has no user input yet, `element-types.suggestElementName`
provides the initial label. The provenance is recorded on the
operation (`suggestedFrom: 'element-type'`) so:

- The UI can render the input as "suggested" (lighter weight, italic
  placeholder) rather than as the user's own typing.
- Re-running `buildPlan` after the user explicitly edits a row
  preserves the user's value (because `suggestedFrom` becomes
  `'user'`).
- Auto-numbering only competes among `'element-type'` and
  `'auto-number'` rows (see §6.2).


## 7. Transactional apply (snapshot + rollback)

`applyPlan(plan, bricksApi)` does the following, in order:

1. **Snapshot.** `bricksApi.snapshot(plan.operations)` returns a
   `Snapshot` describing the pre-change state of:
   - `state.globalClasses` (deep-cloned via `structuredClone`),
   - per-touched-element: `_cssGlobalClasses` (clone), `label` (string),
     and (for migrate ops) the migrating settings keys (cloned).
2. **Validate.** Each `Operation` is validated against the live state
   (e.g. element still exists, old classes still match). Any failure
   short-circuits to an `INVALID` result with no mutations performed.
3. **Apply.** Operations are applied in order. Each mutation is
   idempotent: re-applying the same plan to the post-state is a no-op.
4. **On throw.** Any thrown error during step 3 triggers `restore`:
   - `state.globalClasses` is replaced (by index splice) with the
     snapshot value;
   - each touched element's `_cssGlobalClasses`, `label`, and migrated
     settings keys are restored from the snapshot.
   The error propagates as `ApplyResult { ok:false, error }`.
5. **Push to undo stack.** On success, the snapshot is pushed to the
   in-panel undo ring buffer (max 5 entries). The user can press Cmd-Z
   while the panel is open to restore.

The snapshot footprint is small: only mutated elements and the
globalClasses list. We deliberately do **not** snapshot the entire
state — that would be expensive and unnecessary.

Idempotency rule: every Operation carries enough information to be
re-applied without effect. This makes "apply twice" safe (e.g. if a
network blip causes a UI retry) and makes restore implementations
straightforward.


## 8. Reference-count preflight (REST contract)

The preflight is the single trip to the server. It exists for one
reason: the client knows what's in the current page, but it does not
know whether classes are in use across **other pages and templates**.
The server can answer that with one read of `bricks_global_classes`
plus a scan of post meta for elements referencing each class id.

### 8.1 Endpoint

`POST /wp-json/slashed-bricks/v1/rebemer/preflight`

Headers:
- `X-WP-Nonce: <wp_create_nonce('wp_rest')>` (sent automatically by
  the editor app, server verifies via core).
- `Content-Type: application/json`.

Permission: `current_user_can('bricks_full_access') || current_user_can('manage_options')`.

### 8.2 Request body

```json
{
  "rootId": "abc123",
  "currentPostId": 42,
  "subtreeElementIds": ["abc123", "def456", ...],
  "operations": [
    {
      "elementId": "def456",
      "oldClassIds": ["xyz1", "xyz2"],
      "finalClassName": "card__title"
    },
    ...
  ]
}
```

### 8.3 Response

```json
{
  "referenceCounts": {
    "xyz1": { "name": "title", "outsideSubtreeOnPage": 2, "otherPosts": 3 },
    "xyz2": { "name": "wrap",  "outsideSubtreeOnPage": 0, "otherPosts": 0 }
  },
  "nameCollisions": [
    {
      "finalClassName": "card__title",
      "existingClassId": "abc9",
      "match": "byName",
      "recommendedAction": "attach"
    }
  ],
  "reservedHits": [
    { "finalClassName": "sf-stack", "reason": "reservedExact" }
  ]
}
```

The `recommendedAction` field on each `nameCollisions` entry is one
of:

- `"attach"` — the existing class with this name is already on the
  target element (or is shape-compatible and the user is in `add`
  mode); the row should auto-prefer it via `upsert.preferExisting`
  rather than create a duplicate. The UI surfaces a one-click "use
  existing" affordance per row.
- `"rename"` — the existing class is *not* on this element but its
  settings shape conflicts with what the operation would create; the
  user should pick a different name. The UI shows an inline warning
  and blocks apply for that row.
- `"replace"` — destructive: applying would detach the old class from
  this subtree while leaving the existing global. Allowed, but the
  destructive-confirm modal is required (§3.4 destructive flow).

The recommendation is advisory: the client decides what to do with
it. The server never mutates state, only reports.


### 8.4 Server-side implementation notes

- Reads `bricks_global_classes` once (cached for the request).
- Reads element references via the `bricks_get_posts_with_elements`
  helper if available, else a `WP_Query` over post types Bricks edits
  with a `meta_query` on `_bricks_page_content_2`. The exact strategy
  is encapsulated inside `Slashed_Bricks_ReBEMer_REST::count_references()`.
- Caches the per-class reference counts for the duration of the
  request only — never persists.
- Returns deterministic JSON: keys sorted, no PHP `Inf` / `NaN`.
- Hard cap on input size: `subtreeElementIds.length <= 5000`,
  `operations.length <= 5000`, JSON body <= 1 MiB. Over the cap →
  `400 too_large`.
- All output strings escaped through `esc_html`/`sanitize_key` as
  appropriate before being put on the wire.

### 8.5 What preflight does NOT do

- It does **not** mutate any option.
- It does **not** persist a plan or audit entry (that's a separate
  endpoint behind a setting, deferred to v1.1).
- It does **not** validate BEM grammar — that's the client's job
  (the client has the `Policy`).

The endpoint is read-only, idempotent, side-effect-free.

## 9. Threat model

The reBEMer attack surface is small but not zero.

| Surface | Risk | Mitigation |
|---|---|---|
| `class-rebemer-enqueue.php` enqueueing JS in builder | XSS via `wp_localize_script` data | Server-side `wp_json_encode` with proper escaping; no user-controlled HTML. |
| `class-rebemer-rest.php` preflight endpoint | CSRF, capability bypass | `wp_rest` nonce + capability check. Hard input caps. JSON-only body. |
| Editor-app reading `__vue_app__` | Bricks update breaks | Single seam, feature-detect, fail-soft notice. |
| `applyPlan` mutating state | Half-applied state on throw | Snapshot/rollback. |
| LocalStorage tampering | User attacks themselves | Schema-validate on read, fall back to defaults. |
| Class-name input | XSS in builder UI | All names slugified before insertion; builder DOM never receives raw input. |
| Reserved-name bypass | User picks `sf-stack` and breaks site | Client-side reserved-names check + server-side preflight check (defense in depth). |
| Unbounded preflight payload | DoS | 1 MiB body cap, 5000-element cap. |
| Bricks introducing a new style key | Migrate-ID-styles silently mis-classifies | Allowlist (not denylist); unknown keys are NOT migrated; logged in a panel-side warning. |


## 10. Reserved-name guard

A class name is **reserved** when:

1. It exactly matches an entry in `policy.reservedExact`. The default
   list is built from `data/inventory.json`'s `sf_classes` and
   `is_classes` — every SLASHED utility class.
2. It starts with any string in `policy.reservedPrefixes`. Default:
   `['sf-', 'is-']`.
3. It would shadow a CSS keyword (`auto`, `inherit`, `initial`,
   `unset`, `revert`, `revert-layer`) — these are always blocked.

The guard runs in two places:

- **Client-side** in `bem.js` / `reserved-names.js`, before the
  preflight call, so the user gets immediate inline feedback.
- **Server-side** in the preflight endpoint, listed in
  `reservedHits`, so a tampered client cannot bypass it.

Both checks consult the same canonical list, exposed by
`Slashed_Bricks_ReBEMer_Policy::reserved_names()`.

## 11. ID generation

The original `samirhp` plugin uses `Math.random().toString(36).slice(2,8)`.
That gives 6 base36 chars ≈ 2.18 billion possible ids; birthday
collisions become realistic at ~46k entries.

reBEMer uses `crypto.randomUUID()` (universally available in modern
browsers and in WP admin contexts), takes the first 8 characters of
the hex (after stripping dashes), and **retries on collision**:

```js
export function newClassId(existingIds) {
  const set = existingIds instanceof Set ? existingIds : new Set(existingIds);
  for (let attempt = 0; attempt < 16; attempt++) {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    if (!set.has(id)) return id;
  }
  throw new Error('rebemer:id_collision_exhausted');
}
```

The 8-char prefix matches Bricks' own class-id length convention.
Sixteen retries is a safety upper bound that we should never hit in
practice.


## 12. Undo

reBEMer maintains its own snapshot ring buffer (`undo.js`), separate
from Bricks' history. Reasons:

- Bricks' history is undocumented. Pushing onto it is best-effort,
  not a guarantee.
- Users expect a single Cmd-Z to revert *the whole reBEMer
  operation*, not piece-by-piece.
- If we *can* push onto Bricks' history (probed from `bricks-api.js`),
  we do — and our internal undo becomes a backup. If we can't, our
  ring buffer is the only undo path.

Behavior:

- Snapshot ring buffer holds **5** snapshots, FIFO.
- The buffer is per-page-load (resets on builder reload).
- Cmd/Ctrl-Z while a reBEMer panel is open and focused → pops the
  most recent snapshot and restores from it. The popped snapshot is
  *not* re-pushed (no redo in v1).
- Closing the panel does **not** clear the buffer; reopening for the
  same subtree restores access to past snapshots.
- The buffer is in-memory only. No persistence, no localStorage.

Outside the panel, Bricks' own Cmd-Z behavior is unchanged.

## 13. Internationalization

All user-facing strings live in PHP via `__('...', 'slashed-bricks')`
and are passed to JS through the `i18n` block of
`window.slashedReBEMer`:

```php
'i18n' => array(
    'panelTitle'         => __( 'reBEMer · %s', 'slashed-bricks' ),
    'modeAdd'            => __( 'Add', 'slashed-bricks' ),
    'modeRename'         => __( 'Rename', 'slashed-bricks' ),
    'modeReplace'        => __( 'Replace', 'slashed-bricks' ),
    'modeModifier'       => __( 'Add modifier', 'slashed-bricks' ),
    'modeMigrate'        => __( 'Migrate ID styles', 'slashed-bricks' ),
    'apply'              => __( 'Apply', 'slashed-bricks' ),
    'cancel'             => __( 'Cancel', 'slashed-bricks' ),
    'reservedName'       => __( '%s is reserved by SLASHED.', 'slashed-bricks' ),
    'preflightOutsideUse'=> __( 'Class %1$s remains on %2$d element(s) outside this subtree.', 'slashed-bricks' ),
    // ... etc
),
```

The JS `__` helper performs `sprintf`-style replacement for `%s`,
`%d`, and `%1$s`/`%2$d` indexed placeholders.


## 14. Settings & persistence

| Setting | Where stored | Who reads it |
|---|---|---|
| Naming policy | PHP filter `slashed_bricks/rebemer_policy` (with safe defaults). Filterable from a child theme or plugin. | Hydrated into `window.slashedReBEMer.policy`; consumed by the editor app. |
| Reserved names | Generated from `data/inventory.json`. Filterable via `slashed_bricks/rebemer_reserved_names`. | Hydrated into `window.slashedReBEMer.reservedClassNames`. |
| User UI prefs (panel position, "show modifier" toggle, last-used mode) | `localStorage` key `slashed.rebemer.prefs` (validated with schema, defaults on miss). | Editor app only. |

There is **no** `wp_options` row owned by reBEMer in v1. Adding one is
trivial later if a settings UI is built.

## 15. Compatibility & feature detection

- **Bricks**: depends on `bricks_is_builder_main()` and the Vue app
  exposing `__vue_app__`. We **probe** for both. If either is missing,
  reBEMer does not enqueue (PHP) or does not inject the badge (JS).
- **Browsers**: target = ES2020 (matches admin-app). Requires
  `crypto.randomUUID`, `structuredClone`, `AbortController`, and Vue 3.
  These are all available in every browser Bricks supports.
- **PHP**: 7.4+, matches plugin baseline.
- **WordPress**: 6.0+, matches plugin baseline.
- **REST**: standard `rest_api_init` registration; no custom auth.

## 16. Testing strategy

### 16.1 Unit (Vitest)

Pure modules:

- `slugify.test.js` — ASCII vs Unicode mode, edge cases (empty,
  whitespace-only, leading/trailing dashes, double dashes).
- `bem.test.js` — `validateName` accepts/rejects per default policy and
  per single-dash policy; reserved-name detection; max-depth honored.
- `plan.test.js` — `buildPlan` for each mode; idempotency; rename
  carries first old class settings forward; modifier mode never
  detaches old classes; migrate mode produces correct `migrateFrom`.
- `policy.test.js` — schema fallback when input is malformed,
  partial, or missing keys.
- `ids.test.js` — collision retry logic via `crypto.randomUUID` mock.


### 16.2 Integration (manual smoke checklist for v1)

A markdown checklist lives in `docs/rebemer-smoke.md` and is executed
by hand against a real Bricks install before each release. Topics:

- Badge appears on every structure-panel item, survives DOM rebuilds.
- Single-click opens panel, double-click placeholder no-ops in v1.
- Add / Rename / Replace / Add Modifier / Migrate flows produce the
  expected class names and attachments.
- Cmd-Z reverses the operation cleanly.
- Reserved-name input is rejected inline and at preflight.
- Closing the builder cleans up listeners (no zombie observers).
- Bricks update simulator (rename `__vue_app__` → `__vue_app2__`)
  triggers the fail-soft notice and prevents badge injection.

### 16.3 e2e (deferred)

Playwright is already a dev-dependency at the repo root. A reBEMer
spec is out of scope for v1 but the test list is captured in
`tests/rebemer/PLAN.md` as future work.

## 17. Glossary of acronyms used

- **BEM** — Block-Element-Modifier methodology by Yandex.
- **PUC** — Plugin Update Checker (Yahnis Elsts' library, used by the
  original samirhp plugin; reBEMer does not use it).
- **REST** — WordPress REST API.
- **SPA** — Single-Page App, the existing admin-app pattern.
