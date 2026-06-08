<script>
  /**
   * One row in the reBEMer panel — represents a single Bricks element
   * (the subtree root or a descendant).
   *
   * Responsibilities:
   *   - Render the include/skip toggle (the leftmost ☑/☐ in §6.2 of
   *     the design doc). Unchecked rows stay visible for transparency
   *     but produce no mutations at apply time.
   *   - Render the BEM name input + (in modifier mode) the modifier
   *     input. On user input, flip `row.suggestedFrom` to 'user' so
   *     the apply-time auto-numbering treats this name as authoritative.
   *   - Surface "use existing class" recommendations when the produced
   *     class name already exists in the global registry. Uses the
   *     post-numbering `finalClassName` passed in by the panel — the
   *     same name `apply.js` will actually attach — so the hint never
   *     disagrees with what apply does.
   *   - In migrate mode, render a chip strip listing the element-
   *     settings keys that will be lifted into the new global class,
   *     with copy that matches the migrate-mode merge/conflict rules
   *     in apply.js's validateMigrate().
   */

  import { slugify } from '../lib/slugify.js';

  let {
    row = $bindable(),
    mode,
    blockName,
    isRoot,
    rootId = '',
    globalClasses = [],
    /** Panel-level "Remove all existing classes" toggle. When true, a
     *  rename/replace row leaves the element with only the class(es) it
     *  creates. Used here only to make the row notes accurate. */
    removeExisting = false,
    /**
     * All class names apply.js will create/attach for this row: the
     * base finalClass plus any modifier classes. Empty array means the
     * row is skipped or has an invalid name. The panel derives this from
     * `buildPlan` so it always agrees with apply-time behavior.
     */
    finalClassNames = [],
  } = $props();

  // Modifier inputs are shown in all modes except migrate.
  const showModifier = $derived(mode !== 'migrate');
  const showMigrate = $derived(mode === 'migrate');
  const isMixed = $derived(mode === 'mixed');
  const prefix = $derived(!isRoot && blockName ? `${blockName}__` : '');

  /**
   * The effective operation for this row: in mixed mode it's the per-row
   * `row.op`; in the dedicated modes it's the panel mode itself (add for
   * migrate, which never shows the family UI). Drives the family-picker
   * block so dedicated Rename/Replace get the same per-row class targeting
   * that mixed mode already has.
   */
  const effectiveOp = $derived(
    isMixed
      ? (row.op ?? 'add')
      : (mode === 'rename' ? 'rename' : mode === 'replace' ? 'replace' : 'add')
  );

  /**
   * Class families present on this element: each entry is a non-modifier
   * class (base) plus a count of its modifier siblings on the same element.
   * Orphaned modifiers (no base sibling) surface as lone entries. Computed
   * whenever the row can target a family (rename/replace in any mode).
   */
  const currentFamilies = $derived.by(() => {
    if ((effectiveOp !== 'rename' && effectiveOp !== 'replace') || !Array.isArray(row.currentClassIds)) return [];
    const families = [];
    for (const id of row.currentClassIds) {
      const cls = globalClasses.find(c => c?.id === id);
      if (!cls || cls.name.includes('--')) continue;
      const modCount = row.currentClassIds.filter(mid => {
        const mc = globalClasses.find(c => c?.id === mid);
        return mc?.name.startsWith(cls.name + '--');
      }).length;
      families.push({ id: cls.id, name: cls.name, modCount });
    }
    // Orphaned modifiers with no base in the element's class list.
    for (const id of row.currentClassIds) {
      const cls = globalClasses.find(c => c?.id === id);
      if (!cls || !cls.name.includes('--')) continue;
      const baseName = cls.name.slice(0, cls.name.indexOf('--'));
      if (!families.some(f => f.name === baseName)) {
        families.push({ id: cls.id, name: cls.name, modCount: 0 });
      }
    }
    return families;
  });

  /** The family currently targeted by a rename op (for note text). */
  const selectedFamily = $derived(
    currentFamilies.find(f => f.id === row.renameFamilyId) ?? currentFamilies[0] ?? null
  );

  // Keep renameFamilyId pointing at a valid family for rename ops (any mode).
  // Replace leaves '' (— All classes —) as a valid default, so it isn't forced.
  $effect(() => {
    if (effectiveOp !== 'rename' || !currentFamilies.length) return;
    if (!currentFamilies.some(f => f.id === row.renameFamilyId)) {
      row.renameFamilyId = currentFamilies[0].id;
    }
  });

  /** Whether this row is a sub-block root (not the overall tree root). */
  const isSubBlockRoot = $derived(row.isBlockRoot === true && row.id !== rootId);
  /** Sub-block root toggle is available on all non-tree-root rows. */
  const canToggleBlockRoot = $derived(row.id !== rootId);

  /** Style suggested vs user-typed names differently so the user can
   *  see at a glance which rows reBEMer pre-filled. */
  const isSuggested = $derived(
    row.suggestedFrom === 'element-type' || row.suggestedFrom === 'fallback'
  );

  /**
   * Find an existing global class matching any of this row's preview
   * class names. Returns the first match, or null.
   */
  const existingClassMatch = $derived.by(() => {
    if (!finalClassNames.length || !row.include || !Array.isArray(globalClasses)) return null;
    for (const name of finalClassNames) {
      const found = globalClasses.find(c => c && c.name === name);
      if (found) return found;
    }
    return null;
  });

  /** True when all modifier inputs are empty (or there are none). */
  const allModifiersEmpty = $derived(
    !Array.isArray(row.modifiers) || row.modifiers.every(m => !slugify(m))
  );

  function markAsUserTyped() {
    if (row.suggestedFrom !== 'user') row.suggestedFrom = 'user';
  }

  /** Strip the leading underscore so the chip reads `padding` not `_padding`. */
  function chipLabel(key) {
    return key.startsWith('_') ? key.slice(1) : key;
  }
</script>

<div
  class="rebemer-row"
  class:rebemer-row--disabled={!row.include}
  class:rebemer-row--suggested={isSuggested}
  style="--rebemer-row-depth: {row.depth ?? 0}"
>
  <label class="rebemer-row__include" title="Include this row in the operation">
    <input type="checkbox" bind:checked={row.include} />
  </label>

  <div class="rebemer-row__meta">
    <span class="rebemer-row__label">{row.originalLabel}</span>
    {#if canToggleBlockRoot}
      <button
        type="button"
        class="rebemer-row__type rebemer-row__type--toggle"
        class:rebemer-row__type--block={isSubBlockRoot}
        title={isSubBlockRoot ? 'Sub-block root — click to revert to element' : 'Click to promote to block root'}
        onclick={() => { row.isBlockRoot = !row.isBlockRoot; }}
        disabled={!row.include}
      >{isSubBlockRoot ? 'BLOCK' : (row.bricksType || 'ELEM').toUpperCase()}</button>
    {:else}
      <span class="rebemer-row__type">BLOCK</span>
    {/if}
    {#if isSuggested && row.include}
      <span
        class="rebemer-row__hint"
        title="Pre-filled from {row.suggestedFrom === 'element-type' ? 'Bricks element type' : 'fallback'}"
      >suggested</span>
    {/if}
  </div>

  <div class="rebemer-row__inputs">
    <div class="rebemer-row__name">
      {#if prefix}<span class="rebemer-row__prefix">{prefix}</span>{/if}
      <input
        type="text"
        bind:value={row.name}
        oninput={markAsUserTyped}
        placeholder={isRoot ? 'block-name' : 'element-name'}
        disabled={!row.include}
        spellcheck="false"
        autocomplete="off"
      />
    </div>
    {#if showModifier}
      <div class="rebemer-row__modifiers">
        {#each row.modifiers as _mod, mi (mi)}
          <div class="rebemer-row__modifier-row">
            <input
              type="text"
              class="rebemer-row__modifier"
              bind:value={row.modifiers[mi]}
              placeholder="--modifier"
              disabled={!row.include}
              spellcheck="false"
              autocomplete="off"
            />
            {#if row.modifiers.length > 1}
              <button
                type="button"
                class="rebemer-row__modifier-remove"
                aria-label="Remove modifier"
                onclick={() => { row.modifiers = row.modifiers.filter((_, idx) => idx !== mi); }}
                disabled={!row.include}
              >×</button>
            {/if}
          </div>
        {/each}
        {#if !allModifiersEmpty}
          <button
            type="button"
            class="rebemer-row__modifier-add"
            onclick={() => { row.modifiers = [...row.modifiers, '']; }}
            disabled={!row.include}
          >+ Add modifier</button>
        {/if}
      </div>
    {/if}
  </div>

  {#if isMixed && row.include}
    <div class="rebemer-row__op-toggle" role="group" aria-label="Operation">
      <button
        type="button"
        class="rebemer-row__op-btn"
        class:rebemer-row__op-btn--on={row.op === 'add'}
        aria-pressed={row.op === 'add'}
        onclick={() => { row.op = 'add'; }}
      >+ Add</button>
      <button
        type="button"
        class="rebemer-row__op-btn"
        class:rebemer-row__op-btn--on={row.op === 'rename'}
        aria-pressed={row.op === 'rename'}
        onclick={() => {
          row.op = 'rename';
          if (!row.renameFamilyId && currentFamilies.length) {
            row.renameFamilyId = currentFamilies[0].id;
          }
        }}
      >→ Rename</button>
      <button
        type="button"
        class="rebemer-row__op-btn"
        class:rebemer-row__op-btn--on={row.op === 'replace'}
        aria-pressed={row.op === 'replace'}
        onclick={() => { row.op = 'replace'; row.renameFamilyId = ''; }}
      >× Replace</button>
    </div>
  {/if}

  {#if (effectiveOp === 'rename' || effectiveOp === 'replace') && row.include}
    {#if effectiveOp === 'rename'}
      {#if currentFamilies.length === 0}
        <p class="rebemer-row__info" role="note">No existing classes — a new class will be added instead.</p>
      {:else}
        {#if currentFamilies.length > 1}
          <div class="rebemer-row__family">
            <span class="rebemer-row__family-label">Rename</span>
            <select bind:value={row.renameFamilyId} class="rebemer-row__family-select">
              {#each currentFamilies as fam}
                <option value={fam.id}>{fam.name}{fam.modCount > 0 ? ` (+ ${fam.modCount} modifier${fam.modCount > 1 ? 's' : ''})` : ''}</option>
              {/each}
            </select>
          </div>
        {/if}
        {#if selectedFamily}
          {@const familySize = 1 + selectedFamily.modCount}
          {#if removeExisting}
            <p class="rebemer-row__warn" role="note">
              Will rename <code>{selectedFamily.name}</code>{selectedFamily.modCount > 0 ? ` (+ ${selectedFamily.modCount} modifier${selectedFamily.modCount > 1 ? 's' : ''})` : ''} and remove all other classes from this element.
            </p>
          {:else}
            <p class="rebemer-row__info" role="note">
              Will rename <code>{selectedFamily.name}</code>{selectedFamily.modCount > 0 ? ` (+ ${selectedFamily.modCount} modifier${selectedFamily.modCount > 1 ? 's' : ''})` : ''}{(row.currentClassIds?.length ?? 0) > familySize ? ' Other classes kept.' : ''}
            </p>
          {/if}
        {/if}
      {/if}
    {:else}
      {#if currentFamilies.length > 0}
        <div class="rebemer-row__family">
          <span class="rebemer-row__family-label">Replace</span>
          <select bind:value={row.renameFamilyId} class="rebemer-row__family-select" disabled={removeExisting}>
            <option value="">— All classes —</option>
            {#each currentFamilies as fam}
              <option value={fam.id}>{fam.name}{fam.modCount > 0 ? ` (+ ${fam.modCount} modifier${fam.modCount > 1 ? 's' : ''})` : ''}</option>
            {/each}
          </select>
        </div>
      {/if}
      {#if removeExisting}
        <p class="rebemer-row__warn" role="note">All existing classes will be removed from this element.</p>
      {:else if currentFamilies.length === 0}
        <p class="rebemer-row__info" role="note">No existing classes — a new class will be created.</p>
      {:else if row.renameFamilyId}
        <p class="rebemer-row__info" role="note">Will remove the selected family and replace with the new class (empty settings). Other classes kept.</p>
      {:else}
        <p class="rebemer-row__warn" role="note">All existing classes will be removed from this element.</p>
      {/if}
    {/if}
  {/if}

  {#if existingClassMatch}
    <p class="rebemer-row__recommend" role="note">
      {#if showMigrate}
        A class named <code>{existingClassMatch.name}</code> already exists.
        On Apply, missing style keys will be merged into it. Conflicting
        values block the migration — pick a different name or use Add.
      {:else}
        A class named <code>{existingClassMatch.name}</code> already exists
        globally. Apply will attach the existing class instead of
        creating a duplicate.
      {/if}
    </p>
  {/if}

  {#if showMigrate && row.include}
    <div class="rebemer-row__chips" aria-label="Settings keys that will be migrated">
      {#if row.migrateKeys?.length}
        <span class="rebemer-row__chips-label">Migrate:</span>
        {#each row.migrateKeys as key}
          <span class="rebemer-chip" title="Will be lifted into {finalClassNames[0] || 'the new class'}">{chipLabel(key)}</span>
        {/each}
      {:else}
        <span class="rebemer-row__chips-empty">No migratable keys on this element.</span>
      {/if}
      {#if row.skippedKeys?.length}
        <span class="rebemer-row__chips-skip" title="Not on the migration allowlist — staying on the element">
          {row.skippedKeys.length} skipped
        </span>
      {/if}
    </div>
  {/if}
</div>
