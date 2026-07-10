<script lang="ts">
  import { Sun, Moon, Smartphone, Tablet, Monitor, RefreshCw, ExternalLink, Columns2 } from '@lucide/svelte';
  import type { PreviewTemplate } from '../../types';
  import { generateCSS } from '../../lib/codec';
  import { computeDerivedOverrides } from '../../lib/persistence';
  import { registerPreviewDoc, bumpPreviewVersion } from '../../lib/previewResolver.svelte';
  import { lumlockerPreview } from '../../lib/lumlockerPreview.svelte';
  // Live-preview gallery: tab registry + per-tab HTML builders + the pv-* skin.
  // Replaces the old hand-written marketing/components/stylescape bodies with a
  // token-driven visual map of the whole framework API (see lib/preview/).
  import { buildTab, previewSkinCSS, TABS } from '../../lib/preview';
  // Import the built framework CSS at Vite compile time — always in sync with dist/.
  // The @framework-css alias is remapped by the WP plugin to its vendored bundle.
  import frameworkCSSStatic from '@framework-css/dist/slashed.full.css?raw';

  let { overrides, previewTheme, previewWidth, previewMotion, previewTemplate,
    onThemeChange, onWidthChange, onMotionChange, onTemplateChange }: {
    overrides: Record<string, string>;
    previewTheme: "light" | "dark";
    previewWidth: "fluid" | "mobile" | "tablet" | "desktop";
    previewMotion: "normal" | "slow" | "none";
    previewTemplate: PreviewTemplate;
    onThemeChange: (t: "light" | "dark") => void;
    onWidthChange: (w: "fluid" | "mobile" | "tablet" | "desktop") => void;
    onMotionChange: (m: "normal" | "slow" | "none") => void;
    onTemplateChange: (t: PreviewTemplate) => void;
  } = $props();

  function withDerivedOverrides(ov: Record<string, string>): Record<string, string> {
    const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const derived = computeDerivedOverrides(ov, { reduceMotion });
    return Object.keys(derived).length > 0 ? { ...derived, ...ov } : ov;
  }


  // --- Google Fonts helpers ---

  const SYSTEM_FONT_NAMES = new Set([
    "system-ui", "-apple-system", "BlinkMacSystemFont",
    "ui-monospace", "ui-serif", "ui-sans-serif",
    "sans-serif", "serif", "monospace", "cursive", "fantasy",
    "Georgia", "Times New Roman", "Times", "Impact",
    "Arial Narrow", "Arial", "Helvetica", "Helvetica Neue",
    "Courier New", "Courier", "Fira Code", "Verdana",
  ]);

  function extractFontName(familyValue: string): string | null {
    if (!familyValue?.trim()) return null;
    const quotedMatch = familyValue.trim().match(/^['"]([^'"]+)['"]/);
    const name = quotedMatch ? quotedMatch[1] : familyValue.split(",")[0];
    const trimmed = name.trim();
    return trimmed && !SYSTEM_FONT_NAMES.has(trimmed) ? trimmed : null;
  }

  function getGoogleFonts(ov: Record<string, string>): { name: string; url: string }[] {
    const seen = new Set<string>();
    const result: { name: string; url: string }[] = [];
    for (const token of ["--sf-font-body", "--sf-font-heading", "--sf-font-mono"]) {
      const name = extractFontName(ov[token] ?? "");
      if (!name || seen.has(name)) continue;
      seen.add(name);
      result.push({
        name,
        url: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap`,
      });
    }
    return result;
  }

  function injectFontsIntoDoc(doc: Document, ov: Record<string, string>) {
    for (const { name, url } of getGoogleFonts(ov)) {
      const id = `gf-${name.replace(/\s+/g, "-").toLowerCase()}`;
      if (!doc.getElementById(id)) {
        const link = doc.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = url;
        doc.head.appendChild(link);
      }
    }
  }


  function buildIframeHTML(
    ov: Record<string, string>,
    theme: "light" | "dark",
    motion: "normal" | "slow" | "none",
    template: PreviewTemplate,
    frameworkCSS: string,
  ): string {
    const css = generateCSS(withDerivedOverrides(ov), { mode: "root", banner: false });
    const motionCSS =
      motion === "slow"
        ? "*, *::before, *::after { transition-duration: 200% !important; animation-duration: 200% !important; }"
        : motion === "none"
        ? "*, *::before, *::after { transition: none !important; animation: none !important; }"
        : "";

    const fontLinks = getGoogleFonts(ov)
      .map(({ url }) => `  <link rel="stylesheet" href="${url}">`)
      .join("\n");

    return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <title>SLASHED Preview</title>
${fontLinks ? fontLinks + "\n" : ""}  <style id="slashed-framework">${frameworkCSS}</style>
  <style id="slashed-overrides">${css}</style>
  <!-- Preview skin: presentational classes for the demo templates, every value
       token-driven. Buttons, cards, inputs etc. come from the real framework
       bundle above — nothing here re-implements them. -->
  <style id="slashed-preview-skin">
    html, body { height: 100%; margin: 0; padding: 0; }
    body { box-sizing: border-box; }
    ${previewSkinCSS()}
    ${motionCSS}
  </style>
</head>
<body>
${buildTab(template)}
</body>
</html>`;
  }

  let splitMode = $state(false);

  let iframeEl = $state<HTMLIFrameElement | null>(null);
  let splitLightEl = $state<HTMLIFrameElement | null>(null);
  let splitDarkEl = $state<HTMLIFrameElement | null>(null);
  // Counters increment on every load event so effects re-run after iframe reloads.
  let loadCount = $state(0);
  let splitLightLoadCount = $state(0);
  let splitDarkLoadCount = $state(0);
  let refresh = $state(0);

  // srcdoc only encodes layout/motion/template — overrides and theme are applied
  // by the effects below, avoiding a full iframe reload on every token change.
  let html = $derived(buildIframeHTML({}, previewTheme, previewMotion, previewTemplate, frameworkCSSStatic));
  let htmlLight = $derived(buildIframeHTML({}, "light", previewMotion, previewTemplate, frameworkCSSStatic));
  let htmlDark = $derived(buildIframeHTML({}, "dark", previewMotion, previewTemplate, frameworkCSSStatic));

  // SL-020: the DOM writes below (style/attribute mutation on the iframe
  // document, plus bumpPreviewVersion()'s resolveCache.clear()) are cheap
  // individually but these effects re-run on every override tick — e.g. every
  // input event while dragging a slider, many times per animation frame.
  // rAF-coalescing collapses a burst of same-frame reruns into a single
  // apply using the latest captured values ("coalesce to latest"), since only
  // the frame actually painted to the user matters. The effect body above
  // this comment still runs synchronously on every change (so Svelte's
  // dependency tracking is unaffected) — only the DOM-writing work below is
  // deferred. The `return () => cancelAnimationFrame(rafId)` cleanup fires
  // before Svelte re-runs this effect (or on unmount), so a still-pending
  // frame from a superseded run is cancelled before scheduling the next one.
  $effect(() => {
    const _ov = overrides;
    const _theme = previewTheme;
    const _count = loadCount;
    const _lock = lumlockerPreview.value;

    const rafId = requestAnimationFrame(() => {
      const iframe = iframeEl;
      if (_count === 0 || !iframe) return;
      const doc = iframe.contentDocument;
      if (!doc) return;

      const styleEl = doc.getElementById("slashed-overrides");
      if (styleEl) {
        styleEl.textContent = generateCSS(withDerivedOverrides(_ov), { mode: "root", banner: false });
      }

      injectFontsIntoDoc(doc, _ov);

      // Framework activates dark mode via [data-theme="dark"] (color-scheme +
      // light-dark()), NOT a class — keep this in sync with buildIframeHTML.
      doc.documentElement.setAttribute("data-theme", _theme);

      // Luminance lock preview — mirrors :root[data-lumlocker] in core/themes.css.
      if (_lock) doc.documentElement.setAttribute("data-lumlocker", "");
      else doc.documentElement.removeAttribute("data-lumlocker");

      // This single-mode iframe is the canonical resolver source.
      // registerPreviewDoc() always bumps internally (both its
      // activeDoc-unchanged early-return and its replace-doc path do), so an
      // explicit bumpPreviewVersion() here would double-bump/double-clear
      // resolveCache for no reason.
      registerPreviewDoc(doc);
    });

    return () => cancelAnimationFrame(rafId);
  });

  $effect(() => {
    const _splitMode = splitMode;
    const _ov = overrides;
    const _lightCount = splitLightLoadCount;
    const _darkCount = splitDarkLoadCount;
    const _lock = lumlockerPreview.value;

    // Split iframes only exist in the DOM under {#if splitMode} below — skip
    // scheduling entirely rather than doing per-frame no-op work while the
    // single-iframe effect above is the one actually driving the preview.
    if (!_splitMode) return;

    const rafId = requestAnimationFrame(() => {
      const css = generateCSS(withDerivedOverrides(_ov), { mode: "root", banner: false });

      const applyLock = (doc: Document) => {
        if (_lock) doc.documentElement.setAttribute("data-lumlocker", "");
        else doc.documentElement.removeAttribute("data-lumlocker");
      };

      // registerPreviewDoc() (light pane) already bumps internally; only
      // bump explicitly when the dark pane was the sole one updated this
      // frame, so consumers still get notified without double-bumping.
      let lightApplied = false;
      let darkApplied = false;

      if (splitLightEl && _lightCount > 0) {
        const doc = splitLightEl.contentDocument;
        if (doc) {
          const styleEl = doc.getElementById("slashed-overrides");
          if (styleEl) styleEl.textContent = css;
          injectFontsIntoDoc(doc, _ov);
          applyLock(doc);
          // In split mode the light pane is the canonical resolver source.
          registerPreviewDoc(doc);
          lightApplied = true;
        }
      }
      if (splitDarkEl && _darkCount > 0) {
        const doc = splitDarkEl.contentDocument;
        if (doc) {
          const styleEl = doc.getElementById("slashed-overrides");
          if (styleEl) styleEl.textContent = css;
          injectFontsIntoDoc(doc, _ov);
          applyLock(doc);
          darkApplied = true;
        }
      }
      if (darkApplied && !lightApplied) bumpPreviewVersion();
    });

    return () => cancelAnimationFrame(rafId);
  });

  let isConstrained = $derived(previewWidth !== "fluid");

  function getWidthStyle(): string {
    if (previewWidth === "fluid") return "width:100%;height:100%";
    if (previewWidth === "mobile") return "width:390px;height:750px;border:1px solid rgba(255,255,255,0.12);border-radius:28px;overflow:hidden;background:#fff;box-shadow:0 32px 80px rgba(0,0,0,0.5)";
    if (previewWidth === "tablet") return "width:768px;height:900px;border:1px solid rgba(255,255,255,0.12);border-radius:24px;overflow:hidden;background:#fff;box-shadow:0 32px 80px rgba(0,0,0,0.5)";
    return "width:1024px;height:720px;border:1px solid rgba(255,255,255,0.12);border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 32px 80px rgba(0,0,0,0.5)";
  }
</script>

<div class="flex flex-col flex-1 min-h-0 bg-slate-100 dark:bg-[#09090e]">
  <!-- Preview toolbar — always a single row (scrolls horizontally instead of
       wrapping) so it can't eat a growing chunk of a short mobile viewport. -->
  <div class="min-h-10 bg-slate-50 dark:bg-[#0d0d14] border-b border-black/8 dark:border-white/8 flex flex-nowrap items-center px-3 gap-2 overflow-x-auto shrink-0">
    <!-- Template tabs -->
    <div class="shrink-0 flex bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 rounded-lg p-0.5 gap-0.5 max-w-full overflow-x-auto">
      {#each TABS as t (t.id)}
        <button
          onclick={() => onTemplateChange(t.id)}
          class={`shrink-0 px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
            previewTemplate === t.id ? "bg-black/12 dark:bg-white/12 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          {t.label}
        </button>
      {/each}
    </div>

    <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>

    <!-- Width controls -->
    <div class="shrink-0 flex bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 rounded-lg p-0.5 gap-0.5">
      {#each (["fluid", "desktop", "tablet", "mobile"] as const) as w (w)}
        <button
          onclick={() => onWidthChange(w)}
          title={w === "fluid" ? "Full width" : w === "desktop" ? "Desktop (1024px)" : w === "tablet" ? "Tablet (768px)" : "Mobile (390px)"}
          class={`p-1 rounded-md transition-all cursor-pointer ${previewWidth === w ? "bg-black/12 dark:bg-white/12 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          {#if w === "mobile"}
            <Smartphone class="w-3 h-3" />
          {:else if w === "tablet"}
            <Tablet class="w-3 h-3" />
          {:else}
            <Monitor class="w-3 h-3" />
          {/if}
        </button>
      {/each}
    </div>

    <!-- Light/dark/split -->
    <div class="shrink-0 flex bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 rounded-lg p-0.5 gap-0.5">
      <button
        onclick={() => { splitMode = false; onThemeChange("light"); }}
        title="Light mode"
        class={`p-1 rounded-md transition-all cursor-pointer ${!splitMode && previewTheme === "light" ? "bg-black/12 dark:bg-white/12 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
      >
        <Sun class="w-3 h-3" />
      </button>
      <button
        onclick={() => { splitMode = false; onThemeChange("dark"); }}
        title="Dark mode"
        class={`p-1 rounded-md transition-all cursor-pointer ${!splitMode && previewTheme === "dark" ? "bg-black/12 dark:bg-white/12 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
      >
        <Moon class="w-3 h-3" />
      </button>
      <button
        onclick={() => { splitMode = !splitMode; }}
        title="Split: light + dark side by side"
        class={`p-1 rounded-md transition-all cursor-pointer ${splitMode ? "bg-black/12 dark:bg-white/12 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
      >
        <Columns2 class="w-3 h-3" />
      </button>
    </div>

    <div class="hidden md:block md:flex-1"></div>

    <!-- Motion -->
    <select
      value={previewMotion}
      onchange={(e) => onMotionChange((e.target as HTMLSelectElement).value as "normal" | "slow" | "none")}
      class="shrink-0 bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 rounded-lg px-2 py-0.5 text-[10px] font-bold focus:outline-none cursor-pointer"
    >
      <option value="normal">Normal motion</option>
      <option value="slow">Slow motion</option>
      <option value="none">No motion</option>
    </select>

    <!-- Refresh -->
    <button
      onclick={() => { loadCount = 0; splitLightLoadCount = 0; splitDarkLoadCount = 0; refresh += 1; }}
      title="Reload preview"
      class="shrink-0 p-1 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/8 dark:hover:bg-white/8 transition-all cursor-pointer"
    >
      <RefreshCw class="w-3 h-3" />
    </button>

    <!-- Open in new tab -->
    <button
      onclick={() => {
        const blob = new Blob([buildIframeHTML(overrides, previewTheme, previewMotion, previewTemplate, frameworkCSSStatic)], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }}
      title="Open in new tab"
      class="shrink-0 p-1 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/8 dark:hover:bg-white/8 transition-all cursor-pointer"
    >
      <ExternalLink class="w-3 h-3" />
    </button>
  </div>

  <!-- Preview area -->
  <div class={`flex-1 min-h-0 flex overflow-auto ${isConstrained && !splitMode ? "items-center justify-center bg-slate-100 dark:bg-[#06060a]" : ""}`}>
    {#if splitMode}
      <!-- Split view: light left, dark right -->
      <div class="flex-1 flex min-w-0 h-full">
        <div class="flex-1 flex flex-col min-w-0 border-r border-black/8 dark:border-white/8">
          <div class="h-6 flex items-center justify-center bg-slate-50 dark:bg-[#0d0d14] border-b border-black/6 dark:border-white/6 shrink-0">
            <span class="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-1">
              <Sun class="w-2.5 h-2.5" /> Light
            </span>
          </div>
          {#key refresh}
            <iframe
              bind:this={splitLightEl}
              srcdoc={htmlLight}
              sandbox="allow-scripts allow-same-origin allow-forms"
              onload={() => { splitLightLoadCount += 1; }}
              class="flex-1 w-full border-0"
              title="SLASHED light preview"
            ></iframe>
          {/key}
        </div>
        <div class="flex-1 flex flex-col min-w-0">
          <div class="h-6 flex items-center justify-center bg-slate-50 dark:bg-[#0d0d14] border-b border-black/6 dark:border-white/6 shrink-0">
            <span class="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-1">
              <Moon class="w-2.5 h-2.5" /> Dark
            </span>
          </div>
          {#key refresh}
            <iframe
              bind:this={splitDarkEl}
              srcdoc={htmlDark}
              sandbox="allow-scripts allow-same-origin allow-forms"
              onload={() => { splitDarkLoadCount += 1; }}
              class="flex-1 w-full border-0"
              title="SLASHED dark preview"
            ></iframe>
          {/key}
        </div>
      </div>
    {:else}
      <div style={getWidthStyle()} class={isConstrained ? "" : "w-full h-full"}>
        {#key refresh}
          <iframe
            bind:this={iframeEl}
            srcdoc={html}
            sandbox="allow-scripts allow-same-origin allow-forms"
            onload={() => { loadCount += 1; }}
            class="w-full h-full border-0"
            title="SLASHED live preview"
          ></iframe>
        {/key}
      </div>
    {/if}
  </div>
</div>
