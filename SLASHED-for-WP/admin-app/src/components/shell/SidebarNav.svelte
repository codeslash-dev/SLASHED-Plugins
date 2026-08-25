<script lang="ts">
  import {
    Home, Palette, Type, Ruler, Layout, Square, Layers, Zap, Blocks,
    Puzzle, Component, SwatchBook, ShieldCheck, Package, BookOpen, ListChecks,
  } from '@lucide/svelte';

  let { activeId, onSelect, overridesByDomain = {}, expanded = false }: {
    activeId: string;
    onSelect: (id: string) => void;
    overridesByDomain?: Record<string, number>;
    /** Force the labelled layout at all widths (used inside the mobile drawer). */
    expanded?: boolean;
  } = $props();

  // Responsive note: the collapsed rail's icon-only↔labelled switch uses the
  // `@3xl:` (48rem = 768px) *container* variant, so it reacts to the width of
  // the nearest `@container` ancestor — the shell — not the browser viewport.
  // That keeps the rail an unlabelled 56px strip inside narrow embeds (e.g. the
  // WP frontend overlay's ~420px panel) even on a wide desktop viewport, and
  // only expands to the 208px labelled layout when the host actually gives us
  // ≥768px. Mount this component under an element carrying the `@container`
  // utility, or pass `expanded` to force the labelled layout. Without any
  // `@container` ancestor the `@3xl:` rules never match, so it safely defaults
  // to the compact 56px rail.

  // Grouped information architecture. Every destination lives under one of four
  // named groups so a user reasons about *areas of the design system* instead
  // of decoding an unlabelled icon rail. `home` sits above the groups.
  type NavItem = { id: string; icon: typeof Home; label: string };
  const HOME: NavItem = { id: "home", icon: Home, label: "Home" };
  const GROUPS: { label: string; items: NavItem[] }[] = [
    {
      label: "Foundations",
      items: [
        { id: "colors",     icon: Palette,   label: "Colors" },
        { id: "typography", icon: Type,      label: "Typography" },
        { id: "spacing",    icon: Ruler,     label: "Spacing" },
        { id: "borders",    icon: Square,    label: "Shape" },
        { id: "motion",     icon: Zap,       label: "Motion" },
      ],
    },
    {
      label: "Composition",
      items: [
        { id: "layout",     icon: Layout,    label: "Layout" },
        { id: "depth",      icon: Layers,    label: "Depth" },
        { id: "macros",     icon: Blocks,    label: "Macros" },
        { id: "components", icon: Component, label: "Components" },
        { id: "misc",       icon: Puzzle,    label: "System" },
      ],
    },
    {
      label: "Quality",
      items: [
        { id: "changes",    icon: ListChecks,  label: "Changes" },
        { id: "wcag",       icon: ShieldCheck, label: "Accessibility" },
      ],
    },
    {
      label: "Project",
      items: [
        { id: "themes",     icon: SwatchBook, label: "Presets" },
        { id: "setup",      icon: Package,    label: "Install & export" },
        { id: "cheatsheet", icon: BookOpen,   label: "Reference" },
      ],
    },
  ];

  // Every override maps to exactly one token domain, so their sum is the total
  // override count — what the Changes overview badge should show.
  let totalOverrides = $derived(Object.values(overridesByDomain).reduce((a, b) => a + b, 0));
  const countFor = (id: string): number =>
    id === "changes" ? totalOverrides : (overridesByDomain[id] || 0);
</script>

<nav
  class={`bg-slate-50 dark:bg-[#0a0a0f] flex flex-col py-3 gap-1 shrink-0 overflow-y-auto overflow-x-hidden ${
    expanded
      ? "w-full items-stretch"
      : "w-14 @3xl:w-52 items-center @3xl:items-stretch border-r border-black/8 dark:border-white/8"
  }`}
  aria-label="Panels"
>
  {#snippet navButton(item: NavItem)}
    {@const isActive = activeId === item.id}
    {@const count = countFor(item.id)}
    {@const Icon = item.icon}
    <button
      onclick={() => onSelect(item.id)}
      title={item.label}
      aria-current={isActive ? "page" : undefined}
      class={`relative flex items-center gap-2.5 rounded-xl transition-all cursor-pointer group ${
        expanded
          ? "justify-start w-full h-9 px-2.5"
          : "justify-center @3xl:justify-start w-10 @3xl:w-full h-10 @3xl:h-8 px-0 @3xl:px-2.5"
      } ${
        isActive
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8"
      }`}
    >
      <Icon class="w-4 h-4 shrink-0" />
      <span class={`${expanded ? "block" : "hidden @3xl:block"} text-[11px] font-semibold truncate`}>{item.label}</span>

      {#if count > 0}
        <!-- Collapsed rail: corner dot. Labelled layout: trailing count pill. -->
        <span
          class={`${expanded ? "hidden" : "@3xl:hidden"} absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-black flex items-center justify-center ${
            isActive ? "bg-white text-indigo-700" : "bg-indigo-500 text-white"
          }`}
        >
          {count > 9 ? "+" : count}
        </span>
        <span
          class={`${expanded ? "flex" : "hidden @3xl:flex"} ml-auto min-w-4 h-4 px-1 rounded-full text-[9px] font-black items-center justify-center ${
            isActive ? "bg-white/25 text-white" : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      {/if}

      <!-- Tooltip: only for the collapsed icon rail (labels are inline otherwise). -->
      <span class={`${expanded ? "hidden" : "@3xl:hidden"} absolute left-12 bg-slate-800 text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10`}>
        {item.label}
      </span>
    </button>
  {/snippet}

  <!-- Home -->
  <div class={`flex flex-col gap-1 w-full px-2 ${expanded ? "items-stretch" : "items-center @3xl:items-stretch"}`}>
    {@render navButton(HOME)}
  </div>

  {#each GROUPS as group (group.label)}
    <div class={`h-px bg-black/8 dark:bg-white/8 my-2 ${expanded ? "mx-2.5" : "w-8 @3xl:w-auto @3xl:mx-2.5"}`}></div>
    <div class={`${expanded ? "block" : "hidden @3xl:block"} px-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600`}>
      {group.label}
    </div>
    <div class={`flex flex-col gap-1 w-full px-2 ${expanded ? "items-stretch" : "items-center @3xl:items-stretch"}`}>
      {#each group.items as item (item.id)}
        {@render navButton(item)}
      {/each}
    </div>
  {/each}
</nav>
