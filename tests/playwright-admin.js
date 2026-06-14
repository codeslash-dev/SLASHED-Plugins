/**
 * Playwright manual test — SLASHED Admin SPA
 * Tests all available tabs, panels, and options and saves screenshots.
 *
 * Run: node tests/playwright-admin.js
 */

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:9999/test-admin.html';
const SHOTS_DIR = path.resolve(import.meta.dirname, '../test-screenshots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

let shotIdx = 0;
async function shot(page, label) {
  const name = `${String(++shotIdx).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  await page.screenshot({ path: path.join(SHOTS_DIR, name), fullPage: false });
  console.log(`  📸 ${name}`);
}

async function waitForApp(page) {
  // Wait for the Svelte SPA to mount (header + sidebar appear)
  await page.waitForSelector('.hdr', { timeout: 15000 });
  await page.waitForSelector('.sidebar', { timeout: 5000 });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page    = await ctx.newPage();

  // Capture console errors
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  console.log('\n=== SLASHED Admin SPA — Playwright Tests ===\n');

  // ── 1. Initial load ──────────────────────────────────────────────────────────
  console.log('1. Initial load');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await waitForApp(page);
  await shot(page, 'initial-load');

  // Verify header pills
  const headerText = await page.locator('.hdr__pills').textContent();
  console.log(`   Header pills: "${headerText.trim().replace(/\s+/g, ' ')}"`);
  const hasDoubleV = headerText.includes('vv');
  console.log(`   Double-v bug: ${hasDoubleV ? '❌ PRESENT' : '✅ absent'}`);
  const hasFramework = headerText.includes('framework');
  console.log(`   Framework pill: ${hasFramework ? '✅' : '❌ missing'}`);
  const hasPlugin = headerText.includes('plugin');
  console.log(`   Plugin version pill: ${hasPlugin ? '✅' : '❌ missing'}`);

  // Verify no theme toggle button
  const themeToggle = await page.locator('.hdr__theme-toggle').count();
  console.log(`   Theme toggle removed: ${themeToggle === 0 ? '✅' : '❌ still present'}`);

  // Verify Framework/Settings tabs gone from sidebar
  const sidebarText = await page.locator('.sidebar').textContent();
  const hasWpTabs = /Framework|Settings/.test(sidebarText);
  console.log(`   WP-specific sidebar tabs removed: ${hasWpTabs ? '❌ still present' : '✅'}`);

  // ── 2. Sidebar domains ──────────────────────────────────────────────────────
  console.log('\n2. Sidebar navigation');
  const sidebarItems = await page.locator('.sidebar__item').all();
  console.log(`   Sidebar items found: ${sidebarItems.length}`);
  await shot(page, 'sidebar-home');

  // Click through each sidebar domain
  for (const item of sidebarItems) {
    const label = (await item.textContent()).trim().replace(/\s+/g, ' ').slice(0, 30);
    await item.click();
    await page.waitForTimeout(300);
    const slug = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 20);
    await shot(page, `domain-${slug}`);
    console.log(`   ✅ ${label}`);
  }

  // ── 3. Basic / Advanced mode toggle ─────────────────────────────────────────
  console.log('\n3. Mode toggle (Basic → Advanced)');
  const advBtn = page.locator('.cfg-seg__btn', { hasText: 'Advanced' });
  await advBtn.click();
  await page.waitForTimeout(400);
  await shot(page, 'mode-advanced');
  console.log('   ✅ Advanced mode');

  const basicBtn = page.locator('.cfg-seg__btn', { hasText: 'Basic' });
  await basicBtn.click();
  await page.waitForTimeout(300);
  console.log('   ✅ Basic mode');

  // ── 4. Search ────────────────────────────────────────────────────────────────
  console.log('\n4. Search');
  const searchInput = page.locator('#cfg-search');
  await searchInput.fill('brand');
  await page.waitForTimeout(500);
  await shot(page, 'search-brand');
  const tokenRows = await page.locator('.token-row, [class*="token"]').count();
  console.log(`   ✅ "brand" search — visible rows: ${tokenRows}`);
  await searchInput.fill('');
  await page.waitForTimeout(300);

  // ── 5. Edit a token ──────────────────────────────────────────────────────────
  console.log('\n5. Token editing');
  // Go back to home
  const homeItem = page.locator('.sidebar__item').first();
  await homeItem.click();
  await page.waitForTimeout(300);

  // Find first editable token row input
  const tokenInput = page.locator('input[class*="token"], .token-row input, [data-token] input').first();
  const inputCount = await page.locator('input[type="text"], input[type="color"]').count();
  console.log(`   Input fields found: ${inputCount}`);

  // Try clicking a token row to expand editor
  const firstTokenRow = page.locator('[class*="token-row"], .trow').first();
  if (await firstTokenRow.count() > 0) {
    await firstTokenRow.click();
    await page.waitForTimeout(400);
    await shot(page, 'token-editor-open');
    console.log('   ✅ Token editor opened');
  }

  // ── 6. Preview pane ──────────────────────────────────────────────────────────
  console.log('\n6. Preview pane');
  const previewPane = page.locator('.preview, [class*="preview"]').first();
  const previewVisible = await previewPane.isVisible().catch(() => false);
  console.log(`   Preview pane visible: ${previewVisible ? '✅' : '⚠ not visible'}`);
  await shot(page, 'preview-visible');

  // Viewport switcher
  const viewportBtns = await page.locator('[class*="viewport"], [title*="tablet" i], [title*="laptop" i], [title*="desktop" i]').all();
  console.log(`   Viewport buttons: ${viewportBtns.length}`);
  for (const btn of viewportBtns) {
    const t = (await btn.getAttribute('title') ?? await btn.textContent()).trim().slice(0, 20);
    await btn.click();
    await page.waitForTimeout(300);
    await shot(page, `viewport-${t.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`);
    console.log(`   ✅ viewport: ${t}`);
  }

  // Preview light/dark toggle
  const previewThemeBtn = page.locator('[class*="theme"][class*="toggle"], button[title*="dark" i], button[title*="light" i]').first();
  if (await previewThemeBtn.count() > 0) {
    await previewThemeBtn.click();
    await page.waitForTimeout(300);
    await shot(page, 'preview-dark-theme');
    console.log('   ✅ Preview dark theme toggled');
    await previewThemeBtn.click();
    await page.waitForTimeout(200);
  }

  // ── 7. WCAG panel ────────────────────────────────────────────────────────────
  console.log('\n7. WCAG panel');
  const wcagItem = page.locator('.sidebar__item', { hasText: /wcag|accessibility/i });
  if (await wcagItem.count() > 0) {
    await wcagItem.click();
    await page.waitForTimeout(800);
    await shot(page, 'wcag-panel');
    const wcagContent = await page.locator('.wcag').count();
    console.log(`   WCAG panel rendered: ${wcagContent > 0 ? '✅' : '❌'}`);
    if (wcagContent > 0) {
      // Check for actual contrast ratio display
      const ratioText = await page.locator('.wcag').textContent();
      const hasRatios = /\d+\.\d+/.test(ratioText);
      console.log(`   Contrast ratios calculated: ${hasRatios ? '✅' : '⚠ no ratio numbers found'}`);
      // Check for blank/broken swatches
      const swatches = await page.locator('[class*="swatch"], [class*="color-chip"]').count();
      console.log(`   Color swatches: ${swatches}`);
    } else {
      // Dump main HTML for debug
      const mainSnippet = (await page.locator('.main').innerHTML().catch(() => 'not found')).slice(0, 300);
      console.log(`   Main HTML: ${mainSnippet}`);
    }
  } else {
    console.log('   ⚠ No WCAG sidebar item found');
  }

  // ── 8. Output/Export drawer ───────────────────────────────────────────────────
  console.log('\n8. Output / Export drawer');
  const outputBtn = page.locator('button[title*="export" i], button[title*="output" i], [class*="output"]').first();
  if (await outputBtn.count() > 0) {
    await outputBtn.click();
    await page.waitForTimeout(400);
    await shot(page, 'output-drawer');
    console.log('   ✅ Output drawer opened');
    // Close it
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  } else {
    // Check for overrideCount pill in header (shows "N customised · Export CSS")
    const exportPill = page.locator('.hdr__pill--mod');
    if (await exportPill.count() > 0) {
      await exportPill.click();
      await page.waitForTimeout(400);
      await shot(page, 'output-drawer-via-pill');
      console.log('   ✅ Output drawer via pill');
    } else {
      console.log('   ⚠ No output trigger found (no overrides active)');
    }
  }

  // ── 9. Sidebar collapse ───────────────────────────────────────────────────────
  console.log('\n9. Sidebar toggle');
  const sidebarToggle = page.locator('.hdr__pane--side').first();
  if (await sidebarToggle.count() > 0) {
    await sidebarToggle.click();
    await page.waitForTimeout(300);
    await shot(page, 'sidebar-collapsed');
    console.log('   ✅ Sidebar collapsed');
    await sidebarToggle.click();
    await page.waitForTimeout(300);
    console.log('   ✅ Sidebar expanded');
  }

  // ── 10. Undo/Redo ─────────────────────────────────────────────────────────────
  console.log('\n10. Undo / Redo');
  const undoBtn = page.locator('button[title*="Undo" i]');
  const redoBtn = page.locator('button[title*="Redo" i]');
  const undoDisabled = await undoBtn.isDisabled().catch(() => true);
  const redoDisabled = await redoBtn.isDisabled().catch(() => true);
  console.log(`   Undo button: ${!undoDisabled ? 'enabled (has history)' : 'disabled (no history)'}`);
  console.log(`   Redo button: ${!redoDisabled ? 'enabled' : 'disabled'}`);

  // ── 11. Manual CSS mode notice ────────────────────────────────────────────────
  console.log('\n11. Manual CSS mode notice');
  // Inject manual_css_mode = true via JS to test the notice
  await page.evaluate(() => {
    window.slashedApp = { ...window.slashedApp, pluginSettings: { ...window.slashedApp.pluginSettings, manual_css_mode: true } };
  });
  await page.reload({ waitUntil: 'networkidle' });
  // Temporarily set manual css mode in the test page
  await page.evaluate(() => {
    if (window.slashedApp) window.slashedApp.pluginSettings.manual_css_mode = true;
  });
  await page.goto(BASE_URL + '?manual_css=1', { waitUntil: 'domcontentloaded' });
  // Actually test by injecting before mount
  await page.addInitScript(() => {
    if (window.slashedApp) window.slashedApp.pluginSettings = { ...(window.slashedApp.pluginSettings ?? {}), manual_css_mode: true };
  });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.hdr', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  await shot(page, 'manual-css-notice');
  const noticeVisible = await page.locator('[class*="manual"], [class*="notice"]').count();
  console.log(`   Manual CSS notice elements: ${noticeVisible}`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('\n=== Summary ===');
  console.log(`Screenshots saved to: ${SHOTS_DIR}`);
  const savedShots = fs.readdirSync(SHOTS_DIR).filter(f => f.endsWith('.png'));
  console.log(`Total screenshots: ${savedShots.length}`);

  if (errors.length > 0) {
    console.log(`\n⚠ Console errors (${errors.length}):`);
    errors.slice(0, 10).forEach(e => console.log(`  - ${e.slice(0, 120)}`));
  } else {
    console.log('\n✅ No console errors');
  }

  await browser.close();
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
