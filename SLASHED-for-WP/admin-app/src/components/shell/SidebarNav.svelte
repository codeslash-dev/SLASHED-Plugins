<script lang="ts">
  import {
    Home, Palette, Type, Ruler, Layout, Square, Layers, Zap, Sparkles, Puzzle,
    Blocks, SwatchBook, ShieldCheck, Package, BookOpen,
  } from 'lucide-svelte';

  let { activeId, onSelect, overridesByDomain = {} }: {
    activeId: string;
    onSelect: (id: string) => void;
    overridesByDomain?: Record<string, number>;
  } = $props();

  const NAV_ITEMS = [
    { id: "home",       icon: Home,        label: "Home",       group: "tokens" },
    { id: "colors",     icon: Palette,     label: "Colors",     group: "tokens" },
    { id: "typography", icon: Type,        label: "Typography", group: "tokens" },
    { id: "spacing",    icon: Ruler,       label: "Spacing",    group: "tokens" },
    { id: "layout",     icon: Layout,      label: "Layout",     group: "tokens" },
    { id: "borders",    icon: Square,      label: "Borders",    group: "tokens" },
    { id: "shadows",    icon: Layers,      label: "Shadows",    group: "tokens" },
    { id: "motion",     icon: Zap,         label: "Motion",     group: "tokens" },
    { id: "effects",    icon: Sparkles,    label: "Effects",    group: "tokens" },
    { id: "macros",     icon: Blocks,      label: "Macros",     group: "tokens" },
    { id: "misc",       icon: Puzzle,      label: "Misc",       group: "tokens" },
    { id: "themes",     icon: SwatchBook,  label: "Themes",     group: "tools" },
    { id: "wcag",       icon: ShieldCheck, label: "WCAG",       group: "tools" },
    { id: "setup",      icon: Package,     label: "Install",    group: "tools" },
    { id: "cheatsheet", icon: BookOpen,    label: "Classes",    group: "tools" },
  ] as const;

  let tokens = $derived(NAV_ITEMS.filter((i) => i.group === "tokens"));
  let tools = $derived(NAV_ITEMS.filter((i) => i.group === "tools"));
</script>

<nav class="w-14 bg-[#0a0a0f] border-r border-white/8 flex flex-col items-center py-3 gap-1 shrink-0 overflow-y-auto overflow-x-hidden">
  <div class="flex flex-col items-center gap-1 w-full px-2">
    {#each tokens as item (item.id)}
      {@const isActive = activeId === item.id}
      {@const count = overridesByDomain[item.id] || 0}
      {@const Icon = item.icon}
      <button
        onclick={() => onSelect(item.id)}
        title={item.label}
        class={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer group ${
          isActive
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
            : "text-slate-500 hover:text-slate-200 hover:bg-white/8"
        }`}
      >
        <Icon class="w-4 h-4" />
        {#if count > 0 && !isActive}
          <span class="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">
            {count > 9 ? "+" : count}
          </span>
        {/if}
        <span class="absolute left-12 bg-slate-800 text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10">
          {item.label}
        </span>
      </button>
    {/each}
  </div>
  <div class="w-8 h-px bg-white/8 my-2"></div>
  <div class="flex flex-col items-center gap-1 w-full px-2">
    {#each tools as item (item.id)}
      {@const isActive = activeId === item.id}
      {@const count = overridesByDomain[item.id] || 0}
      {@const Icon = item.icon}
      <button
        onclick={() => onSelect(item.id)}
        title={item.label}
        class={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer group ${
          isActive
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
            : "text-slate-500 hover:text-slate-200 hover:bg-white/8"
        }`}
      >
        <Icon class="w-4 h-4" />
        {#if count > 0 && !isActive}
          <span class="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">
            {count > 9 ? "+" : count}
          </span>
        {/if}
        <span class="absolute left-12 bg-slate-800 text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10">
          {item.label}
        </span>
      </button>
    {/each}
  </div>
</nav>
