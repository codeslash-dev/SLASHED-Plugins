<script>
  /**
   * Read-only tab listing all registered CSS custom properties grouped
   * by category. Categories mirror those in class-inventory.php:
   * Colors, Typography, Spacing, Sizing, Layout, Borders, Radius,
   * Shadows, Effects, Motion, Icons, Z-Index, States, Focus, Scroll,
   * Print, Fallback/Legacy, Misc.
   */
  import { meta } from '../lib/stores.svelte.js';

  const variables = meta.inventory?.variables ?? [];

  /**
   * First-segment to category mapping, mirrors class-inventory.php category_map().
   */
  const CATEGORY_MAP = {
    color: 'Colors',
    text: 'Typography', font: 'Typography', leading: 'Typography',
    tracking: 'Typography', body: 'Typography', heading: 'Typography',
    h1: 'Typography', h2: 'Typography', h3: 'Typography',
    h4: 'Typography', h5: 'Typography', h6: 'Typography',
    prose: 'Typography', code: 'Typography', optical: 'Typography', line: 'Typography',
    space: 'Spacing', gap: 'Spacing', gutter: 'Spacing', component: 'Spacing',
    section: 'Spacing', flow: 'Spacing', safe: 'Spacing', header: 'Spacing', sticky: 'Spacing',
    size: 'Sizing', aspect: 'Sizing', ratio: 'Sizing', touch: 'Sizing', object: 'Sizing',
    container: 'Layout', stack: 'Layout', cluster: 'Layout', sidebar: 'Layout',
    switcher: 'Layout', grid: 'Layout', cover: 'Layout', frame: 'Layout',
    reel: 'Layout', imposter: 'Layout', bento: 'Layout', box: 'Layout',
    center: 'Layout', content: 'Layout', breakout: 'Layout', divider: 'Layout', field: 'Layout',
    alternate: 'Layout', equal: 'Layout', col: 'Layout',
    border: 'Borders', stroke: 'Borders',
    radius: 'Radius',
    shadow: 'Shadows',
    blur: 'Effects', opacity: 'Effects', gradient: 'Effects', mask: 'Effects',
    perspective: 'Effects', drop: 'Effects', contrast: 'Effects',
    duration: 'Motion', ease: 'Motion', transition: 'Motion', motion: 'Motion', animation: 'Motion',
    icon: 'Icons',
    z: 'Z-Index',
    is: 'States', current: 'States', state: 'States',
    focus: 'Focus', caret: 'Focus',
    scroll: 'Scroll', scrollbar: 'Scroll',
    print: 'Print',
    // HSL channel triplets (--sf-{name}-h/-s/-l) backing core/tokens.color-fallbacks.css —
    // only consumed by the legacy hsl() fallback chain for browsers without
    // light-dark() / oklch(from …) support.
    primary: 'Fallback/Legacy', secondary: 'Fallback/Legacy', tertiary: 'Fallback/Legacy',
    action: 'Fallback/Legacy', neutral: 'Fallback/Legacy', base: 'Fallback/Legacy',
    success: 'Fallback/Legacy', warning: 'Fallback/Legacy', error: 'Fallback/Legacy',
    info: 'Fallback/Legacy', danger: 'Fallback/Legacy',
    truncate: 'Misc',
  };

  const CATEGORY_ORDER = [
    'Colors', 'Typography', 'Spacing', 'Sizing', 'Layout', 'Borders',
    'Radius', 'Shadows', 'Effects', 'Motion', 'Icons', 'Z-Index',
    'States', 'Focus', 'Scroll', 'Print', 'Fallback/Legacy', 'Misc',
  ];

  /**
   * Categorize a variable name using the same logic as PHP's categorize_variable().
   */
  function categorize(name) {
    let key = name;
    if (key.startsWith('--sf-')) key = key.slice(5);
    const dash = key.indexOf('-');
    const first = dash === -1 ? key : key.slice(0, dash);
    return CATEGORY_MAP[first] || 'Misc';
  }

  /**
   * Group all variables by category and return in display order.
   */
  function groupByCategory(vars) {
    const grouped = {};
    for (const v of vars) {
      const cat = categorize(v);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(v);
    }
    const ordered = [];
    for (const cat of CATEGORY_ORDER) {
      if (grouped[cat]?.length) {
        grouped[cat].sort();
        ordered.push({ category: cat, items: grouped[cat] });
      }
    }
    // Append any remaining categories not in the canonical order.
    for (const cat of Object.keys(grouped)) {
      if (!CATEGORY_ORDER.includes(cat) && grouped[cat]?.length) {
        grouped[cat].sort();
        ordered.push({ category: cat, items: grouped[cat] });
      }
    }
    return ordered;
  }

  const groups = groupByCategory(variables);

  let expanded = $state({});

  function toggle(category) {
    expanded[category] = !expanded[category];
  }
</script>

<section>
  <h2>CSS Variables ({variables.length})</h2>
  <p class="hint">
    All <code>--sf-*</code> custom properties declared in the active SLASHED bundle,
    grouped by category.
  </p>

  {#each groups as { category, items } (category)}
    <div class="category">
      <button
        type="button"
        class="category__toggle"
        onclick={() => toggle(category)}
        aria-expanded={expanded[category] ? 'true' : 'false'}
      >
        <span class="category__arrow">{expanded[category] ? '\u25BC' : '\u25B6'}</span>
        <span class="category__label">{category}</span>
        <span class="category__count">({items.length})</span>
      </button>

      {#if expanded[category]}
        <ul class="category__list">
          {#each items as varName (varName)}
            <li><code>{varName}</code></li>
          {/each}
        </ul>
      {/if}
    </div>
  {/each}
</section>

<style>
  h2 { margin-top: 0; }
  .hint { color: #50575e; margin-bottom: 16px; max-width: 720px; }
  .hint code {
    background: #f0f0f1;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 90%;
  }

  .category {
    border: 1px solid #f0f0f1;
    border-radius: 4px;
    margin-bottom: 4px;
    background: #fcfcfd;
  }

  .category__toggle {
    all: unset;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 12px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }
  .category__toggle:hover {
    background: #f6f7f7;
  }
  .category__toggle:focus-visible {
    outline: 2px solid #2271b1;
    outline-offset: 2px;
    border-radius: 4px;
  }

  .category__arrow {
    font-size: 10px;
    width: 14px;
    text-align: center;
  }

  .category__count {
    color: #787c82;
    font-weight: 400;
    font-size: 13px;
  }

  .category__list {
    list-style: none;
    margin: 0;
    padding: 0 12px 12px 34px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 4px;
  }

  .category__list li code {
    font-size: 12px;
    background: #f0f0f1;
    padding: 2px 6px;
    border-radius: 3px;
    word-break: break-all;
  }
</style>
