/**
 * Manual, local-only dev/QA tool — NOT part of `npm test` or CI (needs a
 * Playwright browser, which this repo doesn't depend on).
 *
 * Answers the question "which configurator controls actually change anything on
 * the page?" mechanically, instead of by clicking through the UI and squinting.
 *
 * For every case below it:
 *   1. asks the real PHP emitter what CSS a site would serve for that override
 *      map (tests/php-harness/emit-override-css.php — same validation, derived
 *      token expansion and @layer/unlayered wrapper as production), then
 *   2. loads a probe page with a bundle from SLASHED-for-WP/dist/ plus that CSS
 *      and diffs every live --sf-* token (and a handful of computed properties
 *      on a real element) against the same page without the override.
 *
 * A case that changes nothing is reported DEAD: either the control writes a
 * token the framework no longer reads, or the emitted CSS can't win the cascade.
 * The whole matrix is run against both the layered and the flat bundle, because
 * a wrapper/bundle mismatch takes out every control at once — that is how the
 * flat-mode regression (layered overrides are inert against a flat bundle) was
 * found, and re-running this is how you'd catch it coming back.
 *
 * Prerequisites (not automated by this script):
 *   1. `playwright` installed with a Chromium available — it is not an npm
 *      dependency of this repo:
 *        npm install --no-save playwright && npx playwright install chromium
 *   2. `php` on PATH.
 *   3. SLASHED-for-WP/dist/ populated (it is committed; `npm run sync-dist`
 *      refreshes it).
 *
 * Run: node tests/override-effect-probe.mjs
 * Exit code is 1 when any case is DEAD, so it can be used as an ad-hoc gate.
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    'playwright not found. This is a manual dev tool (not an npm dependency of\n' +
    'this repo) — install it yourself first, e.g.:\n' +
    '  npm install --no-save playwright && npx playwright install chromium'
  );
  process.exit(1);
}

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'SLASHED-for-WP', 'dist');
const HARNESS = path.join(import.meta.dirname, 'php-harness', 'emit-override-css.php');

// Self-check: a token the framework does not read must come out DEAD. If this
// one ever reports OK the measurement below has gone noisy and every other
// verdict in the run is worthless.
const CONTROL_CASE = 'control: unknown token (must be DEAD)';

// One case per configurator control group that has a distinct route to the
// page. Values are deliberately far from the defaults so any real effect shows
// up as a computed-value change.
const CASES = {
  [CONTROL_CASE]: { '--sf-definitely-not-a-framework-token': '99px' },
  'spacing: modular scale (ratio)': { '--sf-space-ratio-min': '1.618', '--sf-space-ratio-max': '1.618' },
  'spacing: modular scale (base)': { '--sf-space-base-min': '1.5', '--sf-space-base-max': '3' },
  'spacing: space scale knob': { '--sf-space-scale': '2' },
  'spacing: gap / gutter': { '--sf-gap': '3rem', '--sf-gutter': '4rem' },
  'spacing: section scale': { '--sf-section-scale': '2' },
  'typography: modular scale (ratio)': { '--sf-text-ratio-min': '1.5', '--sf-text-ratio-max': '1.5' },
  'typography: modular scale (base)': { '--sf-text-base-min': '1.4', '--sf-text-base-max': '1.8' },
  'typography: text scale knob': { '--sf-text-scale': '1.5' },
  'typography: display scale': { '--sf-text-display-base-min': '3.5', '--sf-text-display-base-max': '5' },
  'typography: body font': { '--sf-font-body': 'Georgia, serif' },
  'fluid: viewport endpoints': { '--sf-fluid-min-vw': '30', '--sf-fluid-max-vw': '70' },
  'colors: brand source': { '--sf-color-primary-source-light': 'oklch(0.7 0.2 30)' },
  'contrast: bias': { '--sf-contrast-bias': '0.3' },
  'borders: radius scale': { '--sf-radius-scale': '3' },
  'borders: width scale': { '--sf-border-scale': '3' },
  'shadows: strength': { '--sf-shadow-strength': '2' },
  'motion: scale': { '--sf-motion-scale': '3' },
  'components: density': { '--sf-density': '0.5' },
};

const TOKENS = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'SLASHED-for-WP', 'data', 'inventory.json'), 'utf8'),
).variables;

const PROBE_PROPS = [
  'paddingTop', 'marginTop', 'gap', 'fontSize', 'fontFamily', 'lineHeight',
  'borderRadius', 'borderTopWidth', 'transitionDuration', 'boxShadow',
  'color', 'backgroundColor', 'minHeight',
];

function emit(cases, { flat }) {
  const args = [HARNESS, ...(flat ? ['--flat'] : [])];
  return JSON.parse(execFileSync('php', args, { input: JSON.stringify(cases), encoding: 'utf8' }));
}

const server = http
  .createServer((req, res) => {
    const file = path.join(DIST, path.basename(req.url.split('?')[0]));
    try {
      res.writeHead(200, { 'Content-Type': 'text/css' });
      res.end(fs.readFileSync(file));
    } catch {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(0);
const { port } = server.address();

const browser = await chromium.launch();
let failures = 0;

async function measure(page, bundle, overrideCSS) {
  await page.setContent(
    `<link rel="stylesheet" href="http://127.0.0.1:${port}/${bundle}">` +
      (overrideCSS ? `<style>${overrideCSS}</style>` : '') +
      '<div class="sf-stack"><button id="probe" class="sf-btn">probe</button></div>',
  );
  await page.waitForLoadState('load');
  return page.evaluate(
    ({ tokens, props }) => {
      const rootStyle = getComputedStyle(document.documentElement);
      const out = {};
      for (const token of tokens) out[token] = rootStyle.getPropertyValue(token).trim();
      const probeStyle = getComputedStyle(document.getElementById('probe'));
      for (const prop of props) out[`@probe.${prop}`] = probeStyle[prop];
      return out;
    },
    { tokens: TOKENS, props: PROBE_PROPS },
  );
}

for (const flat of [false, true]) {
  const bundle = `slashed.optimal${flat ? '.flat' : ''}.min.css`;
  if (!fs.existsSync(path.join(DIST, bundle))) {
    console.error(`missing bundle: SLASHED-for-WP/dist/${bundle} — run \`npm run sync-dist\``);
    process.exit(1);
  }

  const css = emit(CASES, { flat });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  // The framework's transitions would otherwise still be interpolating when the
  // probe element is measured (the stylesheet lands after first paint), making
  // colour/size readings differ run to run. Reduced motion collapses them.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Throwaway pass: the very first load fetches the bundle cold, which lands
  // after first paint and skews the probe element's computed values. Every
  // later pass reads it from cache, so take the baseline from a warm page.
  await measure(page, bundle, null);
  const baseline = await measure(page, bundle, null);

  console.log(`\n===== ${bundle}${flat ? '  (flat mode: css_flat = true)' : ''}`);
  for (const [label, overrideCSS] of Object.entries(css)) {
    const now = await measure(page, bundle, overrideCSS);
    const changed = Object.keys(baseline).filter((k) => baseline[k] !== now[k]);
    const probes = changed.filter((k) => k.startsWith('@probe.'));
    // The verdict is the live-token diff: it is exact. The computed properties
    // are reported as a hint about what a user would actually see move.
    const tokenCount = changed.length - probes.length;
    const isControl = label === CONTROL_CASE;
    const ok = isControl ? tokenCount === 0 : tokenCount > 0;
    if (!ok) failures += 1;
    console.log(
      `${tokenCount === 0 ? 'DEAD' : 'OK  '}${ok ? ' ' : '!'}${label.padEnd(38)}` +
        ` tokens=${String(tokenCount).padStart(3)}` +
        `  probe=${probes.map((p) => p.slice(7)).join(',') || '-'}`,
    );
  }
  await page.close();
}

server.close();
await browser.close();

if (failures > 0) {
  console.error(
    `\n${failures} case(s) marked "!" did not behave as expected — a DEAD control` +
      ' group means those configurator controls change nothing on the page.',
  );
  process.exit(1);
}
console.log('\nEvery control group reached the page in both bundle modes.');
