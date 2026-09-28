import assert from 'node:assert/strict';
import test from 'node:test';
import { parseReviewAction, reviewPatch } from './review-action.ts';

test('review action is an explicit publish or reject decision', () => {
  assert.equal(parseReviewAction('publish'), 'publish');
  assert.equal(parseReviewAction('reject'), 'reject');
  assert.throws(() => parseReviewAction('approve'));
});

test('review decisions record review time', () => {
  const now = '2026-09-28T00:00:00.000Z';
  assert.deepEqual(reviewPatch('publish', now), { status: 'published', reviewed_at: now, updated_at: now });
  assert.deepEqual(reviewPatch('reject', now), { status: 'rejected', reviewed_at: now, updated_at: now });
});
