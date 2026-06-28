/**
 * PHP→JS version-pill contract (static source scan, no WP runtime needed).
 *
 * 1. class-token-page.php must emit `window.__SLASHED_FW_VERSION__` sourced
 *    from get_loaded_framework_version() — the framework-tracked version —
 *    not from the plugin's own version constant (SLASHED_VERSION).
 *
 * 2. The vendored StudioHeader.svelte and codec.ts must still read
 *    `__SLASHED_VERSION__`. Any upstream rename of this global would silently
 *    blank the version pill in the embedded plugin UI, since admin-app's
 *    vite.config.js maps __SLASHED_VERSION__ → window.__SLASHED_FW_VERSION__.
 *
 * 3. admin-app/vite.config.js must contain both ends of that mapping.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PLUGIN = path.join(ROOT, 'SLASHED-for-WP');
const ADMIN_SRC = path.join(PLUGIN, 'admin-app', 'src');

function read(relToRoot) {
  return fs.readFileSync(path.join(ROOT, relToRoot), 'utf8');
}

describe('PHP → JS version-pill contract', () => {
  test('class-token-page.php emits window.__SLASHED_FW_VERSION__', () => {
    const php = read('SLASHED-for-WP/includes/class-token-page.php');
    assert.ok(
      php.includes('window.__SLASHED_FW_VERSION__'),
      'class-token-page.php must emit the window.__SLASHED_FW_VERSION__ global'
    );
  });

  test('class-token-page.php sources the version from get_loaded_framework_version()', () => {
    const php = read('SLASHED-for-WP/includes/class-token-page.php');
    assert.ok(
      php.includes('get_loaded_framework_version()'),
      'class-token-page.php must call get_loaded_framework_version() to populate __SLASHED_FW_VERSION__'
    );
  });

  test('__SLASHED_FW_VERSION__ assignment does not use the plugin version constant', () => {
    const php = read('SLASHED-for-WP/includes/class-token-page.php');
    // Isolate the inline-script block that sets the FW version global.
    const assignBlock = php.match(/__SLASHED_FW_VERSION__[^;]+;/);
    if (assignBlock) {
      assert.ok(
        !assignBlock[0].includes('SLASHED_VERSION'),
        'The __SLASHED_FW_VERSION__ assignment must not read from SLASHED_VERSION (the plugin version)'
      );
    }
  });

  test('vendored StudioHeader.svelte reads __SLASHED_VERSION__', () => {
    const src = fs.readFileSync(
      path.join(ADMIN_SRC, 'components', 'shell', 'StudioHeader.svelte'),
      'utf8'
    );
    assert.ok(
      src.includes('__SLASHED_VERSION__'),
      'StudioHeader.svelte must read __SLASHED_VERSION__ — upstream may have renamed the global'
    );
  });

  test('vendored codec.ts reads __SLASHED_VERSION__', () => {
    const src = fs.readFileSync(path.join(ADMIN_SRC, 'lib', 'codec.ts'), 'utf8');
    assert.ok(
      src.includes('__SLASHED_VERSION__'),
      'codec.ts must read __SLASHED_VERSION__ — upstream may have renamed the global'
    );
  });

  test('admin-app vite.config.js maps __SLASHED_VERSION__ → window.__SLASHED_FW_VERSION__', () => {
    const vite = read('SLASHED-for-WP/admin-app/vite.config.js');
    assert.ok(
      vite.includes('__SLASHED_VERSION__') && vite.includes('window.__SLASHED_FW_VERSION__'),
      'admin-app vite.config.js must remap __SLASHED_VERSION__ to window.__SLASHED_FW_VERSION__'
    );
  });
});
