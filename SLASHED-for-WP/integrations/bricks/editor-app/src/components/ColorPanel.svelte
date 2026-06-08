<script>
  /**
   * Color System panel — two modes, one component.
   *
   * Reference mode (opened from the badge launcher):
   *   Click a swatch → copies var() to clipboard, shows a toast.
   *   No element targeting, no Apply-to chips.
   *
   * Picker mode (opened from the SF Colors icon inside a Bricks colour field):
   *   Click a swatch → calls onPickValue() which writes the var() into the
   *   specific Bricks input that triggered the panel, then closes. The target
   *   is already determined by which field was clicked; no Apply-to UI needed.
   *
   * Layout (when not searching):
   *   QUICK USE  — ~30 curated tokens in a 2-col grid, grouped by design role
   *                (Typography, Surfaces, Structure, Brand, Feedback). Covers
   *                ≥90 % of colour picks on business / portfolio / e-comm sites.
   *   PALETTE    — Brand (6) + Status (5) families as a compact scanner table.
   *                Each row: base swatch + name + 5 key alias previews.
   *                Click to expand → base banner + aliases grid + scale strip
   *                + alpha (collapsed). Only one family open at a time.
   *
   * When query is non-empty the panel shows filtered results from the full
   * 275-token model (same group/section/grid rendering as before).
   */
  import { onMount } from 'svelte';
  import {
    buildColorModel,
    buildQuickUseModel,
    filterModel,
    swatchValue,
  } from '../lib/color-model.js';
  import ColorSwatch from './ColorSwatch.svelte';
  import Toast from './Toast.svelte';

  /**
   * Reference vs picker mode is derived from whether an `onPickValue`
   * callback is supplied (picker mode) — there is no separate flag.
   *
   * @type {{
   *   source: { variables: string[], light: object, dark: object },
   *   onClose?: () => void,
   *   onPick?: () => void,
   *   onPickValue?: (value: string) => void,
   *   dockedLeft?: number | null,
   * }}
   */
  let {
    source,
    onClose,
    onPick,
    onPickValue,
    dockedLeft = null,
  } = $props();

  const pickerMode = $derived(typeof onPickValue === 'function');

  const MODES = [
    { id: 'both',  label: 'Both'  },
    { id: 'light', label: 'Light' },
    { id: 'dark',  label: 'Dark'  },
  ];

  // The 5 aliases shown in each scanner row's preview strip.
  const PREVIEW_WANT = ['Hover', 'Active', 'Subtle', 'Ghost', 'Superlight'];

  let mode           = $state('both');
  let query          = $state('');
  let toast          = $state(null);
  let expandedFamily = $state(null);
  let alphaOpen      = $state(new Set());

  const fullModel        = $derived(buildColorModel(source?.variables, source?.light, source?.dark));
  const normalizedQuery  = $derived(query.trim());
  const filtered         = $derived(filterModel(fullModel, normalizedQuery));
  const quickModel       = $derived(buildQuickUseModel(source?.variables, source?.light, source?.dark));
  const totalTokens = $derived(fullModel.groups.reduce((n, g) => n + g.count, 0));

  const brandGroups  = $derived(fullModel.groups.filter(g => g.type === 'brand'));
  const statusGroups = $derived(fullModel.groups.filter(g => g.type === 'status'));

  // ── Canvas theme preview ─────────────────────────────────────────────────
  let _canvasOriginal;
  function canvasRoot() {
    if (typeof document === 'undefined') return null;
    const iframe = document.querySelector(
      'iframe#bricks-builder-iframe, iframe[name="bricks-builder-iframe"], #bricks-builder-area iframe'
    );
    try { return iframe?.contentDocument?.documentElement ?? null; }
    catch { return null; }
  }
  function applyCanvasTheme(nextMode) {
    const root = canvasRoot();
    if (!root) return;
    try {
      if (_canvasOriginal === undefined) _canvasOriginal = root.getAttribute('data-theme');
      if (nextMode === 'light' || nextMode === 'dark') {
        root.setAttribute('data-theme', nextMode);
      } else if (_canvasOriginal === null) {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', _canvasOriginal);
      }
    } catch { /* silent */ }
  }
  function restoreCanvasTheme() {
    const root = canvasRoot();
    if (!root || _canvasOriginal === undefined) return;
    try {
      if (_canvasOriginal === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', _canvasOriginal);
    } catch { /* ignore */ }
  }
  function setMode(next) { mode = next; applyCanvasTheme(next); }
  onMount(() => () => restoreCanvasTheme());

  // ── Clipboard ────────────────────────────────────────────────────────────
  async function copyText(text) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fall through */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch { return false; }
  }

  // ── Pick ─────────────────────────────────────────────────────────────────
  async function pick(swatch) {
    const value = swatchValue(swatch);

    if (pickerMode) {
      const ok = onPickValue(value);
      if (ok === false) {
        toast = { kind: 'error', message: `Couldn't apply ${value} — input not found` };
        return;
      }
      onPick?.();
      return;
    }

    const copied = await copyText(value);
    toast = copied
      ? { kind: 'info',  message: `Copied — ${swatch.name}` }
      : { kind: 'error', message: `Couldn't copy ${value}` };
  }

  // ── Accordion ────────────────────────────────────────────────────────────
  function toggleFamily(id) {
    expandedFamily = expandedFamily === id ? null : id;
    alphaOpen = new Set();
  }
  function toggleAlpha(id) {
    const next = new Set(alphaOpen);
    if (next.has(id)) next.delete(id); else next.add(id);
    alphaOpen = next;
  }

  // ── Family helpers ───────────────────────────────────────────────────────
  function sec(group, id) { return group.sections.find(s => s.id === id); }

  function baseSwatch(group) {
    return sec(group, 'scale')?.swatches[0] ?? null;
  }

  function previewAliases(group) {
    const alias = sec(group, 'alias');
    if (!alias?.swatches.length) return [];
    const found = PREVIEW_WANT
      .map(w => alias.swatches.find(s => s.label === w))
      .filter(Boolean);
    return found.length ? found : alias.swatches.slice(0, 5);
  }

  // 50–950 without the base swatch.
  function scaleSwatches(group) {
    return sec(group, 'scale')?.swatches.slice(1) ?? [];
  }

  function handleKeydown(e) { if (e.key === 'Escape') onClose?.(); }
</script>

<!--
  Shared family-scanner markup for the Brand and Status palette sections.
  Defined once as a snippet and rendered twice (with brandGroups /
  statusGroups) so the two sections can never drift apart.
-->
{#snippet familyScanner(groups)}
  <div class="slashed-cp__scanner">
    {#each groups as grp (grp.id)}
      {@const base     = baseSwatch(grp)}
      {@const previews = previewAliases(grp)}
      {@const isOpen   = expandedFamily === grp.id}
      <div class="slashed-cp__scan-item">
        <button
          type="button"
          class="slashed-cp__scan-row"
          class:slashed-cp__scan-row--open={isOpen}
          aria-expanded={isOpen}
          onclick={() => toggleFamily(grp.id)}
        >
          {#if base}
            <span class="slashed-cp__scan-base" style="--sw-l: {base.light}; --sw-d: {base.dark}"></span>
          {/if}
          <span class="slashed-cp__scan-name">{grp.label}</span>
          <span class="slashed-cp__scan-tagline">{grp.tagline}</span>
          <span class="slashed-cp__scan-pre" aria-hidden="true">
            {#each previews as p (p.var)}
              <span class="slashed-cp__scan-pre-sw" style="--sw-l: {p.light}; --sw-d: {p.dark}" title={p.label}></span>
            {/each}
          </span>
          <span class="slashed-cp__scan-chev" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
        </button>

        {#if isOpen}
          {@const aliasSec = sec(grp, 'alias')}
          {@const strip    = scaleSwatches(grp)}
          {@const alphaSec = sec(grp, 'alpha')}
          <div class="slashed-cp__fam">
            {#if base}
              <button
                type="button"
                class="slashed-cp__fam-banner"
                style="--sw-l: {base.light}; --sw-d: {base.dark}"
                title="{grp.label} base — {base.name}"
                onclick={() => pick(base)}
              >
                <span class="slashed-cp__fam-banner-lbl">{grp.label}</span>
              </button>
            {/if}

            {#if aliasSec?.swatches.length}
              <p class="slashed-cp__fam-sec">Aliases · {aliasSec.swatches.length}</p>
              <div class="slashed-cp__grid">
                {#each aliasSec.swatches as s (s.var)}
                  <div class="slashed-cp__cell">
                    <ColorSwatch swatch={s} {mode} onPick={pick} />
                    <span class="slashed-cp__cap">{s.label}</span>
                  </div>
                {/each}
              </div>
            {/if}

            {#if strip.length}
              <p class="slashed-cp__fam-sec">Scale <span class="slashed-cp__fam-sec-range">50 → 950</span></p>
              <div class="slashed-cp__strip">
                {#each strip as s (s.var)}
                  <button
                    type="button"
                    class="slashed-cp__strip-sw"
                    title="{s.label} — {s.name}"
                    style="--sw-l: {s.light}; --sw-d: {s.dark}"
                    onclick={() => pick(s)}
                  ></button>
                {/each}
              </div>
            {/if}

            {#if alphaSec?.swatches.length}
              <button type="button" class="slashed-cp__alpha-btn" onclick={() => toggleAlpha(grp.id)}>
                <span aria-hidden="true">{alphaOpen.has(grp.id) ? '▾' : '▸'}</span>
                Transparent a5 → a95
              </button>
              {#if alphaOpen.has(grp.id)}
                <div class="slashed-cp__strip slashed-cp__strip--alpha">
                  {#each alphaSec.swatches as s (s.var)}
                    <button
                      type="button"
                      class="slashed-cp__strip-sw slashed-cp__strip-sw--alpha"
                      title="{s.label} — {s.name}"
                      style="--sw-l: {s.light}; --sw-d: {s.dark}"
                      onclick={() => pick(s)}
                    ></button>
                  {/each}
                </div>
              {/if}
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/snippet}

<svelte:window onkeydown={handleKeydown} />

<div
  class="slashed-cp"
  class:slashed-cp--docked={pickerMode}
  data-mode={mode}
  style={pickerMode && dockedLeft != null ? `--cp-dock-left: ${dockedLeft}px` : ''}
  role="dialog"
  aria-modal="false"
  aria-label="SLASHED Color System"
  tabindex="-1"
  onclick={(e) => e.stopPropagation()}
  onmousedown={(e) => e.stopPropagation()}
  onpointerdown={(e) => e.stopPropagation()}
  ontouchstart={(e) => e.stopPropagation()}
>
  <header class="slashed-cp__header">
    <h2 class="slashed-cp__title">Color System</h2>
    <div class="slashed-cp__seg" role="group" aria-label="Preview mode">
      {#each MODES as m (m.id)}
        <button
          type="button"
          class="slashed-cp__seg-btn"
          class:slashed-cp__seg-btn--on={mode === m.id}
          aria-pressed={mode === m.id}
          onclick={() => setMode(m.id)}
        >{m.label}</button>
      {/each}
    </div>
    <button type="button" class="slashed-cp__close" aria-label="Close" onclick={() => onClose?.()}>×</button>
  </header>

  <div class="slashed-cp__toolbar">
    <input
      type="text"
      class="slashed-cp__search"
      placeholder={`Search ${totalTokens} tokens…`}
      bind:value={query}
      aria-label="Search colour tokens"
    />
  </div>

  <div class="slashed-cp__body">

    {#if normalizedQuery}

      <!-- ── SEARCH RESULTS ──────────────────────────────────────────── -->
      {#if filtered.groups.length === 0}
        <p class="slashed-cp__empty">No tokens match "{normalizedQuery}".</p>
      {/if}
      {#each filtered.groups as group (group.id)}
        <section class="slashed-cp__group" data-type={group.type}>
          <div class="slashed-cp__group-head">
            <h3 class="slashed-cp__group-title">
              {group.label}
              {#if group.tagline}<span class="slashed-cp__group-tag">{group.tagline}</span>{/if}
              <span class="slashed-cp__group-count">{group.count}</span>
            </h3>
          </div>
          {#each group.sections as section (section.id)}
            {#if section.label}<p class="slashed-cp__section-label">{section.label}</p>{/if}
            {#if group.type === 'semantic'}
              <ul class="slashed-cp__list">
                {#each section.swatches as swatch (swatch.var)}
                  <li class="slashed-cp__list-item">
                    <ColorSwatch {swatch} {mode} onPick={pick} />
                    <span class="slashed-cp__list-name">{swatch.label}</span>
                    <code class="slashed-cp__list-var">{swatch.name}</code>
                  </li>
                {/each}
              </ul>
            {:else}
              <div class="slashed-cp__grid">
                {#each section.swatches as swatch (swatch.var)}
                  <div class="slashed-cp__cell">
                    <ColorSwatch {swatch} {mode} onPick={pick} />
                    <span class="slashed-cp__cap">{swatch.label}</span>
                  </div>
                {/each}
              </div>
            {/if}
          {/each}
        </section>
      {/each}

    {:else}

      <!-- ── QUICK USE ────────────────────────────────────────────────── -->
      <div class="slashed-cp__sec">
        <p class="slashed-cp__sec-title">Quick Use</p>
        {#each quickModel.groups as qg (qg.id)}
          <div class="slashed-cp__qu-group">
            <p class="slashed-cp__qu-label">{qg.label}</p>
            <div class="slashed-cp__qu-grid">
              {#each qg.swatches as swatch (swatch.var)}
                <button
                  type="button"
                  class="slashed-cp__qu-cell"
                  title={swatch.name}
                  onclick={() => pick(swatch)}
                >
                  <span
                    class="slashed-cp__qu-sw"
                    class:slashed-cp__qu-sw--alpha={swatch.alpha}
                    style="--sw-l: {swatch.light}; --sw-d: {swatch.dark}"
                  ></span>
                  <span class="slashed-cp__qu-name">{swatch.label}</span>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <!-- ── PALETTE ──────────────────────────────────────────────────── -->
      <div class="slashed-cp__sec slashed-cp__sec--pal">
        <p class="slashed-cp__sec-title">Palette</p>

        <!-- Brand families -->
        <p class="slashed-cp__pal-cat">Brand</p>
        {@render familyScanner(brandGroups)}

        <!-- Status families -->
        <p class="slashed-cp__pal-cat">Status</p>
        {@render familyScanner(statusGroups)}
      </div>

    {/if}
  </div>

  <footer class="slashed-cp__footer">
    {#if mode === 'both'}
      <span aria-hidden="true" class="slashed-cp__legend">
        <span class="slashed-cp__legend-sw"></span> light / dark
      </span>
    {/if}
    <span class="slashed-cp__hint">
      {pickerMode ? 'Click to insert' : 'Click to copy'} <code>var()</code>
    </span>
  </footer>
</div>

{#if toast}
  <Toast kind={toast.kind} message={toast.message} onDismiss={() => { toast = null; }} />
{/if}
