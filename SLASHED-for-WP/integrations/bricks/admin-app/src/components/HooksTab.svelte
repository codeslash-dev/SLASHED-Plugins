<script>
  /**
   * Static documentation tab listing all available filter hooks with
   * descriptions and PHP code examples, grouped by integration.
   */
  import { meta } from '../lib/stores.svelte.js';

  const bricksHooks = [
    {
      name: 'slashed_bricks/css_bundle_url',
      description: 'Override which CSS bundle URL to load.',
      params: '$url (string) - The current CSS bundle URL.',
      example: `add_filter( 'slashed_bricks/css_bundle_url', function( $url ) {
    // Load from a CDN instead.
    return 'https://cdn.example.com/slashed/slashed.optimal.css';
} );`,
    },
    {
      name: 'slashed_bricks/registered_classes',
      description: 'Filter the array of classes before registration with Bricks.',
      params: '$classes (array) - Array of class definitions with name and category.',
      example: `add_filter( 'slashed_bricks/registered_classes', function( $classes ) {
    // Remove state classes.
    return array_filter( $classes, function( $class ) {
        return $class['category'] !== 'slashed-cat-state';
    } );
} );`,
    },
    {
      name: 'slashed_bricks/registered_variables',
      description: 'Filter the CSS variables array before registration with Bricks.',
      params: '$variables (array) - Array of variable entries, each with id, name, value, and category (a slashed-cat-* id).',
      example: `add_filter( 'slashed_bricks/registered_variables', function( $variables ) {
    // Remove z-index variables.
    return array_filter( $variables, function( $variable ) {
        return $variable['category'] !== 'slashed-cat-z-index';
    } );
} );`,
    },
    {
      name: 'slashed_bricks/variables',
      description: 'Filter the raw grouped variable map (category label → --sf-* names) before it is turned into Bricks entries. Lower-level than registered_variables.',
      params: '$variables (array) - Map of category label to array of --sf-* names.',
      example: `add_filter( 'slashed_bricks/variables', function( $variables ) {
    // Drop a whole category from pickers + autocomplete.
    unset( $variables['Z-Index'] );
    return $variables;
} );`,
    },
    {
      name: 'slashed_bricks/inventory',
      description: 'Replace the resolved inventory wholesale. Useful for tests, custom forks of the framework, or sites that want to ship their own token list.',
      params: "$inventory (array) - Array with keys 'variables', 'sf_classes', 'is_classes'.",
      example: `add_filter( 'slashed_bricks/inventory', function( $inventory ) {
    $inventory['variables'][] = '--sf-color-my-custom';
    return $inventory;
} );`,
    },
    {
      name: 'slashed_bricks/inventory_local_path',
      description: 'Override the local CSS path the inventory parses. Return a string for a specific path, false to skip local resolution, or null (default) to use bundled candidates.',
      params: '$path (string|false|null) - Override path or control flag.',
      example: `// Use a child-theme copy of the bundle.
add_filter( 'slashed_bricks/inventory_local_path', function() {
    return get_stylesheet_directory() . '/assets/slashed.optimal.css';
} );`,
    },
    {
      name: 'slashed_bricks/show_color_swatches',
      description: 'Toggle the colour squares painted next to --sf-color-* entries in the Bricks variable-picker dropdown (builder-side only). Defaults to true.',
      params: '$show (bool) - Whether to paint the picker swatches.',
      example: `// Hide the variable-picker swatches.
add_filter( 'slashed_bricks/show_color_swatches', '__return_false' );`,
    },
    {
      name: 'slashed_bricks/show_color_panel',
      description: 'Toggle the in-builder Color System Panel and its launcher pill. Defaults to true.',
      params: '$show (bool) - Whether to load the Color System Panel.',
      example: `// Hide the Color System panel.
add_filter( 'slashed_bricks/show_color_panel', '__return_false' );`,
    },
  ];

  const bricksActive = $derived(meta.activeIntegrations?.bricks ?? true);
</script>

<section>
  <h2>Filter Hooks Reference</h2>
  <p class="hint">
    These WordPress filter hooks let you customize SLASHED integrations from your theme or a mu-plugin.
    Hooks only fire when their respective integration is active.
  </p>

  <!-- Bricks integration hooks -->
  <div class="group" class:group--inactive={!bricksActive}>
    <div class="group-header">
      <span class="group-title">Bricks integration</span>
      <span class="badge badge--bricks">Bricks</span>
      {#if !bricksActive}
        <span class="inactive-notice">Bricks integration is disabled — these hooks have no effect until it is turned on.</span>
      {/if}
    </div>

    {#each bricksHooks as hook (hook.name)}
      <div class="hook">
        <h3 class="hook__name"><code>{hook.name}</code></h3>
        <p class="hook__desc">{hook.description}</p>
        <p class="hook__params"><strong>Parameters:</strong> <code>{hook.params}</code></p>
        <pre class="hook__example"><code>{hook.example}</code></pre>
      </div>
    {/each}
  </div>
</section>

<style>
  h2 { margin-top: 0; }
  .hint { color: #50575e; margin-bottom: 20px; max-width: 720px; }

  .group {
    border: 1px solid #e2e4e7;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 20px;
  }
  .group--inactive {
    opacity: 0.6;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .group-title {
    font-weight: 600;
    font-size: 13px;
    color: #1d2327;
  }

  .badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .badge--bricks {
    background: #f0f4ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }

  .inactive-notice {
    font-size: 12px;
    color: #8c8f94;
    font-style: italic;
    flex-basis: 100%;
    margin-top: 2px;
  }

  .hook {
    border: 1px solid #f0f0f1;
    border-radius: 4px;
    padding: 16px;
    margin-bottom: 12px;
    background: #fcfcfd;
  }
  .hook:last-child { margin-bottom: 0; }

  .hook__name {
    margin: 0 0 8px;
    font-size: 14px;
  }
  .hook__name code {
    background: #e7e8ea;
    padding: 3px 8px;
    border-radius: 3px;
    font-size: 13px;
  }

  .hook__desc {
    margin: 0 0 8px;
    color: #1d2327;
    font-size: 14px;
  }

  .hook__params {
    margin: 0 0 12px;
    font-size: 13px;
    color: #50575e;
  }
  .hook__params code {
    background: #f0f0f1;
    padding: 1px 4px;
    border-radius: 2px;
    font-size: 12px;
  }

  .hook__example {
    margin: 0;
    padding: 12px;
    background: #1d2327;
    color: #e4e6e8;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 12px;
    line-height: 1.5;
  }
  .hook__example code {
    background: none;
    padding: 0;
    color: inherit;
  }
</style>
