import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonicalizeClaimUrl, validateCandidate } from '../src/ingestion.ts';

const source = { id: 'official-1', allowedHosts: ['refunds.example.gov'] };
const candidate = {
  title: 'Example refund', summary: 'Apply through the official administrator.', category: 'refund' as const,
  claimUrl: 'https://refunds.example.gov/claim?utm_source=test&id=42#instructions',
  deadline: '2026-12-31', eligibilityText: 'Bought qualifying products in 2025.',
  proofRequired: ['receipt'],
};

test('an official complete listing becomes a review draft, not a published offer', () => {
  const result = validateCandidate(candidate, source, new Date('2026-09-28T12:00:00Z'));
  assert.equal(result.status, 'review');
  assert.equal(result.canonicalUrl, 'https://refunds.example.gov/claim?id=42');
});
test('missing deadline, missing URL and expired offers are rejected', () => {
  assert.throws(() => validateCandidate({ ...candidate, deadline: '' }, source), /deadline/i);
  assert.throws(() => validateCandidate({ ...candidate, claimUrl: '' }, source), /claim URL/i);
  assert.throws(() => validateCandidate({ ...candidate, deadline: '2020-01-01' }, source, new Date('2026-09-28')), /expired/i);
});
test('nonofficial or unsafe destinations cannot enter review', () => {
  for (const claimUrl of ['http://refunds.example.gov/claim', 'https://refunds.example.gov.evil.com/claim', 'https://user:pass@refunds.example.gov/claim', 'javascript:alert(1)']) {
    assert.throws(() => validateCandidate({ ...candidate, claimUrl }, source), /claim URL|source/i);
  }
});
test('canonicalization removes tracking but preserves claim parameters', () => {
  assert.equal(canonicalizeClaimUrl('https://refunds.example.gov/claim?id=42&gclid=abc&utm_campaign=x#top'), 'https://refunds.example.gov/claim?id=42');
});
