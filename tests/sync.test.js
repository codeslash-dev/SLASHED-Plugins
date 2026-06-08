import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runChecks } from '../scripts/verify-sync.js';

// The committed repo state must always pass verify-sync. This is the guard that
// would have caught the bundled CSS being stamped at an older framework version
// than the SLASHED_*_CSS_REF constants claimed.
test('plugin version metadata is internally consistent', () => {
  const { errors, info } = runChecks();
  assert.ok(info.length > 0, 'expected verify-sync to report checks it ran');
  assert.deepEqual(errors, [], `verify-sync found inconsistencies:\n - ${errors.join('\n - ')}`);
});
