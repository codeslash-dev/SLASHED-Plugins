/**
 * Browser console snippet — NOT a node script. Paste the whole file into
 * DevTools on a live page (front end, or the Bricks canvas iframe) to find out
 * why a configurator control "does nothing" on that specific site.
 *
 * It reports, for the spacing modular scale (edit WATCH for other domains):
 *   1. every stylesheet on the page, flagging SLASHED bundles and flat builds
 *   2. every CSS rule that declares one of the watched tokens, with the cascade
 *      layer it sits in — an unlayered declaration beats every layered one, so
 *      this is what identifies a shadowing rule
 *   3. the computed value of each source knob and derived output at :root
 *   4. a verdict tying those together
 *
 * The telltale failure is a source knob that shows YOUR value while the derived
 * --sf-space-* outputs sit at their defaults: something on the page declares
 * the concrete output tokens and shadows the generative clamp()s the knob feeds.
 *
 * See docs/troubleshooting-token-overrides.md for how to read the output.
 */
(() => {
  const SOURCES = [
    '--sf-space-ratio-min', '--sf-space-ratio-max',
    '--sf-space-base-min', '--sf-space-base-max',
    '--sf-space-scale', '--sf-fluid-min-vw', '--sf-fluid-max-vw',
  ];
  const OUTPUTS = ['--sf-space-2xs', '--sf-space-s', '--sf-space-m', '--sf-space-l', '--sf-space-4xl'];
  const WATCH = [...SOURCES, ...OUTPUTS];

  const rootStyle = getComputedStyle(document.documentElement);
  console.group('%cSLASHED token diagnostic', 'font-weight:bold');

  console.group('1. Stylesheets on this page');
  const sheets = [];
  for (const sheet of document.styleSheets) {
    const href = sheet.href || '(inline <style>)';
    let rules = null;
    let readable = true;
    try {
      rules = sheet.cssRules;
    } catch {
      readable = false;
    }
    sheets.push({ sheet, href, readable });
    const flags = [];
    if (/slashed/i.test(href)) flags.push('SLASHED bundle');
    if (/\.flat\./i.test(href)) flags.push('FLAT (no @layer)');
    if (!readable) flags.push('cross-origin — cannot inspect');
    console.log(`${href}${flags.length ? '   [' + flags.join(', ') + ']' : ''}`);
  }
  console.groupEnd();

  console.group('2. Who declares these tokens (in cascade order)');
  const found = [];
  const walk = (rules, layer, sheetLabel) => {
    for (const rule of rules) {
      // Note: a plain CSSStyleRule also exposes .cssRules (CSS nesting), so the
      // declaration check must come first and recursion must not be an else-branch.
      if (rule.style) {
        for (const token of WATCH) {
          const value = rule.style.getPropertyValue(token);
          if (!value) continue;
          found.push({
            token,
            value: value.trim().slice(0, 60),
            important: rule.style.getPropertyPriority(token) === 'important',
            layer: layer || '(unlayered — beats every layer)',
            selector: rule.selectorText,
            sheet: sheetLabel,
          });
        }
      }
      if (rule.cssRules && rule.cssRules.length) {
        const isLayer = typeof rule.name === 'string' && /Layer/.test(rule.constructor.name);
        walk(
          rule.cssRules,
          isLayer ? [layer, rule.name || '(anonymous)'].filter(Boolean).join(' > ') : layer,
          sheetLabel,
        );
      }
    }
  };
  for (const { sheet, href, readable } of sheets) {
    if (!readable) continue;
    walk(sheet.cssRules, '', href.replace(/^.*\//, '') || href);
  }
  if (found.length) console.table(found);
  else console.warn('No rule on this page declares any of the watched tokens.');
  console.groupEnd();

  console.group('3. Computed values at :root');
  console.table(
    WATCH.map((token) => ({
      token,
      computed: rootStyle.getPropertyValue(token).trim() || '(empty)',
      kind: SOURCES.includes(token) ? 'source knob' : 'derived output',
    })),
  );
  console.groupEnd();

  console.group('4. Is the ladder actually generated from the knobs?');
  // The framework builds every --sf-space-* step from the knobs above:
  //   step n = lerp(base_min * ratio_min^n, base_max * ratio_max^n, t) * scale
  // where t is where the current viewport sits in the fluid range. t and the rem
  // size are unknown here, but they cancel when each step is measured RELATIVE to
  // step m (n=0) — so the shape of the ladder alone says whether the knobs
  // produced it. A ladder that fits no t is being declared by something else,
  // which is the signature of a knob that reads back correctly yet does nothing.
  const px = (token) => parseFloat(rootStyle.getPropertyValue(token));
  const STEPS = [['--sf-space-2xs', -3], ['--sf-space-xs', -2], ['--sf-space-s', -1],
    ['--sf-space-m', 0], ['--sf-space-l', 1], ['--sf-space-xl', 2],
    ['--sf-space-2xl', 3], ['--sf-space-3xl', 4], ['--sf-space-4xl', 5]];
  const knob = (token, fallback) => {
    const v = parseFloat(rootStyle.getPropertyValue(token));
    return Number.isFinite(v) ? v : fallback;
  };
  const aMin = knob('--sf-space-ratio-min', 1.25);
  const aMax = knob('--sf-space-ratio-max', 1.333);
  const bMin = knob('--sf-space-base-min', 1);
  const bMax = knob('--sf-space-base-max', 2);
  const measured = STEPS.map(([t, n]) => [n, px(t)]).filter(([, v]) => Number.isFinite(v) && v > 0);
  const base = measured.find(([n]) => n === 0);
  if (!base || measured.length < 4) {
    console.warn('Not enough --sf-space-* steps resolved to check the ladder.');
  } else {
    const model = (n, t) => {
      const lo = bMin * aMin ** n;
      const hi = bMax * aMax ** n;
      // The framework wraps the interpolation in clamp(lo, …, hi). When the
      // knobs make lo exceed hi (a mobile ratio steeper than the desktop one,
      // which the panel allows), CSS clamp() returns its first argument — so
      // the step pins to lo instead of interpolating. Model that, or a
      // perfectly healthy page reads as a mismatch at the top of the ladder.
      if (lo >= hi) return lo;
      return lo + t * (hi - lo);
    };
    let best = { t: 0, worst: Infinity };
    for (let t = 0; t <= 1.0001; t += 0.0005) {
      let worst = 0;
      for (const [n, value] of measured) {
        const predicted = model(n, t) / model(0, t);
        worst = Math.max(worst, Math.abs(predicted - value / base[1]) / (value / base[1]));
      }
      if (worst < best.worst) best = { t, worst };
    }
    const pct = (best.worst * 100).toFixed(1);
    if (best.worst > 0.02) {
      console.warn(
        `The ladder does NOT match the knobs (best fit is still ${pct}% off).\n` +
          'The concrete --sf-space-* tokens on this page are declared by something\n' +
          'other than the framework\'s generative CSS, so the base/ratio knobs feed a\n' +
          'formula whose result is being thrown away — they read back correctly at\n' +
          ':root and change nothing. Section 2 lists every rule that declares them:\n' +
          'find the one outside @layer slashed.tokens and remove that source.',
      );
    } else {
      console.log(`Ladder matches the knobs (within ${pct}%) — the scale IS generated from them.`);
    }
  }
  console.groupEnd();

  console.group('5. Verdict');
  const unlayeredOutputs = found.filter(
    (f) => OUTPUTS.includes(f.token) && f.layer.startsWith('(unlayered'),
  );
  const overrideRules = found.filter((f) => /overrides/.test(f.layer));
  if (!overrideRules.length) {
    console.warn(
      'No declaration in @layer slashed.overrides (or unlayered override block) was found.\n' +
        'The saved tokens are not reaching this page at all — check that the page is not\n' +
        'served from a cache predating the save, and view-source for a\n' +
        '<style id="slashed-framework-inline-css"> block.',
    );
  }
  if (unlayeredOutputs.length) {
    console.warn(
      'Concrete --sf-space-* output tokens are declared UNLAYERED on this page.\n' +
        'Unlayered wins over every @layer, so these shadow the modular-scale knobs\n' +
        'no matter what the configurator saves. Offending rules:',
    );
    console.table(unlayeredOutputs);
  }
  if (overrideRules.length && !unlayeredOutputs.length) {
    console.log(
      'Overrides are present and nothing unlayered is shadowing the output tokens.\n' +
        'Compare section 3: if a source knob shows your value but the derived outputs\n' +
        'did not move, the framework CSS on this page is not the generative build.\n' +
        'If both moved, the tokens ARE live and the element you are looking at does not\n' +
        'use them (e.g. builder-set padding in px).',
    );
  }
  console.groupEnd();
  console.groupEnd();
})();
