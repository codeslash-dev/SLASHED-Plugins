<script lang="ts">
  import { Check, Copy, Download, Link, Upload, TriangleAlert } from '@lucide/svelte';
  import { generateCSS, buildShareUrl } from '../../lib/codec';
  import { getShareBaseUrl } from '../../lib/persistence';
  import { serializeThemeFile, importThemeFile } from '../../lib/themeFile';
  import type { SlashedToken } from '../../types';

  let { overrides, tokens = [], onApplyTheme }: {
    overrides: Record<string, string>;
    tokens?: SlashedToken[];
    onApplyTheme?: (overrides: Record<string, string>) => void;
  } = $props();

  // Declared globally in src/vite-env.d.ts, injected by Vite at build time.
  const frameworkVersion =
    typeof __SLASHED_VERSION__ !== "undefined" ? __SLASHED_VERSION__ : undefined;

  let outputMode = $state<"layer" | "root">("layer");
  let copied = $state(false);
  let copiedLink = $state(false);

  // Theme-file import feedback: what the migration did, or why it refused.
  let importNotes = $state<string[]>([]);
  let importErrors = $state<string[]>([]);
  let fileInput = $state<HTMLInputElement | null>(null);

  let liveTokenNames = $derived(new Set(tokens.map((t) => t.name)));

  function handleDownloadTheme() {
    const json = serializeThemeFile({ overrides, slashedVersion: frameworkVersion });
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "slashed-theme.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportTheme(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    importNotes = [];
    importErrors = [];

    const result = await importThemeFile(file, liveTokenNames);
    if (!result.overrides) {
      importErrors = result.errors;
    } else {
      importNotes = result.notes;
      onApplyTheme?.(result.overrides);
    }
    // Allow re-selecting the same file after a fix.
    input.value = "";
  }

  let css = $derived(generateCSS(overrides, { mode: outputMode, banner: true }));
  let count = $derived(Object.keys(overrides).length);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(css);
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    } catch {}
  }

  async function handleCopyLink() {
    try {
      const url = buildShareUrl(overrides, getShareBaseUrl());
      await navigator.clipboard.writeText(url);
      copiedLink = true;
      setTimeout(() => { copiedLink = false; }, 2000);
    } catch {}
  }

  function handleDownload() {
    const blob = new Blob([css], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "slashed-overrides.css";
    a.click();
    URL.revokeObjectURL(url);
  }

  function getW3CType(name: string): string {
    if (name.includes("color") || name.includes("scrim-color") || name.includes("shadow-color")) return "color";
    if (name.includes("duration") || name.includes("delay") || name.includes("transition-duration")) return "duration";
    if (name.includes("radius") || name.includes("space") || name.includes("size") || name.includes("width") || name.includes("height") || name.includes("gap") || name.includes("blur") || name.includes("text-") || name.includes("leading") || name.includes("tracking")) return "dimension";
    if (name.includes("font-family") || name.includes("font-mono") || name.includes("font-body") || name.includes("font-heading") || name.includes("font-code")) return "fontFamily";
    if (name.includes("font-weight") || name.includes("weight")) return "fontWeight";
    return "string";
  }

  function handleDownloadW3C() {
    const tokens: Record<string, { $value: string; $type: string }> = {};
    for (const [name, value] of Object.entries(overrides)) {
      const key = name.replace(/^--sf-/, "").replace(/-/g, ".");
      tokens[key] = { $value: value, $type: getW3CType(name) };
    }
    const json = JSON.stringify(
      { $schema: "https://design-tokens.github.io/community-group/format/", ...tokens },
      null, 2
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "slashed-tokens.w3c.json";
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="p-4 space-y-4 overflow-y-auto flex-1 h-full">
  <div>
    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Export</div>
    <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
      {count > 0
        ? `${count} override${count !== 1 ? "s" : ""} ready to export.`
        : "No overrides yet. Customise tokens, then export."}
    </p>
  </div>

  <!-- Copy shareable link -->
  <button
    onclick={handleCopyLink}
    disabled={count === 0}
    class="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-black/8 dark:border-white/8 bg-black/4 dark:bg-white/4 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-black/8 dark:hover:bg-white/8 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
  >
    {#if copiedLink}
      <Check class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
      <span class="text-emerald-600 dark:text-emerald-400">Link copied!</span>
    {:else}
      <Link class="w-3 h-3" />
      Copy shareable link
    {/if}
  </button>

  <!-- Output mode toggle -->
  <div>
    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">CSS output</div>
    <div class="flex bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 rounded-lg p-0.5">
      <button
        onclick={() => { outputMode = "layer"; }}
        class={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${outputMode === "layer" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
      >
        @layer
      </button>
      <button
        onclick={() => { outputMode = "root"; }}
        class={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${outputMode === "root" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
      >
        :root
      </button>
    </div>
  </div>

  <!-- CSS output -->
  <div class="relative">
    <pre class="bg-slate-100 dark:bg-[#06060a] border border-black/8 dark:border-white/8 rounded-xl p-4 text-[10px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-80 whitespace-pre-wrap">{css || "/* No overrides */"}</pre>
    <div class="absolute top-2 right-2 flex gap-1">
      <button
        onclick={handleCopy}
        class="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/12 dark:hover:bg-white/12 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer border border-black/8 dark:border-white/8"
        title="Copy to clipboard"
      >
        {#if copied}
          <Check class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        {:else}
          <Copy class="w-3 h-3" />
        {/if}
      </button>
      <button
        onclick={handleDownload}
        class="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/12 dark:hover:bg-white/12 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer border border-black/8 dark:border-white/8"
        title="Download .css"
      >
        <Download class="w-3 h-3" />
      </button>
    </div>
  </div>

  <!-- Portable theme file: the reviewable, committable form of this override set -->
  <div class="space-y-2">
    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Theme file</div>
    <p class="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
      A named, sorted JSON snapshot you can commit next to your CSS and review in a diff.
      Importing one migrates tokens renamed since it was written.
    </p>

    <div class="flex gap-2">
      <button
        onclick={handleDownloadTheme}
        disabled={count === 0}
        class="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-black/8 dark:border-white/8 bg-black/4 dark:bg-white/4 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-black/8 dark:hover:bg-white/8 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download class="w-3 h-3" />
        Download .json
      </button>
      <button
        onclick={() => fileInput?.click()}
        class="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-black/8 dark:border-white/8 bg-black/4 dark:bg-white/4 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-black/8 dark:hover:bg-white/8 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer"
      >
        <Upload class="w-3 h-3" />
        Import…
      </button>
    </div>

    <input
      bind:this={fileInput}
      type="file"
      accept="application/json,.json"
      onchange={handleImportTheme}
      class="hidden"
    />

    {#if importErrors.length}
      <div class="rounded-lg bg-red-500/8 border border-red-500/20 p-3 space-y-1">
        <div class="flex items-center gap-1.5 text-[10px] font-bold text-red-700 dark:text-red-300">
          <TriangleAlert class="w-3 h-3" />
          Import refused — nothing was changed
        </div>
        {#each importErrors as err}
          <div class="text-[10px] text-red-700/80 dark:text-red-300/80 leading-relaxed font-mono">{err}</div>
        {/each}
      </div>
    {/if}

    {#if importNotes.length}
      <div class="rounded-lg bg-amber-500/8 border border-amber-500/20 p-3 space-y-1">
        <div class="text-[10px] font-bold text-amber-700 dark:text-amber-300">
          Imported with {importNotes.length} adjustment{importNotes.length !== 1 ? "s" : ""}
        </div>
        {#each importNotes as note}
          <div class="text-[10px] text-amber-700/80 dark:text-amber-300/80 leading-relaxed font-mono">{note}</div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- W3C Design Tokens export -->
  <button
    onclick={handleDownloadW3C}
    disabled={count === 0}
    class="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-black/8 dark:border-white/8 bg-black/4 dark:bg-white/4 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-black/8 dark:hover:bg-white/8 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <Download class="w-3 h-3" />
    Download W3C Design Tokens (.json)
  </button>

  <div class="rounded-lg bg-indigo-500/8 border border-indigo-500/15 p-3 space-y-2">
    <div class="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">Usage</div>
    <div class="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
      Paste this CSS into your project after the SLASHED import.
    </div>
    <pre class="text-[9px] font-mono text-slate-500 bg-black/30 rounded p-2 overflow-x-auto">{`@import 'slashed/slashed.full.css';
@import './slashed-overrides.css';`}</pre>
  </div>
</div>
