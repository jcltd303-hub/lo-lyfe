import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSaveRequest } from './save-request.ts';

const id = '44444444-4444-4444-8444-444444444444';
test('accepts only a listing ID without PII', () => {
  assert.deepEqual(parseSaveRequest({ opportunityId: id }), { opportunityId: id });
  assert.throws(() => parseSaveRequest({ opportunityId: id, zip: '80203' }), /Invalid/);
  assert.throws(() => parseSaveRequest({ opportunityId: 'sample-1' }), /Invalid/);
  assert.throws(() => parseSaveRequest(null), /Invalid/);
});
