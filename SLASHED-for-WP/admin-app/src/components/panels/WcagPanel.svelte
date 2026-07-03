<script lang="ts">
  import type { SlashedToken } from '../../types';
  import {
    parseOklch, stringifyOklch, oklchToRgb,
    getRelativeLuminance, getContrastRatio,
  } from '../../lib/colorUtils';
  import { resolveColor, resolveRgb, previewVersion, getActiveTheme } from '../../lib/previewResolver.svelte';

  let { overrides, onSet }: {
    tokens: SlashedToken[];
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onBulkChange: (patch: Record<string, string | null>) => void;
  } = $props();

  // Color choices for the pair checker. `expr` is resolved against the live
  // preview; `editKey` (when present) points at the OKLCH source token the
  // auto-fixer is allowed to rewrite.
  type ColorOpt = { label: string; expr: string; editKey?: string };

  const TEXT_OPTS: ColorOpt[] = [
    { label: "Text",            expr: "var(--sf-color-text)" },
    { label: "Text secondary",  expr: "var(--sf-color-text--secondary)" },
    { label: "Text muted",      expr: "var(--sf-color-text--muted)" },
    { label: "White",           expr: "#ffffff" },
    { label: "Black",           expr: "#000000" },
  ];
  const SURFACE_OPTS: ColorOpt[] = [
    { label: "Surface",  expr: "var(--sf-color-surface)" },
    { label: "Bg",       expr: "var(--sf-color-bg)" },
    { label: "Border",   expr: "var(--sf-color-border)" },
  ];
  // Brand/status roles — base + key steps; base maps to editable light + dark sources.
  const ROLE_DEFS = [
    { key: "primary",   srcLight: "--sf-color-primary-source-light",   defLight: "oklch(0.47 0.27 264)",   srcDark: "--sf-color-primary-source-dark",   defDark: "oklch(0.715 0.243 264)" },
    { key: "secondary", srcLight: "--sf-color-secondary-source-light", defLight: "oklch(0.22 0.04 264)",   srcDark: "--sf-color-secondary-source-dark", defDark: "oklch(0.84 0.036 264)" },
    { key: "tertiary",  srcLight: "--sf-color-tertiary-source-light",  defLight: "oklch(0.42 0.22 295)",   srcDark: "--sf-color-tertiary-source-dark",  defDark: "oklch(0.74 0.198 295)" },
    { key: "action",    srcLight: "--sf-color-action-source-light",    defLight: "oklch(0.50 0.22 235)",   srcDark: "--sf-color-action-source-dark",    defDark: "oklch(0.70 0.198 235)" },
    { key: "neutral",   srcLight: "--sf-color-neutral-source-light",   defLight: "oklch(0.52 0.025 260)",  srcDark: "--sf-color-neutral-source-dark",   defDark: "oklch(0.69 0.0225 260)" },
    { key: "success",   srcLight: "--sf-color-success-source-light",   defLight: "oklch(0.50 0.16 145)",   srcDark: "--sf-color-success-source-dark",   defDark: "oklch(0.70 0.144 145)" },
    { key: "warning",   srcLight: "--sf-color-warning-source-light",   defLight: "oklch(0.75 0.17 80)",    srcDark: "--sf-color-warning-source-dark",   defDark: "oklch(0.65 0.153 80)" },
    { key: "danger",    srcLight: "--sf-color-danger-source-light",    defLight: "oklch(0.48 0.22 12)",    srcDark: "--sf-color-danger-source-dark",    defDark: "oklch(0.71 0.198 12)" },
    { key: "info",      srcLight: "--sf-color-info-source-light",      defLight: "oklch(0.48 0.18 235)",   srcDark: "--sf-color-info-source-dark",      defDark: "oklch(0.71 0.162 235)" },
  ];
  const ROLE_OPTS: ColorOpt[] = ROLE_DEFS.flatMap((r) => [
    { label: `${r.key} (base)`, expr: `var(--sf-color-${r.key})`, editKey: r.key },
    { label: `${r.key}-100`,    expr: `var(--sf-color-${r.key}-100)` },
    { label: `${r.key}-600`,    expr: `var(--sf-color-${r.key}-600)` },
    { label: `${r.key}-900`,    expr: `var(--sf-color-${r.key}-900)` },
  ]);

  const ALL_OPTS: ColorOpt[] = [...TEXT_OPTS, ...SURFACE_OPTS, ...ROLE_OPTS];
  const EDIT_BY_KEY = Object.fromEntries(ROLE_DEFS.map((r) => [r.key, r]));

  // Matrix rows/cols — a compact, meaningful cross-section.
  const MATRIX_FG: ColorOpt[] = [
    { label: "text", expr: "var(--sf-color-text)" },
    { label: "white", expr: "#ffffff" },
    { label: "black", expr: "#000000" },
    { label: "primary", expr: "var(--sf-color-primary)", editKey: "primary" },
  ];
  const MATRIX_BG: ColorOpt[] = [
    { label: "surface", expr: "var(--sf-color-surface)" },
    { label: "primary", expr: "var(--sf-color-primary)" },
    { label: "neutral-100", expr: "var(--sf-color-neutral-100)" },
    { label: "success", expr: "var(--sf-color-success)" },
    { label: "warning", expr: "var(--sf-color-warning)" },
    { label: "danger", expr: "var(--sf-color-danger)" },
  ];

  let fgLabel = $state("White");
  let bgLabel = $state("primary (base)");
  let targetLevel = $state<"AA" | "AAA">("AA");

  let fg = $derived(ALL_OPTS.find((o) => o.label === fgLabel) ?? ALL_OPTS[0]);
  let bg = $derived(ALL_OPTS.find((o) => o.label === bgLabel) ?? ALL_OPTS[0]);

  function ratioOf(fgExpr: string, bgExpr: string): number | null {
    void previewVersion.value;
    const f = resolveRgb(fgExpr);
    const b = resolveRgb(bgExpr);
    if (!f || !b) return null;
    return getContrastRatio(getRelativeLuminance(...f), getRelativeLuminance(...b));
  }

  function levelOf(ratio: number): { tag: string; cls: string } {
    if (ratio >= 7)   return { tag: "AAA",  cls: "bg-emerald-500/25 text-emerald-800 dark:text-emerald-200" };
    if (ratio >= 4.5) return { tag: "AA",   cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" };
    if (ratio >= 3)   return { tag: "AA-L", cls: "bg-amber-500/20 text-amber-700 dark:text-amber-300" };
    return { tag: "Fail", cls: "bg-rose-500/20 text-rose-700 dark:text-rose-300" };
  }

  let pairRatio = $derived(ratioOf(fg.expr, bg.expr));

  function swap() {
    const t = fgLabel; fgLabel = bgLabel; bgLabel = t;
  }
  function loadPair(fgExpr: string, bgExpr: string) {
    const fo = ALL_OPTS.find((o) => o.expr === fgExpr);
    const bo = ALL_OPTS.find((o) => o.expr === bgExpr);
    if (fo) fgLabel = fo.label;
    if (bo) bgLabel = bo.label;
  }

  function paint(expr: string): string {
    void previewVersion.value;
    return resolveColor(expr) || expr;
  }

  let showPairChecker = $state(false);
  let showMatrix      = $state(false);

  // ---- Auto-fix: nudge the FG source color's OKLCH lightness to pass --------
  let suggestion = $state<{ token: string; value: string; ratio: number } | null>(null);

  function computeFix() {
    suggestion = null;
    const ed = fg.editKey ? EDIT_BY_KEY[fg.editKey] : null;
    if (!ed) return;
    const isDark = getActiveTheme() === "dark";
    const src = isDark ? ed.srcDark : ed.srcLight;
    const def = isDark ? ed.defDark : ed.defLight;
    const cur = overrides[src] ?? def;
    const { c, h, l, valid } = parseOklch(cur);
    if (!valid) return;
    const b = resolveRgb(bg.expr);
    if (!b) return;
    const bgLum = getRelativeLuminance(...b);
    const want = targetLevel === "AAA" ? 7 : 4.5;
    let best: number | null = null;
    for (let nl = 0; nl <= 1.0001; nl += 0.005) {
      const [r, g, bb] = oklchToRgb(nl, c, h);
      const ratio = getContrastRatio(getRelativeLuminance(r, g, bb), bgLum);
      if (ratio >= want && (best === null || Math.abs(nl - l) < Math.abs(best - l))) best = nl;
    }
    if (best === null) return;
    const [r, g, bb] = oklchToRgb(best, c, h);
    const ratio = getContrastRatio(getRelativeLuminance(r, g, bb), bgLum);
    suggestion = { token: src, value: stringifyOklch(best, c, h), ratio };
  }

  function applyFix() {
    if (suggestion) { onSet(suggestion.token, suggestion.value); suggestion = null; }
  }

  // Recompute the suggestion whenever inputs change but only if FG is editable.
  $effect(() => {
    if (!showPairChecker) { suggestion = null; return; }
    void previewVersion.value;
    void fgLabel; void bgLabel; void targetLevel;
    if (fg.editKey && pairRatio !== null && pairRatio < (targetLevel === "AAA" ? 7 : 4.5)) {
      computeFix();
    } else {
      suggestion = null;
    }
  });

</script>

<div class="p-4 space-y-6">
  <section class="space-y-1">
    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contrast checker</div>
    <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
      Live WCAG ratios computed from the actual rendered preview colors — including derived steps and your overrides.
    </p>
  </section>

  <!-- PAIR CHECKER -->
  <section class="space-y-3">
    <button
      onclick={() => { showPairChecker = !showPairChecker; }}
      aria-expanded={showPairChecker}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pair checker</div>
      <span class="text-[10px] text-slate-500">{showPairChecker ? "▲" : "▼"}</span>
    </button>
    {#if showPairChecker}
    <div class="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
      <div>
        <div class="text-[9px] text-slate-500 mb-1">Foreground</div>
        <select bind:value={fgLabel} class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer">
          {#each ALL_OPTS as o (o.label)}<option value={o.label} style="background:#16161e;">{o.label}</option>{/each}
        </select>
      </div>
      <button onclick={swap} title="Swap" class="mb-0.5 px-2 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-[12px]">⇄</button>
      <div>
        <div class="text-[9px] text-slate-500 mb-1">Background</div>
        <select bind:value={bgLabel} class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer">
          {#each ALL_OPTS as o (o.label)}<option value={o.label} style="background:#16161e;">{o.label}</option>{/each}
        </select>
      </div>
    </div>

    <!-- Sample + result -->
    <div class="rounded-xl border border-black/8 dark:border-white/8 overflow-hidden">
      <div class="h-24 flex items-center justify-center" style={`background:${paint(bg.expr)}`}>
        <span class="text-[26px] font-bold" style={`color:${paint(fg.expr)}`}>Aa Bb Cc</span>
      </div>
      {#if pairRatio !== null}
        {@const lvl = levelOf(pairRatio)}
        <div class="flex items-center gap-2 p-2.5 bg-black/4 dark:bg-white/4">
          <span class="text-[15px] font-mono font-bold text-slate-900 dark:text-slate-100">{pairRatio.toFixed(2)}:1</span>
          <span class={`text-[10px] font-bold px-2 py-0.5 rounded ${lvl.cls}`}>{lvl.tag}</span>
          <div class="flex-1"></div>
          <div class="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
            <span class={pairRatio >= 4.5 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>{pairRatio >= 4.5 ? "✓" : "✗"} AA normal</span>
            <span class={pairRatio >= 3 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>{pairRatio >= 3 ? "✓" : "✗"} AA large</span>
            <span class={pairRatio >= 7 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>{pairRatio >= 7 ? "✓" : "✗"} AAA normal</span>
            <span class={pairRatio >= 4.5 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>{pairRatio >= 4.5 ? "✓" : "✗"} AAA large</span>
          </div>
        </div>
      {:else}
        <div class="p-2.5 bg-black/4 dark:bg-white/4 text-[10px] text-slate-500">Waiting for live preview…</div>
      {/if}
    </div>

    <!-- Auto-fix -->
    <div class="rounded-xl bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8 p-3 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold text-slate-700 dark:text-slate-300">Auto-fix to pass <span class="text-slate-400 dark:text-slate-600 font-normal">(for {getActiveTheme()} mode)</span></span>
        <div class="flex bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 rounded-lg p-0.5 gap-0.5">
          {#each ["AA", "AAA"] as t (t)}
            <button onclick={() => { targetLevel = t as "AA" | "AAA"; }} class={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${targetLevel === t ? "bg-black/12 dark:bg-white/12 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>{t}</button>
          {/each}
        </div>
      </div>
      {#if !fg.editKey}
        <p class="text-[9px] text-slate-400 dark:text-slate-600">Pick an editable brand/status <span class="font-mono">(base)</span> color as the foreground to enable auto-fix.</p>
      {:else if pairRatio !== null && pairRatio >= (targetLevel === "AAA" ? 7 : 4.5)}
        <p class="text-[9px] text-emerald-700 dark:text-emerald-300">Already passes {targetLevel}. 🎉</p>
      {:else if suggestion}
        <div class="flex items-center gap-2">
          <span class="w-7 h-7 rounded border border-black/10 dark:border-white/10 shrink-0" style={`background:${paint(suggestion.value)}`}></span>
          <div class="flex-1 min-w-0">
            <div class="text-[9px] font-mono text-slate-600 dark:text-slate-400 truncate">{suggestion.value}</div>
            <div class="text-[9px] text-emerald-700 dark:text-emerald-300">→ {suggestion.ratio.toFixed(2)}:1 ({targetLevel} ✓)</div>
          </div>
          <button onclick={applyFix} class="px-2.5 py-1 rounded-lg bg-indigo-600/25 border border-indigo-500/40 text-indigo-800 dark:text-indigo-200 text-[10px] font-bold cursor-pointer hover:bg-indigo-600/35 shrink-0">Apply</button>
        </div>
      {:else}
        <p class="text-[9px] text-slate-400 dark:text-slate-600">No lightness of this hue reaches {targetLevel} on this background — try a different background or hue.</p>
      {/if}
    </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- MATRIX -->
  <section class="space-y-2">
    <button
      onclick={() => { showMatrix = !showMatrix; }}
      aria-expanded={showMatrix}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contrast matrix</div>
      <span class="text-[10px] text-slate-500">{showMatrix ? "▲" : "▼"}</span>
    </button>
    {#if showMatrix}
    <p class="text-[10px] text-slate-400 dark:text-slate-600">Foreground (rows) × background (cols). Click a cell to load it above.</p>
    <div class="overflow-x-auto">
      <table class="border-collapse text-[9px]">
        <thead>
          <tr>
            <th class="p-1"></th>
            {#each MATRIX_BG as b (b.label)}
              <th class="p-1 font-mono font-semibold text-slate-500 text-center whitespace-nowrap">{b.label}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each MATRIX_FG as f (f.label)}
            <tr>
              <td class="p-1 font-mono font-semibold text-slate-500 whitespace-nowrap pr-2">{f.label}</td>
              {#each MATRIX_BG as b (b.label)}
                {@const r = ratioOf(f.expr, b.expr)}
                {#if r !== null}
                  {@const lvl = levelOf(r)}
                  <td class="p-0.5">
                    <button
                      onclick={() => loadPair(f.expr, b.expr)}
                      title={`${f.label} on ${b.label} — ${r.toFixed(2)}:1`}
                      class={`w-full px-1.5 py-1 rounded font-mono font-bold cursor-pointer ${lvl.cls}`}
                    >{r.toFixed(1)}</button>
                  </td>
                {:else}
                  <td class="p-0.5 text-slate-300 dark:text-slate-700 text-center">·</td>
                {/if}
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {/if}
  </section>
</div>
