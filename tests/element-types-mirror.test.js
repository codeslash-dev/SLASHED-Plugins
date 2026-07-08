/**
 * ELEMENT_TYPE_LABEL_MAP (JS, editor-app) and Slashed_Bricks_Settings_Page::
 * BUILTIN_DEFAULTS (PHP) are two hand-maintained copies of the same element-
 * type → default-BEM-name table. The editor is the source of truth at
 * pre-fill time; the PHP copy only feeds the settings-page placeholders. The
 * PHP class carries a "KEEP IN SYNC" comment but nothing enforced it, so the
 * two could drift and show users different defaults than they actually get.
 *
 * This test parses the PHP const array and asserts it equals the JS map
 * exactly. If you change one, change the other.
 *
 * Run: node --test tests/element-types-mirror.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ELEMENT_TYPE_LABEL_MAP } from '../SLASHED-for-WP/integrations/bricks/editor-app/src/lib/element-types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHP_FILE = path.resolve(
  __dirname,
  '..',
  'SLASHED-for-WP/includes/class-bricks-settings-page.php',
);

/**
 * Extract the `const BUILTIN_DEFAULTS = array( ... );` block from the PHP file
 * and parse its `'key' => 'value'` pairs into a plain object.
 */
function parsePhpBuiltinDefaults(src) {
  const start = src.indexOf('const BUILTIN_DEFAULTS = array(');
  assert.notEqual(start, -1, 'BUILTIN_DEFAULTS array not found in PHP source');
  const body = src.slice(start);
  const end = body.indexOf(');');
  assert.notEqual(end, -1, 'end of BUILTIN_DEFAULTS array not found');
  const inner = body.slice(0, end);

  const pairRe = /'([^']+)'\s*=>\s*'([^']+)'/g;
  const map = {};
  let m;
  while ((m = pairRe.exec(inner)) !== null) {
    map[m[1]] = m[2];
  }
  return map;
}

test('PHP BUILTIN_DEFAULTS mirrors JS ELEMENT_TYPE_LABEL_MAP exactly', () => {
  const phpMap = parsePhpBuiltinDefaults(readFileSync(PHP_FILE, 'utf8'));
  const jsMap = { ...ELEMENT_TYPE_LABEL_MAP };

  assert.ok(Object.keys(phpMap).length > 0, 'parsed PHP map is unexpectedly empty');
  assert.deepEqual(
    phpMap,
    jsMap,
    'PHP BUILTIN_DEFAULTS has drifted from JS ELEMENT_TYPE_LABEL_MAP — ' +
      'update both (class-bricks-settings-page.php and element-types.js).',
  );
});
