<script>
  /**
   * Floating OKLCH/OKLab picker.
   *
   * Renders fixed-positioned over the host swatch, with three sliders driving
   * either an OKLCH (L · C · H) or OKLab (L · a · b) emission. A HEX input
   * round-trips legacy 6/8-digit hex via the linear-RGB → OKLab path.
   *
   * Why OKLCH: every framework color is authored in OKLCH and shades are
   * derived with `oklch(from …)`, so picking in OKLCH stays in the same
   * perceptual space the framework renders.
   */
  import { onMount } from 'svelte';

  let {
    value = '',
    top = 0,
    left = 0,
    triggerEl = null,
    onpick,
    onclose,
  } = $props();

  let mode = $state('oklch');
  // oklch channels
  let l = $state(0.6);
  let c = $state(0.15);
  let h = $state(220);
  // oklab channels
  let ll = $state(0.6);
  let la = $state(0.0);
  let lb = $state(0.0);

  // Last value emitted by this picker — used to skip re-parsing our own output.
  let emittedValue = '';

  function fmt(n, d = 3) {
    return parseFloat(n.toFixed(d)).toString();
  }

  // ── Color conversion utilities ────────────────────────────────────────────
  function gammaExpand(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function gammaCompress(c) {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function toHexComp(x) {
    const v = Math.round(clamp01(x) * 255);
    return v.toString(16).padStart(2, '0');
  }

  function hexToLinearRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3 || h.length === 4) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    const n = parseInt(h.slice(0, 6), 16);
    return {
      r: gammaExpand(((n >> 16) & 255) / 255),
      g: gammaExpand(((n >>  8) & 255) / 255),
      b: gammaExpand(( n        & 255) / 255),
    };
  }

  function hslToLinearRgb(hDeg, s, lv) {
    s /= 100; lv /= 100;
    const k = (n) => (n + hDeg / 30) % 12;
    const a = s * Math.min(lv, 1 - lv);
    const f = (n) => lv - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return { r: gammaExpand(f(0)), g: gammaExpand(f(8)), b: gammaExpand(f(4)) };
  }

  function linearRgbToOklab({ r, g, b }) {
    const l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b;
    const m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b;
    const s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b;
    const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
    return {
      L:  0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_,
      a:  1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_,
      b:  0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_,
    };
  }

  function oklabToLinearRgb({ L, a, b }) {
    const l_ = L + 0.3963377774*a + 0.2158037573*b;
    const m_ = L - 0.1055613458*a - 0.0638541728*b;
    const s_ = L - 0.0894841775*a - 1.2914855480*b;
    const l = l_*l_*l_, m = m_*m_*m_, s = s_*s_*s_;
    return {
      r:  4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
      g: -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
      b: -0.0041960863*l - 0.7034186147*m + 1.7076147010*s,
    };
  }

  function oklabToOklch({ L, a, b }) {
    const C = Math.sqrt(a*a + b*b);
    let H = (Math.atan2(b, a) * 180) / Math.PI;
    if (H < 0) H += 360;
    return { L, C, H };
  }

  function applyOklch({ L, C, H }) {
    mode = 'oklch';
    l = Math.max(0, Math.min(1, L));
    c = Math.max(0, Math.min(0.4, C));
    h = ((H % 360) + 360) % 360;
  }

  // ── HEX round-trip ───────────────────────────────────────────────────────
  // Compute current color in HEX (best-effort; uses gamut-mapped sRGB).
  function currentLinearRgb() {
    if (mode === 'oklch') {
      const a = c * Math.cos((h * Math.PI) / 180);
      const b = c * Math.sin((h * Math.PI) / 180);
      return oklabToLinearRgb({ L: l, a, b });
    }
    return oklabToLinearRgb({ L: ll, a: la, b: lb });
  }

  const currentHex = $derived.by(() => {
    const lin = currentLinearRgb();
    return '#' + toHexComp(gammaCompress(lin.r))
              + toHexComp(gammaCompress(lin.g))
              + toHexComp(gammaCompress(lin.b));
  });

  /** @type {string} */
  let hexInput = $state('');
  // Sync the hex input field when the sliders move.
  $effect(() => { hexInput = currentHex; });

  function onHexChange(e) {
    const v = (e.currentTarget?.value ?? '').trim();
    if (/^#?[0-9a-fA-F]{3}$/.test(v) || /^#?[0-9a-fA-F]{6}$/.test(v) || /^#?[0-9a-fA-F]{8}$/.test(v)) {
      const norm = v.startsWith('#') ? v : '#' + v;
      try {
        applyOklch(oklabToOklch(linearRgbToOklab(hexToLinearRgb(norm))));
        emit();
      } catch {}
    }
  }

  // ── Parser (incoming `value` from the editor) ────────────────────────────
  function parse(v) {
    if (!v) return;
    const s = v.trim();

    const oklchM = /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/.exec(s);
    if (oklchM) {
      mode = 'oklch';
      const rawL = oklchM[1];
      l = Math.min(1, rawL.endsWith('%') ? parseFloat(rawL) / 100 : parseFloat(rawL));
      c = Math.min(parseFloat(oklchM[2]), 0.4);
      h = parseFloat(oklchM[3]);
      return;
    }

    const oklabM = /^oklab\(\s*([\d.]+%?)\s+([-\d.]+)\s+([-\d.]+)/.exec(s);
    if (oklabM) {
      mode = 'oklab';
      const rawL = oklabM[1];
      ll = Math.min(1, rawL.endsWith('%') ? parseFloat(rawL) / 100 : parseFloat(rawL));
      la = Math.max(-0.4, Math.min(0.4, parseFloat(oklabM[2])));
      lb = Math.max(-0.4, Math.min(0.4, parseFloat(oklabM[3])));
      return;
    }

    if (/^#[0-9a-fA-F]{3,8}$/.test(s)) {
      try { applyOklch(oklabToOklch(linearRgbToOklab(hexToLinearRgb(s)))); } catch {}
      return;
    }

    const hslM = /^hsla?\(\s*([\d.]+)(?:deg|rad|turn|grad)?\s*[, ]\s*([\d.]+)%?\s*[, ]\s*([\d.]+)%?/.exec(s);
    if (hslM) {
      try { applyOklch(oklabToOklch(linearRgbToOklab(hslToLinearRgb(parseFloat(hslM[1]), parseFloat(hslM[2]), parseFloat(hslM[3]))))); } catch {}
    }
  }

  $effect(() => {
    const v = value;
    if (v !== emittedValue) parse(v);
  });

  const cssColor = $derived(
    mode === 'oklch'
      ? `oklch(${fmt(l)} ${fmt(c)} ${fmt(h, 1)})`
      : `oklab(${fmt(ll)} ${fmt(la)} ${fmt(lb)})`
  );

  const lBg = $derived(
    mode === 'oklch'
      ? `linear-gradient(to right,oklch(0 ${fmt(c)} ${fmt(h, 1)}),oklch(1 ${fmt(c)} ${fmt(h, 1)}))`
      : `linear-gradient(to right,oklab(0 ${fmt(la)} ${fmt(lb)}),oklab(1 ${fmt(la)} ${fmt(lb)}))`
  );

  const cBg = $derived(
    `linear-gradient(to right,oklch(${fmt(l)} 0 ${fmt(h, 1)}),oklch(${fmt(l)} 0.4 ${fmt(h, 1)}))`
  );

  const hBg = $derived.by(() => {
    const chroma = fmt(Math.max(c, 0.12));
    const stops = [];
    for (let i = 0; i <= 12; i++) {
      stops.push(`oklch(${fmt(l)} ${chroma} ${(30 * i).toFixed(0)})`);
    }
    return `linear-gradient(to right,${stops.join(',')})`;
  });

  const aBg = $derived(
    `linear-gradient(to right,oklab(${fmt(ll)} -0.4 ${fmt(lb)}),oklab(${fmt(ll)} 0.4 ${fmt(lb)}))`
  );

  const bBg = $derived(
    `linear-gradient(to right,oklab(${fmt(ll)} ${fmt(la)} -0.4),oklab(${fmt(ll)} ${fmt(la)} 0.4))`
  );

  function emit() {
    emittedValue = cssColor;
    onpick?.(cssColor);
  }

  function switchMode(m) {
    if (m !== mode) {
      mode = m;
      emit();
    }
  }

  // Eyedropper API — only some browsers (Chromium-based as of 2024+).
  const hasEyedropper = typeof window !== 'undefined' && 'EyeDropper' in window;
  async function pickFromScreen() {
    try {
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      if (result?.sRGBHex) {
        applyOklch(oklabToOklch(linearRgbToOklab(hexToLinearRgb(result.sRGBHex))));
        emit();
      }
    } catch {
      // user cancelled
    }
  }

  let el = $state(null);

  function onDocPointer(e) {
    const insidePicker = el?.contains(e.target);
    const onTrigger = triggerEl?.contains(e.target);
    if (!insidePicker && !onTrigger) onclose?.();
  }

  function onKey(e) {
    if (e.key === 'Escape') onclose?.();
  }

  onMount(() => {
    document.addEventListener('pointerdown', onDocPointer, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer, true);
      document.removeEventListener('keydown', onKey);
    };
  });
</script>

<div
  class="oklch"
  bind:this={el}
  style:top="{top}px"
  style:left="{left}px"
  role="dialog"
  aria-label="Color picker"
>
  <div class="oklch__preview" style:--pc={cssColor}></div>

  <div class="oklch__top">
    <div class="cfg-seg oklch__modes" role="group" aria-label="Color space">
      <button class="cfg-seg__btn" class:cfg-seg__btn--on={mode === 'oklch'} onclick={() => switchMode('oklch')}>oklch</button>
      <button class="cfg-seg__btn" class:cfg-seg__btn--on={mode === 'oklab'} onclick={() => switchMode('oklab')}>oklab</button>
    </div>
    {#if hasEyedropper}
      <button class="oklch__icon-btn" type="button" onclick={pickFromScreen} title="Pick a color from the screen" aria-label="Eyedropper">
        <span aria-hidden="true">⊙</span>
      </button>
    {/if}
  </div>

  {#if mode === 'oklch'}
    <label class="oklch__row">
      <span class="oklch__ch">L</span>
      <input class="oklch__slider" type="range" min="0" max="1" step="0.001" bind:value={l} oninput={emit} style:--trk={lBg} />
      <input class="oklch__num" type="number" min="0" max="1" step="0.001" bind:value={l} oninput={emit} />
    </label>
    <label class="oklch__row">
      <span class="oklch__ch">C</span>
      <input class="oklch__slider" type="range" min="0" max="0.4" step="0.001" bind:value={c} oninput={emit} style:--trk={cBg} />
      <input class="oklch__num" type="number" min="0" max="0.4" step="0.001" bind:value={c} oninput={emit} />
    </label>
    <label class="oklch__row">
      <span class="oklch__ch">H</span>
      <input class="oklch__slider" type="range" min="0" max="360" step="0.5" bind:value={h} oninput={emit} style:--trk={hBg} />
      <input class="oklch__num" type="number" min="0" max="360" step="0.5" bind:value={h} oninput={emit} />
    </label>
  {:else}
    <label class="oklch__row">
      <span class="oklch__ch">L</span>
      <input class="oklch__slider" type="range" min="0" max="1" step="0.001" bind:value={ll} oninput={emit} style:--trk={lBg} />
      <input class="oklch__num" type="number" min="0" max="1" step="0.001" bind:value={ll} oninput={emit} />
    </label>
    <label class="oklch__row">
      <span class="oklch__ch">a</span>
      <input class="oklch__slider" type="range" min="-0.4" max="0.4" step="0.001" bind:value={la} oninput={emit} style:--trk={aBg} />
      <input class="oklch__num" type="number" min="-0.4" max="0.4" step="0.001" bind:value={la} oninput={emit} />
    </label>
    <label class="oklch__row">
      <span class="oklch__ch">b</span>
      <input class="oklch__slider" type="range" min="-0.4" max="0.4" step="0.001" bind:value={lb} oninput={emit} style:--trk={bBg} />
      <input class="oklch__num" type="number" min="-0.4" max="0.4" step="0.001" bind:value={lb} oninput={emit} />
    </label>
  {/if}

  <div class="oklch__hex">
    <span class="oklch__hex-label">HEX</span>
    <input
      class="oklch__hex-input"
      type="text"
      spellcheck="false"
      bind:value={hexInput}
      oninput={onHexChange}
      maxlength="9"
      aria-label="Hex value"
    />
  </div>

  <code class="oklch__out">{cssColor}</code>
</div>

<style>
  .oklch {
    position: fixed;
    z-index: 9999;
    background: var(--cfg-surface-2);
    border: 1px solid var(--cfg-border-strong);
    border-radius: var(--cfg-radius);
    padding: 12px;
    width: 304px;
    box-shadow: var(--cfg-shadow-pop);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .oklch__preview {
    height: 44px;
    border-radius: var(--cfg-radius-s);
    border: 1px solid var(--cfg-border);
    background-image:
      linear-gradient(var(--pc, transparent), var(--pc, transparent)),
      conic-gradient(#444 25%, #2a2a2a 0 50%, #444 0 75%, #2a2a2a 0);
    background-size: cover, 12px 12px;
  }

  .oklch__top { display: flex; align-items: center; gap: 8px; }
  .oklch__modes { flex: 1; }
  .oklch__icon-btn {
    width: 32px;
    height: 28px;
    background: var(--cfg-bg);
    border: 1px solid var(--cfg-border-strong);
    border-radius: var(--cfg-radius-s);
    color: var(--cfg-text-muted);
    font-size: 16px;
    line-height: 1;
  }
  .oklch__icon-btn:hover { color: var(--cfg-text); border-color: var(--cfg-border-focus); }

  .oklch__row {
    display: grid;
    grid-template-columns: 14px 1fr 60px;
    gap: 8px;
    align-items: center;
  }
  .oklch__ch {
    font-family: var(--cfg-mono);
    font-size: 11px;
    color: var(--cfg-text-faint);
    text-align: center;
  }
  .oklch__slider {
    -webkit-appearance: none;
    appearance: none;
    height: 12px;
    border-radius: 6px;
    background: var(--trk, #555);
    outline: none;
    cursor: pointer;
    border: 1px solid rgba(0, 0, 0, 0.15);
  }
  .oklch__slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px; height: 18px; border-radius: 50%;
    background: #fff; border: 2px solid rgba(0, 0, 0, 0.25);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    cursor: pointer;
  }
  .oklch__slider::-moz-range-thumb {
    width: 18px; height: 18px; border-radius: 50%;
    background: #fff; border: 2px solid rgba(0, 0, 0, 0.25);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    cursor: pointer;
  }
  .oklch__num {
    font-family: var(--cfg-mono);
    font-size: 11px;
    background: var(--cfg-bg);
    border: 1px solid var(--cfg-border);
    border-radius: var(--cfg-radius-s);
    color: var(--cfg-text);
    padding: 3px 5px;
    width: 100%;
    text-align: right;
  }
  .oklch__num:focus { outline: 2px solid var(--cfg-accent); outline-offset: -1px; }

  .oklch__hex {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  }
  .oklch__hex-label {
    font-family: var(--cfg-mono);
    font-size: 11px;
    color: var(--cfg-text-faint);
    width: 36px;
  }
  .oklch__hex-input {
    flex: 1;
    font-family: var(--cfg-mono);
    font-size: 12px;
    background: var(--cfg-bg);
    border: 1px solid var(--cfg-border);
    border-radius: var(--cfg-radius-s);
    color: var(--cfg-text);
    padding: 5px 8px;
    text-transform: uppercase;
  }
  .oklch__hex-input:focus { outline: 2px solid var(--cfg-accent); outline-offset: -1px; border-color: var(--cfg-accent); }

  .oklch__out {
    font-family: var(--cfg-mono);
    font-size: 11px;
    color: var(--cfg-text-faint);
    word-break: break-all;
    padding: 6px 8px;
    background: var(--cfg-bg);
    border-radius: var(--cfg-radius-s);
    border: 1px solid var(--cfg-border);
    line-height: 1.4;
  }
</style>
