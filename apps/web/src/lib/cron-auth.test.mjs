import assert from 'node:assert/strict';
import test from 'node:test';
import { isAuthorizedCronRequest } from './cron-auth.ts';

test('cron auth requires exact bearer secret', () => {
  assert.equal(isAuthorizedCronRequest('Bearer scheduler-secret', 'scheduler-secret'), true);
  assert.equal(isAuthorizedCronRequest('Bearer wrong', 'scheduler-secret'), false);
  assert.equal(isAuthorizedCronRequest(null, 'scheduler-secret'), false);
  assert.equal(isAuthorizedCronRequest('scheduler-secret', 'scheduler-secret'), false);
  assert.equal(isAuthorizedCronRequest('Bearer scheduler-secret', ''), false);
});
