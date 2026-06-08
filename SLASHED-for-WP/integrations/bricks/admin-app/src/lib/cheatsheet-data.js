/**
 * Structured cheatsheet data for the SLASHED framework.
 *
 * Exports all CSS custom properties (--sf-*) grouped by category
 * and all utility/state classes (.sf-*, .is-*) grouped by type.
 * Used by CheatsheetTab.svelte to render a searchable index.
 *
 * SYNC CONTRACT
 * -------------
 * Every concrete token and class shipped in the framework (recorded in
 * integrations/bricks/data/inventory.json, regenerated from the CSS source)
 * MUST be covered by an entry below. Coverage is enforced by
 * `node scripts/check-cheatsheet.js`, which expands the pattern notation
 * used in the `name` fields and asserts 100% inventory coverage.
 *
 * Pattern notation understood by the checker:
 *   {a,b,c}   one of the listed values (values may contain hyphens)
 *   {2xs..4xl} / {word}   single-segment wildcard
 *   {50-950}  numeric run
 *   *         multi-segment wildcard
 *   " / "     separates two distinct full names in one entry
 */

export const variableGroups = [
  {
    category: "Colors",
    description: "Brand, status, and semantic color tokens. Source colors use oklch(); the framework derives light-dark pairs, 50–950 palettes, alpha scales, and state variants automatically. Palette and alpha scales require optional/tokens.palette.css (optimal bundle and above).",
    tokens: [
      { name: "--sf-color-{primary,secondary,tertiary,action,neutral,base}", description: "Resolved light-dark adaptive brand color for use in rules." },
      { name: "--sf-color-{primary,secondary,tertiary,action,neutral,base}-light", description: "Source color (oklch registered value). Set this to rebrand." },
      { name: "--sf-color-{primary,secondary,tertiary,action,neutral,base}-dark", description: "Optional dark-mode override. If set, replaces the auto-derived dark variant for full per-mode control." },
      { name: "--sf-color-{primary,secondary,tertiary,action,neutral,base}-{50,100,200,300,400,500,600,700,800,900,950}", description: "Palette scale: 50 (lightest) → 950 (darkest), mixed with base/text. Requires tokens.palette.css." },
      { name: "--sf-color-{primary,secondary,tertiary,action,neutral,base}-{a5,a10,a20,a30,a40,a50,a60,a70,a80,a90,a95}", description: "Alpha scale: 5%–95% opacity of the brand color. Requires tokens.palette.css." },
      { name: "--sf-color-{primary,secondary,tertiary,action,neutral,base}-{hover,active,muted,subtle,ghost,lighter,darker,xlight,xdark,superlight,superdark}", description: "Semantic aliases for common UI states, mapped to palette steps." },
      { name: "--sf-color-{surface,inverse}", description: "Surface (card/panel) and inverse (high-contrast) context colors." },
      { name: "--sf-color-{success,warning,error,info,danger}", description: "Status feedback colors (resolved adaptive value)." },
      { name: "--sf-color-{success,warning,error,info,danger}-{light,strong,hover,active,muted,subtle,ghost,lighter,darker,xlight,xdark,superlight,superdark}", description: "Status color source (-light), emphasis (-strong), and state variants." },
      { name: "--sf-color-bg", description: "Page background color, derived from base." },
      { name: "--sf-color-bg--{hover,active,selected,focus,disabled}", description: "Interactive background overlays for hover/active/selected/focus/disabled states." },
      { name: "--sf-color-text", description: "Main body text color, contrast-aware." },
      { name: "--sf-color-text--{secondary,muted,disabled,placeholder,inverse}", description: "Secondary, muted, disabled, placeholder, and inverted text colors." },
      { name: "--sf-color-text--on-{primary,secondary,tertiary,action,neutral,base,surface,inverse,success,warning,error,info,danger}", description: "Auto-contrast text color to use on top of each colored surface." },
      { name: "--sf-color-heading", description: "Heading text color, slightly stronger than body text." },
      { name: "--sf-color-link", description: "Link color, derived from the action brand." },
      { name: "--sf-color-link--{hover,active,visited,underline,disabled}", description: "Link state colors and underline accent." },
      { name: "--sf-link-underline-{offset,thickness}", description: "Link underline geometry (offset from baseline, stroke thickness)." },
      { name: "--sf-color-border", description: "Default border color." },
      { name: "--sf-color-border--{subtle,strong,focus,disabled,translucent}", description: "De-emphasized, emphasized, focus, disabled, and translucent border colors." },
      { name: "--sf-color-{code-bg,code-text,mark-bg,mark-text}", description: "Inline <code> and <mark> background/foreground colors." },
      { name: "--sf-color-{white,black}", description: "Absolute white/black anchors in oklch space, for staying inside the token system." },
      { name: "--sf-color-surface", description: "Card/panel surface color (equals base)." },
      { name: "--sf-color-{inset,raised}", description: "Recessed (inset) and elevated (raised) surface background contexts." },
      { name: "--sf-color-selection-{bg,text}", description: "Text selection (::selection) background and foreground colors." },
      { name: "--sf-color-overlay", description: "Semi-transparent overlay for modals." },
      { name: "--sf-color-dim", description: "50% black overlay for dimming backgrounds." },
      { name: "--sf-color-scheme", description: "CSS color-scheme declaration (light dark). Holds a string, not a color." },
    ]
  },
  {
    category: "Typography",
    description: "Font families, fluid size scale, weights, line-heights, letter-spacing, per-size sub-properties, and heading/body/prose configuration.",
    tokens: [
      { name: "--sf-font-{body,heading,mono,display,humanist,geometric,slab}", description: "Font stacks: body, heading, mono, display, plus curated humanist/geometric/slab fallback personalities." },
      { name: "--sf-font-{features,variation}", description: "font-feature-settings and font-variation-settings hooks." },
      { name: "--sf-font-weight-{thin,extralight,light,normal,medium,semibold,bold,extrabold,black}", description: "Named weight tokens: 100→900." },
      { name: "--sf-font-weight-{body,heading,display}", description: "Contextual weight tokens for body, heading, and display text." },
      { name: "--sf-current-font-weight", description: "Current context font weight (used by strong elements)." },
      { name: "--sf-leading-{tight,snug,normal,relaxed}", description: "Line-height presets: 1.1, 1.3, 1.5, 1.625." },
      { name: "--sf-tracking-{tight,normal,wide,wider,widest}", description: "Letter-spacing presets from -0.025em to 0.1em." },
      { name: "--sf-font-numeric", description: "Numeric figure style (tabular-nums) so digits align in columns; applied to number inputs." },
      { name: "--sf-text-{2xs,xs,s,m,l,xl,2xl,3xl,4xl}", description: "Fluid type scale using clamp(). Honours --sf-text-scale." },
      { name: "--sf-text-display-{s,m,l}", description: "Extra-large display/hero sizes. Honour --sf-text-display-scale." },
      { name: "--sf-text-{scale,display-scale}", description: "Global multipliers for the body and display type scales (default 1)." },
      { name: "--sf-text-{2xs,xs,s,m,l,xl,2xl,3xl,4xl}-{line-height,font-weight,letter-spacing,max-width}", description: "Per-size sub-property override knobs (relaxed leading for small text, tight leading for display). Requires tokens.sizes-extended.css." },
      { name: "--sf-text-{xs,s,m,l,xl,2xl,3xl,4xl}-to-{2xs,xs,s,m,l,xl,2xl,3xl}", description: "Text bridge tokens: a clamp() spanning from one step (wide) to another (narrow) for extra range of motion. Requires tokens.sizes-extended.css." },
      { name: "--sf-h{1,2,3,4,5,6}-{size,font-weight,line-height,letter-spacing}", description: "Per-heading-level configuration tokens." },
      { name: "--sf-heading-{color,font-family,text-wrap}", description: "Global heading color, font stack, and text-wrap mode (balance)." },
      { name: "--sf-body-{color,font-family,font-size,font-weight,line-height,text-wrap,em-style,strong-weight}", description: "Body text configuration tokens." },
      { name: "--sf-prose-{block-margin,heading-gap,list-gap,paragraph,figure-margin,figcaption-size,media-margin,media-radius,marker-color}", description: "Long-form .sf-prose rhythm and element styling tokens." },
      { name: "--sf-code-font-size", description: "Inline <code> font-size (relative em)." },
      { name: "--sf-optical-sizing", description: "font-optical-sizing control (auto)." },
      { name: "--sf-line-clamp", description: "Default line count for .sf-line-clamp-N." },
    ]
  },
  {
    category: "Spacing",
    description: "Fluid spacing scale (clamp-based), bridge tokens, gutters, section padding, component padding, flow, safe-area insets, and sticky-header offsets.",
    tokens: [
      { name: "--sf-space-{none,px,2xs,xs,s,m,l,xl,2xl,3xl,4xl}", description: "Fluid spacing scale. Honours --sf-space-scale (none/px are fixed)." },
      { name: "--sf-space-scale", description: "Global multiplier for all space tokens (default 1)." },
      { name: "--sf-space-{2xs,xs,s,m,l,xl,2xl,3xl,4xl}-to-{2xs,xs,s,m,l,xl,2xl,3xl}", description: "Spacing bridge tokens: clamp() spanning a wider range than any single step. Requires tokens.sizes-extended.css." },
      { name: "--sf-space-{gutter,gap,content}", description: "Internal aliases: page gutter, default gap, content gap (consumed by --sf-gap / --sf-content-gap)." },
      { name: "--sf-gap / --sf-gap-size", description: "Default layout gap and its raw size component." },
      { name: "--sf-content-gap", description: "Gap between content elements (defaults to space-s)." },
      { name: "--sf-component-pad", description: "Internal padding for components (defaults to space-m)." },
      { name: "--sf-section-pad", description: "Active section padding alias." },
      { name: "--sf-section-pad--{xs,s,m,l,xl,2xl}", description: "Vertical padding presets for page sections." },
      { name: "--sf-flow-space", description: "Gap applied between .sf-flow children (lobotomized owl)." },
      { name: "--sf-safe-{top,right,bottom,left}", description: "Safe-area insets for notched devices." },
      { name: "--sf-header-height", description: "Resolved fixed-header height for sticky offset calculations." },
      { name: "--sf-header-height-{mobile,desktop}", description: "Per-breakpoint header height inputs." },
      { name: "--sf-sticky-offset", description: "Resolved sticky offset (defaults to header height)." },
      { name: "--sf-sticky-offset-{mobile,desktop}", description: "Per-breakpoint sticky offset inputs." },
    ]
  },
  {
    category: "Sizing",
    description: "Component sizes, touch targets, aspect ratios, and icon sizing.",
    tokens: [
      { name: "--sf-size-{xs,s,m,l,xl}", description: "Named size tokens: xs(1.5rem), s(2rem), m(2.5rem), l(2.75rem), xl(3.5rem)." },
      { name: "--sf-touch-target", description: "Minimum interactive element size (defaults to size-l, 2.75rem)." },
      { name: "--sf-ratio-{square,portrait,video,cinema,golden,3-2,4-3}", description: "Predefined aspect ratios for frames and containers." },
      { name: "--sf-aspect", description: "Generic aspect-ratio token read by the .sf-aspect macro (16/9)." },
      { name: "--sf-object-{fit,position}", description: "Default object-fit (cover) and object-position (50% 50%) for media elements." },
      { name: "--sf-content-intrinsic-size", description: "Placeholder size for the .sf-content-auto macro's contain-intrinsic-size (500px)." },
    ]
  },
  {
    category: "Layout",
    description: "Container widths and layout-primitive tokens (stack, cluster, grid, sidebar, switcher, bento, cover, frame, reel, imposter, box, center, content-grid, divider, alternate, equal, multi-column).",
    tokens: [
      { name: "--sf-container-{narrow,default,prose,wide,full}", description: "Max-width presets for .sf-container." },
      { name: "--sf-stack-gap", description: "Vertical gap between .sf-stack children." },
      { name: "--sf-cluster-{gap,align,justify}", description: "Inline cluster layout tokens." },
      { name: "--sf-sidebar-{width,gap,min-width}", description: "Sidebar layout tokens." },
      { name: "--sf-switcher-{threshold,gap}", description: "Column-to-stack breakpoint and gap." },
      { name: "--sf-grid-{min,gap}", description: "Auto-fill grid minimum item width and gap." },
      { name: "--sf-grid-min-{xs,s,m,l,xl,2xl}", description: "Per-size minimum item widths for .sf-grid--*." },
      { name: "--sf-bento-{cols-default,gap,row-default,row-compact,row-tall}", description: "Dense bento grid configuration." },
      { name: "--sf-cover-{min-height,padding}", description: "Full-height cover layout." },
      { name: "--sf-frame-ratio", description: "Aspect ratio for .sf-frame (defaults to 16/9)." },
      { name: "--sf-reel-{gap,height,item-width}", description: "Horizontal scroll strip configuration." },
      { name: "--sf-imposter-margin", description: "Safety margin for absolute-centered overlays." },
      { name: "--sf-box-{padding,border-color,border-width}", description: "Isolated .sf-box unit padding and border." },
      { name: "--sf-center-{gutter,max}", description: "Intrinsic-centering gutter and max-width." },
      { name: "--sf-content-width / --sf-breakout-width", description: "Breakout grid track widths." },
      { name: "--sf-divider-{color,style,width,gap}", description: "Divider appearance and surrounding gap tokens." },
      { name: "--sf-alternate-{gap,inner-gap}", description: "Zigzag .sf-alternate layout gaps." },
      { name: "--sf-equal-{cols,gap}", description: "Equal-columns count and gap." },
      { name: "--sf-col-width-{s,m,l}", description: "CSS multi-column track widths (ch-based)." },
      { name: "--sf-col-rule-width-{s,m,l}", description: "CSS multi-column rule (divider) widths." },
      { name: "--sf-field-{block,required-marker}", description: "Form field vertical spacing and required indicator string." },
    ]
  },
  {
    category: "Borders",
    description: "Border shorthands, widths, styles, and stroke widths.",
    tokens: [
      { name: "--sf-border / --sf-border-{subtle,strong}", description: "Composed border shorthands (width + style + color). Replaces the three-part recipe." },
      { name: "--sf-border-width-{hairline,1,2,3,4}", description: "Border width scale: 0.5px, 1px, 2px, 3px, 4px." },
      { name: "--sf-border-style", description: "Default border style (solid)." },
      { name: "--sf-border-style-{dotted,soft,strong}", description: "Border style presets (dotted, dashed, solid)." },
      { name: "--sf-stroke-{thin,regular,bold,heavy}", description: "Stroke widths for SVG/icon use: 1px, 1.5px, 2px, 3px." },
    ]
  },
  {
    category: "Radius",
    description: "Border radius scale and special shapes.",
    tokens: [
      { name: "--sf-radius-{none,xs,s,m,l,xl,2xl,3xl,4xl,full}", description: "Radius scale from 0 to 9999px (pill)." },
      { name: "--sf-radius-scale", description: "Global multiplier for all radius tokens (default 1)." },
      { name: "--sf-radius-pill", description: "Fully rounded (9999px)." },
      { name: "--sf-radius-outer", description: "Outer radius = inner + padding (for nested rounding)." },
    ]
  },
  {
    category: "Shadows",
    description: "Box shadows, drop shadows, text shadows, and shadow configuration.",
    tokens: [
      { name: "--sf-shadow-{xs,s,m,l,xl,2xl}", description: "Elevation shadow scale, progressively more dramatic." },
      { name: "--sf-shadow-inner", description: "Inset shadow for recessed elements." },
      { name: "--sf-shadow-glow", description: "Colored glow effect (uses --sf-shadow-glow-color)." },
      { name: "--sf-shadow-none", description: "Explicit no-shadow value." },
      { name: "--sf-shadow-color / --sf-shadow-glow-color", description: "Base shadow color (derived from neutral) and glow color." },
      { name: "--sf-shadow-strength", description: "Shadow opacity multiplier (adapts to dark mode)." },
      { name: "--sf-drop-shadow-{s,m,l}", description: "CSS filter drop-shadow equivalents." },
      { name: "--sf-text-shadow-{s,m,l,none}", description: "Text shadow presets." },
    ]
  },
  {
    category: "Effects",
    description: "Blurs, opacities, gradients, masks, perspective, and contrast tuning.",
    tokens: [
      { name: "--sf-blur-{xs,s,m,l,xl}", description: "Blur radius scale: 4px to 48px." },
      { name: "--sf-opacity-{0,10,25,50,75,100,disabled}", description: "Named opacity presets." },
      { name: "--sf-gradient-{brand,primary,secondary,tertiary,surface}", description: "Predefined gradients using brand colors." },
      { name: "--sf-gradient-fade--{t,b,l,r}", description: "Directional fade-to-background gradients." },
      { name: "--sf-mask-scrim-{start,end}", description: "Scroll mask fade depth." },
      { name: "--sf-scrim-{color,direction,gradient}", description: "Darkening overlay for the .sf-scrim text-over-image macro." },
      { name: "--sf-scrim-text-shadow", description: "Soft text-shadow halo for the .sf-text-protect macro." },
      { name: "--sf-perspective-{near,normal,far}", description: "3D perspective presets: 500px, 1000px, 2000px." },
      { name: "--sf-contrast-{bias,threshold}", description: "Color contrast tuning for auto text-on-color logic." },
    ]
  },
  {
    category: "Motion",
    description: "Durations, easing curves, transitions, and animations.",
    tokens: [
      { name: "--sf-duration-{none,instant,fast,normal,slow,slower}", description: "Duration scale: 0ms to 600ms (respects --sf-motion-scale)." },
      { name: "--sf-motion-scale", description: "Global animation speed multiplier (set 0 to disable)." },
      { name: "--sf-ease-{linear,in,out,in-out,bounce,elastic,overshoot,spring}", description: "Easing function presets." },
      { name: "--sf-transition-{all,colors,opacity,shadow,transform,fast,slow,enter,exit,overlay}", description: "Pre-composed transition shorthands (overlay = top-layer display/overlay with allow-discrete)." },
      { name: "--sf-animation-{fade-in,fade-out,scale-up,scale-down,slide-in-up,slide-in-down,slide-in-left,slide-in-right,float,ping,blink,color-pulse,shimmer,spin}", description: "Named keyframe animation shorthands." },
      { name: "--sf-animation-delay-{1,2,3,4,5}", description: "Stagger delays for sequential animations." },
    ]
  },
  {
    category: "Icons",
    description: "Inline icon sizing and the boxed-icon container.",
    tokens: [
      { name: "--sf-icon-{xs,s,m,l,xl,2xl}", description: "Icon sizing in em units (0.875em to ~3em)." },
      { name: "--sf-icon-box-{bg,border,pad,radius}", description: "Boxed icon (.sf-icon--boxed) background, border, padding, radius." },
    ]
  },
  {
    category: "Z-Index",
    description: "Z-index scale for predictable layering.",
    tokens: [
      { name: "--sf-z-{below,base,raised,low,mid,high,top,max}", description: "Z-index scale: -1, 0, 1, 10, 100, 500, 900, 9999." },
      { name: "--sf-z-{sticky,fixed,dropdown,toast,overlay}", description: "Semantic z-index aliases onto the scale: sticky/fixed/dropdown/toast/overlay. Modal/popover use the native top layer." },
    ]
  },
  {
    category: "States",
    description: "Internal flags and state tokens that drive runtime .is-* behaviour.",
    tokens: [
      { name: "--sf-is-dark", description: "Numeric flag (0 or 1) indicating dark mode is active. Registered property." },
      { name: "--sf-is-{active,current,open,pressed}", description: "Internal numeric/derived flags mirrored from matching .is-* classes." },
      { name: "--sf-state-pending-opacity", description: "Opacity applied to elements in the .is-pending optimistic state." },
    ]
  },
  {
    category: "Focus",
    description: "Focus ring appearance for keyboard navigation.",
    tokens: [
      { name: "--sf-focus-ring-{width,offset,color,style,shadow}", description: "Focus indicator configuration." },
      { name: "--sf-caret-color", description: "Text input caret color (defaults to action)." },
    ]
  },
  {
    category: "Scroll",
    description: "Scroll timeline, scroll-shadow, and scrollbar styling.",
    tokens: [
      { name: "--sf-scroll-timeline-range-{start,end}", description: "Scroll-driven animation range." },
      { name: "--sf-scroll-shadow-size", description: "Depth of the .sf-scroll-shadow mask gradient." },
      { name: "--sf-scrollbar-{thumb,track}", description: "Custom scrollbar colors." },
    ]
  },
  {
    category: "Print",
    description: "Print stylesheet configuration.",
    tokens: [
      { name: "--sf-print-{base-size,page-margin,page-size}", description: "Print layout tokens: 11pt base, 2cm margins, A4 size." },
    ]
  },
  {
    category: "Misc",
    description: "Internal helpers and string-valued tokens that don't belong to a single visual family.",
    tokens: [
      { name: "--sf-lumlocker", description: "Internal luminance lock value for color derivation." },
      { name: "--sf-truncate-suffix", description: "Ellipsis string used by truncation utilities." },
      { name: "--sf-link-external-marker", description: "External link arrow character." },
    ]
  }
];

export const classGroups = [
  {
    category: "Layout Primitives",
    description: "Breakpoint-free, container-query-driven layout components. Each is a single class with per-instance token overrides via inline style.",
    classes: [
      { name: ".sf-section / .sf-section-group", description: "Vertical page rhythm; -group collapses gap between adjacent sections." },
      { name: ".sf-section--{xs,s,m,l,xl,2xl,collapse}", description: "Section size variants and collapse." },
      { name: ".sf-container", description: "Centered max-width wrapper with gutters." },
      { name: ".sf-container--{narrow,wide,full,prose}", description: "Container width variants." },
      { name: ".sf-box", description: "Isolated unit with padding and optional border." },
      { name: ".sf-center / .sf-center--intrinsic", description: "Intrinsic centering with max-width." },
      { name: ".sf-stack", description: "Vertical flow with consistent gap." },
      { name: ".sf-stack--{xs,s,m,l,xl,2xl,center,end,stretch}", description: "Stack size and alignment variants." },
      { name: ".sf-cluster", description: "Wrapping inline group." },
      { name: ".sf-cluster--{xs,s,m,l,xl,2xl,center,end,between,no-wrap}", description: "Cluster size, alignment, and wrap variants." },
      { name: ".sf-sidebar", description: "Content + side panel that wraps." },
      { name: ".sf-sidebar--{right,narrow,wide}", description: "Sidebar side and width variants." },
      { name: ".sf-switcher", description: "N columns above threshold, stacked below." },
      { name: ".sf-switcher--{no-wrap,vertical}", description: "Switcher behaviour variants." },
      { name: ".sf-grid", description: "Auto-fill responsive grid." },
      { name: ".sf-grid--{xs,s,m,l,xl,2xl,fit,dense}", description: "Grid item-size and packing variants." },
      { name: ".sf-grid-{1,2,3,4,6}", description: "Fixed-column grids, container-responsive." },
      { name: ".sf-grid-{1-2,2-1,1-3,3-1}", description: "Ratio two-column grids." },
      { name: ".sf-bento", description: "Dense free-form grid." },
      { name: ".sf-bento--{2,4,compact,tall}", description: "Bento column-count and row-height variants." },
      { name: ".sf-equal / .sf-equal-height", description: "Equal-width columns; -height equalizes flex child heights." },
      { name: ".sf-equal--{2,3,4,6}", description: "Equal-columns count variants." },
      { name: ".sf-gap", description: "Standalone gap utility for grid/flex parents." },
      { name: ".sf-gap--{xs,s,m,l,xl,2xl}", description: "Gap size variants." },
      { name: ".sf-alternate", description: "Zigzag two-column layout, reverses every other row." },
      { name: ".sf-pancake", description: "Sticky-footer grid: header / main(1fr) / footer." },
      { name: ".sf-content-grid", description: "Breakout layout grid. Children use .sf-breakout or .sf-full-bleed." },
      { name: ".sf-breakout / .sf-full-bleed", description: "Content-grid escape hatches: breakout band and edge-to-edge bleed." },
      { name: ".sf-cover / .sf-cover__center", description: "Full-height region with a centered content child." },
      { name: ".sf-cover--{min,max,padding-s,padding-l}", description: "Cover height and padding variants." },
      { name: ".sf-frame", description: "Aspect-ratio media box." },
      { name: ".sf-frame--{square,portrait,video,cinema,3-2,4-3,golden}", description: "Frame aspect-ratio variants." },
      { name: ".sf-reel", description: "Horizontal scroll strip with optional mask fade." },
      { name: ".sf-imposter / .sf-imposter--{fixed,contain}", description: "Absolutely-centered overlay and its position variants." },
      { name: ".sf-subgrid / .sf-subgrid-rows", description: "Inherit parent grid tracks." },
      { name: ".sf-divider / .sf-divider--vertical", description: "Token-driven separator (horizontal or vertical)." },
      { name: ".sf-divider--{soft,strong,dashed,dotted,gradient}", description: "Divider colour/line-style modifiers and a fading gradient variant." },
      { name: ".sf-icon", description: "Em-based inline icon sizing." },
      { name: ".sf-icon--{xs,s,m,l,xl,2xl,boxed}", description: "Icon size variants and boxed container." },
      { name: ".sf-prose / .sf-not-prose", description: "Readable long-form text rhythm; -not resets a zone inside it." },
    ]
  },
  {
    category: "Macros",
    description: "Recipe classes that answer 'what does this element do/look like?' - composable with layout primitives.",
    classes: [
      { name: ".sf-flow", description: "Lobotomized owl: consistent gap between consecutive children." },
      { name: ".sf-truncate", description: "Single-line ellipsis overflow." },
      { name: ".sf-line-clamp-{2,3,N}", description: "Multi-line text clamping with ellipsis. -N reads --sf-line-clamp." },
      { name: ".sf-aspect", description: "Generic aspect-ratio container (reads --sf-aspect token)." },
      { name: ".sf-scroll-shadow", description: "Top + bottom mask gradient for scrolling containers." },
      { name: ".sf-scroll-snap", description: "Vertical scroll-snap container." },
      { name: ".sf-overflow-fade", description: "End-edge horizontal fade for overflowing inline content." },
      { name: ".sf-no-tap-highlight", description: "Suppresses WebKit/Android tap highlight." },
      { name: ".sf-content-auto", description: "content-visibility:auto — skips rendering offscreen content (reads --sf-content-intrinsic-size)." },
      { name: ".sf-tabular-nums", description: "Fixed-width digits for column-aligned numbers (reads --sf-font-numeric)." },
      { name: ".sf-text-gradient", description: "Gradient text effect using background-clip." },
      { name: ".sf-clickable-parent / .sf-focus-parent", description: "Makes a whole card clickable via the first link inside; -focus mirrors focus ring to the parent." },
      { name: ".sf-focus-shadow", description: "Opt-in: switches :focus-visible from outline to a box-shadow ring (follows border-radius)." },
      { name: ".sf-link-external", description: "Adds external link indicator marker." },
      { name: ".sf-link--{subtle,reverse}", description: "Link underline affordance: subtle reveals on hover, reverse hides on hover." },
      { name: ".sf-scrim / .sf-scrim--{top,bottom,full}", description: "Darkening gradient overlay for legible text over a background image." },
      { name: ".sf-text-protect", description: "Soft text-shadow halo for legibility over busy images, without a darkening layer." },
    ]
  },
  {
    category: "Surfaces",
    description: "Color surface utility classes that set background and auto-contrast text for a brand context.",
    classes: [
      { name: ".sf-surface--{primary,secondary,tertiary,action,neutral,inverse}", description: "Brand-colored surface with auto-contrast text." },
      { name: ".sf-surface--{success,warning,error,info,danger}", description: "Status-colored surfaces." },
    ]
  },
  {
    category: "Animations",
    description: "CSS animation utility classes that apply predefined keyframe animations.",
    classes: [
      { name: ".sf-fade-in / .sf-fade-out", description: "Opacity entrance/exit animations." },
      { name: ".sf-scale-up / .sf-scale-down", description: "Scale entrance/exit animations." },
      { name: ".sf-slide-in-{up,down,left,right}", description: "Directional slide-in entrance animations." },
      { name: ".sf-color-pulse", description: "Continuous color pulse animation." },
      { name: ".sf-entrance--{fade,fade-up,fade-down,fade-left,fade-right,scale-up}", description: "Scroll-triggered entrance animations (scroll-timeline driven)." },
    ]
  },
  {
    category: "State Classes (.is-*)",
    description: "Runtime state classes toggled by JS or mirrored from ARIA. They live in the slashed.states layer. Always pair with matching ARIA attributes.",
    classes: [
      { name: ".is-hidden / .is-invisible / .is-visible", description: "Visibility control: removed from layout / hidden but keeps box / visible." },
      { name: ".is-disabled / .is-readonly", description: "Non-interactive states with dimming." },
      { name: ".is-loading / .is-pending / .is-busy", description: "Loading states: spinner replacement / optimistic UI / cursor hint." },
      { name: ".is-skeleton", description: "Placeholder shimmer animation." },
      { name: ".is-active / .is-selected / .is-current / .is-pressed", description: "Selection/activation states." },
      { name: ".is-highlighted", description: "Transient emphasis (e.g. search result highlight)." },
      { name: ".is-open / .is-collapsed / .is-expanded", description: "Disclosure states for modals, drawers, accordions." },
      { name: ".is-valid / .is-invalid", description: "Form field validation results (maps to aria-invalid)." },
      { name: ".is-success / .is-error / .is-warning / .is-info / .is-danger", description: "General feedback states and destructive-action context." },
      { name: ".is-sticky / .is-pinned / .is-fixed / .is-fullscreen", description: "Positioning states." },
      { name: ".is-clipped / .is-scrollable / .is-truncated / .is-resizable", description: "Overflow handling states." },
      { name: ".is-dragging / .is-drop-target / .is-draggable", description: "Drag and drop states." },
      { name: ".is-overlay / .is-focused / .is-clickable / .is-unselectable", description: "Positioning, focus, cursor, and selection states." },
      { name: ".is-empty", description: "Hide element when empty (:empty pseudo-class)." },
    ]
  }
];

export const miscTokens = [
  { name: "--sf-is-dark", description: "Numeric flag (0 or 1) indicating dark mode is active. Registered property." },
  { name: "--sf-lumlocker", description: "Internal luminance lock value for color derivation." },
  { name: "--sf-color-scheme", description: "CSS color-scheme declaration (light dark)." },
  { name: "--sf-current-font-weight", description: "Current context font weight (used by strong elements)." },
  { name: "--sf-link-external-marker", description: "External link arrow character." },
  { name: "--sf-field-block", description: "Vertical spacing between form fields." },
  { name: "--sf-field-required-marker", description: "Required field indicator string." },
];
