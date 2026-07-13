// Shared HTML builders for the live-preview gallery. Every specimen is built
// from REAL framework classes (.sf-*) plus the thin token-driven pv-* skin
// (see ./skin.ts). Values that need to vary per specimen use inline
// `style="…:var(--sf-*)"` — still 100% token-driven, so configurator overrides
// update them live exactly like a class would. Nothing here re-implements a
// framework component; it only arranges real ones and labels them.

/** Escape text that ends up as HTML content (token/class names, notes). */
export function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Monospace caption under a specimen (class/token name or scale step). */
export function tag(text: string): string {
  return `<span class="pv-swatch-label">${esc(text)}</span>`;
}

/** A labelled specimen cell: the rendered thing, then its name underneath. */
export function specimen(label: string, body: string): string {
  return `<div class="sf-stack sf-stack--xs sf-stack--center pv-center-text">${body}${tag(label)}</div>`;
}

/** A titled section block (eyebrow + optional note + content). */
export function section(eyebrow: string, content: string, note?: string): string {
  const noteHtml = note ? `<p class="pv-secondary">${esc(note)}</p>` : "";
  return `<section class="sf-stack sf-stack--m" data-pv-section="${esc(eyebrow)}">
  <div class="pv-eyebrow">${esc(eyebrow)}</div>
  ${noteHtml}
  ${content}
</section>`;
}

/** The page shell every tab body is wrapped in. `head` is the tab title row. */
export function page(title: string, lead: string, ...sections: string[]): string {
  return `<div class="sf-container sf-section sf-stack sf-stack--2xl">
  <header class="sf-stack sf-stack--s">
    <div class="pv-eyebrow">Framework API</div>
    <h2 class="pv-type--display-s pv-heading pv-strong">${esc(title)}</h2>
    <p class="pv-lead pv-measure">${esc(lead)}</p>
  </header>
  ${sections.join("\n")}
</div>`;
}

export function cluster(...items: string[]): string {
  return `<div class="sf-cluster sf-cluster--s">${items.join("")}</div>`;
}

export function stack(gap: "xs" | "s" | "m" | "l", ...items: string[]): string {
  return `<div class="sf-stack sf-stack--${gap}">${items.join("")}</div>`;
}

/** A responsive auto-fitting grid of specimen cells. `min` in rem. */
export function grid(min: number, ...items: string[]): string {
  return `<div class="sf-grid" style="--sf-grid-min:${min}rem">${items.join("")}</div>`;
}

/** A bordered card used as a neutral backdrop for a specimen row. */
export function well(content: string): string {
  return `<div class="sf-card sf-card--bordered">${content}</div>`;
}

/** A plain bordered surface backdrop — like `well`, but NOT a `.sf-card`.
 *  Use for rows of `.sf-btn`: the framework's `.sf-card .sf-btn` rule pins a
 *  nested button's label to `--sf-text-s`, which would flatten a per-size
 *  button font ladder; a non-card frame lets each button render its true size. */
export function frame(content: string): string {
  return `<div style="padding:var(--sf-space-l);background:var(--sf-color-surface);border:var(--sf-border-width-1) solid var(--sf-color-border);border-radius:var(--sf-radius-l)">${content}</div>`;
}
