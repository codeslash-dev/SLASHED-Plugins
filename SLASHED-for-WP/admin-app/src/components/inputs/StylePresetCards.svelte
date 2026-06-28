<script lang="ts">
  import type { StylePreset } from '../../types';

  let { label, presets, overrides, onApply }: {
    label: string;
    presets: StylePreset[];
    overrides: Record<string, string>;
    onApply: (patch: Record<string, string | null>) => void;
  } = $props();

  function activeId(ps: StylePreset[], ov: Record<string, string>): string {
    for (const p of ps) {
      if (p.id === "default") continue;
      const match = Object.entries(p.patch).every(([k, v]) => {
        if (v === null) return !(k in ov);
        return ov[k] === v;
      });
      if (match) return p.id;
    }
    const allDefault = ps
      .filter((p) => p.id !== "default")
      .flatMap((p) => Object.keys(p.patch))
      .every((k) => !(k in ov));
    return allDefault ? "default" : "";
  }

  let current = $derived(activeId(presets, overrides));
</script>

<div>
  <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</div>
  <div class="flex gap-1.5 flex-wrap">
    {#each presets as p (p.id)}
      <button
        onclick={() => onApply(p.patch)}
        class={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
          current === p.id
            ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
            : "bg-white/4 border-white/8 text-slate-400 hover:text-slate-200 hover:bg-white/8"
        }`}
      >
        {p.label}
      </button>
    {/each}
  </div>
</div>
