import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeReturnPath } from './auth-path.ts';

test('accepts only local relative account paths', () => {
  assert.equal(safeReturnPath('/account'), '/account');
  assert.equal(safeReturnPath('//evil.example'), '/account');
  assert.equal(safeReturnPath('https://evil.example'), '/account');
  assert.equal(safeReturnPath('/\\evil.example'), '/account');
});
