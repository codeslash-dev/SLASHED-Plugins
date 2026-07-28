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

  console.group('4. Verdict');
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
