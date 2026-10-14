import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCandidateFromFeedItem, extractCandidateWithDeadline, extractDeadlineFromText } from '../src/index.ts';

test('extracts a written US deadline', () => assert.equal(extractCandidateFromFeedItem({ title: 'Consumer refund program', link: 'https://agency.gov/refund', description: 'Eligible consumers can request a refund. Deadline: September 30, 2026.' })?.deadline, '2026-09-30'));
test('rejects content without an explicit deadline', () => assert.equal(extractCandidateFromFeedItem({ title: 'Grant program', link: 'https://agency.gov/grant', description: 'Applications are open.' }), null));
test('rejects non-https claim urls', () => assert.equal(extractCandidateFromFeedItem({ title: 'Refund', link: 'http://agency.gov/refund', description: 'Deadline 2026-09-30' }), null));

// Two-stage deadline fix: feed snippets rarely carry a claim deadline, so the
// worker fetches the article and takes a deadline-LABELED date from it.
test('extracts a numeric US deadline', () => assert.equal(
  extractCandidateFromFeedItem({ title: 'Data breach settlement', link: 'https://agency.gov/settlement', description: 'Settlement open to affected consumers. Claim Form Deadline 12/28/2026.' })?.deadline,
  '2026-12-28',
));
test('extracts an abbreviated-month deadline', () => assert.equal(
  extractCandidateFromFeedItem({ title: 'Data breach settlement', link: 'https://agency.gov/settlement', description: 'The deadline for exclusion and objection is Nov. 27, 2026.' })?.deadline,
  '2026-11-27',
));
test('claim-form deadline beats a later hearing date', () => assert.equal(
  extractDeadlineFromText('The final approval hearing is scheduled for Jan. 12, 2027. Claim Form Deadline 12/28/2026.'),
  '2026-12-28',
));
test('labeled-only mode never takes a bare publication date', () => assert.equal(
  extractDeadlineFromText('Published October 14, 2026. The settlement resolves claims from 2024.', { labeledOnly: true }),
  null,
));
test('labeled-only mode takes a labeled article deadline', () => assert.equal(
  extractDeadlineFromText('Published October 14, 2026. Claim Form Deadline 12/28/2026.', { labeledOnly: true }),
  '2026-12-28',
));
test('labeled-only mode takes a comment deadline from a federal notice', () => assert.equal(
  extractDeadlineFromText('DATES: Comments must be received on or before December 15, 2026.', { labeledOnly: true }),
  '2026-12-15',
));
test('rejects impossible calendar dates', () => assert.equal(
  extractDeadlineFromText('Deadline: February 30, 2027.'),
  null,
));
test('candidate with a supplied article deadline keeps the feed item fields', () => {
  const out = extractCandidateWithDeadline(
    { title: 'Data breach settlement', link: 'https://agency.gov/settlement', description: 'The settlement provides benefits to affected consumers.' },
    '2026-12-28',
  );
  assert.equal(out?.deadline, '2026-12-28');
  assert.equal(out?.category, 'settlement');
  assert.equal(out?.claimUrl, 'https://agency.gov/settlement');
});
