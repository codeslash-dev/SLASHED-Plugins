/**
 * Drift guard: the shared logic modules in the admin app must stay byte-for-byte
 * identical to the framework configurator's copies. When the framework checkout
 * isn't present (e.g. plugin-only CI), the comparison is skipped — the mirrored
 * unit suites (shared-color/scale/fonts) still pin the behaviour either way.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pluginLib = resolve(here, '../SLASHED-for-WP/integrations/bricks/admin-app/src/lib');
// The framework is normally checked out as a sibling of the plugin repo.
const frameworkLib = resolve(here, '../../SLASHED/configurator/src/lib');

const MODULES = ['color.js', 'scale.js', 'fonts.js'];

describe('shared module parity with the framework configurator', () => {
  const haveFramework = existsSync(frameworkLib);
  const havePlugin = existsSync(pluginLib);

  for (const mod of MODULES) {
    test(
      `${mod} is byte-identical to the configurator`,
      {
        skip: !haveFramework
          ? 'framework checkout not present'
          : !havePlugin
            ? 'plugin lib path not present'
            : false,
      },
      () => {
        const a = readFileSync(resolve(pluginLib, mod), 'utf8');
        const b = readFileSync(resolve(frameworkLib, mod), 'utf8');
        assert.equal(a, b, `${mod} drifted from SLASHED/configurator — re-sync the parity module`);
      }
    );
  }
});
