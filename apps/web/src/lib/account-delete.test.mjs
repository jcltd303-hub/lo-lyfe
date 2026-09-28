import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertDeleteConfirmation } from './account-delete.ts';

test('deletion requires an exact confirmation without extra data', () => {
  assert.doesNotThrow(() => assertDeleteConfirmation({ confirm: 'DELETE MY ACCOUNT' }));
  assert.throws(() => assertDeleteConfirmation({ confirm: 'yes' }), /Invalid/);
  assert.throws(() => assertDeleteConfirmation({ confirm: 'DELETE MY ACCOUNT', zip: '80203' }), /Invalid/);
});
