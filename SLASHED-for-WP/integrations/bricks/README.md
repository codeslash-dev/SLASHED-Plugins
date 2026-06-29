# SLASHED for Bricks

Integrates the [SLASHED](https://github.com/codeslash-dev/SLASHED) cascade-layer
CSS framework with [Bricks Builder](https://bricksbuilder.io/).

## Features

- **CSS loading** — enqueues the SLASHED bundle on the frontend and in the
  Bricks editor canvas iframe (not the builder chrome).
- **Variable pickers** — registers every `--sf-*` custom property in the active
  bundle (572 in `essential`, 812 in `optimal`/`full`) with the Bricks variable
  pickers and code-editor autocomplete, grouped by category.
- **Class autocomplete** — registers every `.sf-*` and `.is-*` class with the
  Bricks class input under "SLASHED Layout" and "SLASHED State".
- **Variable-picker swatches** — paints a colour square next to each
  `--sf-color-*` picker entry from a server-resolved hex map (builder-side only,
  fail-silent). Toggle: `slashed_bricks/show_color_swatches`.
- **Color System panel** — floating in-builder browser for every `--sf-color-*`
  token. Each swatch previews both light and dark variants; the Light/Dark
  toggle drives the canvas `[data-theme]`. Picking a swatch copies its
  `var(--sf-color-*)` reference and applies it to the selected element's target
  (background / text / border). Hex previews are server-resolved
  (`Slashed_Bricks_Color_Resolver`). Toggle: `slashed_bricks/show_color_panel`.
- **reBEMer** — subtree-scoped BEM class manager in the structure panel:
  add / rename / replace / add-modifier / migrate-ID-styles for an element and
  its children, with a read-only reference check (`GET /rebemer/unused`) and a
  reserved-name guard against SLASHED utilities. See
  [docs/rebemer.md](../../../docs/rebemer.md).
- **Dynamic detection** — the loaded bundle is parsed at runtime, so
  registrations stay in sync with the active bundle and SLASHED release. No
  hand-curated list.

## Requirements

- WordPress 6.4+, PHP 7.4+
- Bricks Builder 1.9.2+ (Variables 1.9.8+, Classes 1.9.5+)
- SLASHED CSS framework (via the `dist/slashed.optimal.css` bundle)

## Installation

Copy `integrations/bricks/` into `wp-content/plugins/slashed-bricks`, or symlink
it for development, then activate in **Admin → Plugins**. The framework CSS ships
with the plugin and loads locally from its bundled `dist/` folder.

## Filter hooks

#### `slashed_bricks/css_bundle_url`

Override the CSS bundle URL.

```php
add_filter( 'slashed_bricks/css_bundle_url', fn( $url ) =>
    'https://cdn.example.com/slashed/slashed.optimal.css' );
```

#### `slashed_bricks/registered_classes`

Filter the class array before registration.

```php
add_filter( 'slashed_bricks/registered_classes', fn( $classes ) =>
    array_filter( $classes, fn( $c ) => $c['category'] !== 'SLASHED State' ) );
```

#### `slashed_bricks/show_color_swatches`

Toggle variable-picker colour swatches (default `true`). `false` also skips
localising the hex map.

```php
add_filter( 'slashed_bricks/show_color_swatches', '__return_false' );
```

#### `slashed_bricks/show_color_panel`

Toggle the Color System panel (default `true`). `false` skips localising its
token list and hex maps.

```php
add_filter( 'slashed_bricks/show_color_panel', '__return_false' );
```

#### `slashed_bricks/registered_variables`

Filter the final CSS-variable entry array before registration.

```php
add_filter( 'slashed_bricks/registered_variables', function( $variables ) {
    unset( $variables['Z-Index'] );
    return $variables;
} );
```

#### `slashed_bricks/variables`

Filter the raw grouped variable map (category → `--sf-*` names), lower-level
than `registered_variables`.

#### `slashed_bricks/inventory`

Replace the resolved inventory. Expects
`['variables' => string[], 'sf_classes' => string[], 'is_classes' => string[]]`.

```php
add_filter( 'slashed_bricks/inventory', function( $inventory ) {
    $inventory['variables'][] = '--sf-color-my-custom';
    return $inventory;
} );
```

#### `slashed_bricks/inventory_local_path`

Override the local CSS path the inventory parses: return a string for a specific
path, `false` to skip local resolution, `null` (default) for the bundled candidates.

```php
add_filter( 'slashed_bricks/inventory_local_path', fn() =>
    get_stylesheet_directory() . '/assets/slashed.optimal.css' );
```

## Architecture

```
integrations/bricks/
  slashed-bricks.php             Bootstrap: guards, constants, loader
  data/inventory.json            Fallback inventory
  includes/
    class-css-parser.php         Parses --sf-* properties + .sf-/.is- selectors
    class-inventory.php          Resolves the active bundle and categorizes
    class-enqueue.php            CSS enqueue (frontend + editor iframe)
    class-variables.php          Variable registration for pickers
    class-classes.php            Class registration for autocomplete
    class-color-resolver.php     Server-side light/dark hex resolution
    class-rebemer-enqueue.php    reBEMer editor-app enqueue
    class-rebemer-rest.php       reBEMer REST (GET /rebemer/unused)
  editor-app/                    Svelte editor app (reBEMer + Color panel)
  admin-app/                     Svelte admin SPA
```

### How it works

1. **Bootstrap** — checks Bricks is active, defines constants, loads classes.
2. **Enqueue** — loads the bundle on `wp_enqueue_scripts` for the frontend and
   builder canvas; bails when `bricks_is_builder_main()` is true so the bundle
   never overrides Bricks' own chrome.
3. **Inventory** — resolves the active bundle (bundled local file → built-in
   fallback), parses it once, and caches via WordPress transients keyed by file
   mtime. All registration classes share one process-local cache.
4. **Variables** — injects into the Global Variable Manager (Bricks 1.9.8+) by
   filtering `bricks_global_variables`(`_categories`) on read and stripping on
   save. Names use a `slashed-` prefix that chains back to `var(--sf-*)`.
5. **Classes** — injects `.sf-*`/`.is-*` into the Global Class Manager
   (Bricks 1.9.5+) on the same read/strip pattern, each shipped
   `settings.locked = true`. CSS rules still come from the bundle.

### Inventory resolution order

1. Bundled local file `dist/slashed.optimal.css` (transient keyed by mtime).
2. Built-in `data/inventory.json` (used if the bundle file can't be read).

Short-circuit step 1 with `slashed_bricks/inventory_local_path`, or replace the
result with `slashed_bricks/inventory`.

### Regenerating the fallback inventory

```bash
npm run build        # rebuilds dist/ and regenerates inventory.json
npm run inventory    # regenerate inventory.json only
```

## CSS bundle

Defaults to `dist/slashed.optimal.css` from jsDelivr, pinned to an immutable
ref. Standalone mode builds the URL from `SLASHED_BRICKS_DIST_SHA`; under the
unified plugin the shared loader pins to `SLASHED_CSS_REF`. A detected local
bundle takes precedence. Switch bundles or override the ref with
`slashed_bricks/css_bundle_url`.

## License

MIT — same as the SLASHED framework.
