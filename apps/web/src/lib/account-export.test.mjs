import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAccountExport } from './account-export.ts';

test('exports account records without a device profile', () => {
  const result = buildAccountExport('user-id', 'me@example.com', [{ opportunity_id: 'listing' }], [{ id: 'claim' }], []);
  assert.equal(result.userId, 'user-id');
  assert.equal(result.email, 'me@example.com');
  assert.equal('profile' in result, false);
  assert.deepEqual(result.saved, [{ opportunity_id: 'listing' }]);
});
