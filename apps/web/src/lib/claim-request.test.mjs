import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSubmitRequest } from './claim-request.ts';

test('submission requires explicit attestation and excludes form answers', () => {
  const claimId = '66666666-6666-4666-8666-666666666666';
  assert.deepEqual(parseSubmitRequest({ claimId, attested: true }), { claimId, attested: true });
  assert.throws(() => parseSubmitRequest({ claimId, attested: false }), /Invalid/);
  assert.throws(() => parseSubmitRequest({ claimId, attested: true, zip: '80203' }), /Invalid/);
});
