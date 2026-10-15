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

// Widened category vocabulary (matches the catalog's own conventions).
test('rebate and reimbursement classify as refund', () => {
  assert.equal(extractCandidateFromFeedItem({ title: 'Energy rebate', link: 'https://agency.gov/rebate', description: 'Get a rebate on qualifying purchases. Deadline: December 31, 2026.' })?.category, 'refund');
  assert.equal(extractCandidateFromFeedItem({ title: 'Medical reimbursement', link: 'https://agency.gov/reimburse', description: 'Request reimbursement for covered costs. Deadline: December 31, 2026.' })?.category, 'refund');
});
test('unclaimed money classifies as refund, like the seed catalog', () => {
  assert.equal(extractCandidateFromFeedItem({ title: 'Unclaimed property', link: 'https://agency.gov/unclaimed', description: 'Search for your unclaimed money. No deadline.' })?.category ?? null, null); // no deadline → still null
  assert.equal(extractCandidateFromFeedItem({ title: 'Unclaimed property', link: 'https://agency.gov/unclaimed', description: 'Search for your unclaimed money. Claim by December 31, 2026.' })?.category, 'refund');
});
test('compensation fund classifies as settlement; bare executive compensation does not', () => {
  assert.equal(extractCandidateFromFeedItem({ title: 'Victim compensation fund', link: 'https://agency.gov/fund', description: 'The compensation fund pays eligible victims. Deadline: December 31, 2026.' })?.category, 'settlement');
  assert.equal(extractCandidateFromFeedItem({ title: 'CEO compensation report', link: 'https://agency.gov/report', description: 'Annual report on executive compensation. Published December 31, 2026.' }), null);
});
test('assistance program classifies as grant; boilerplate assistance does not', () => {
  assert.equal(extractCandidateFromFeedItem({ title: 'Energy assistance program', link: 'https://agency.gov/energy', description: 'Apply to the energy assistance program. Deadline: December 31, 2026.' })?.category, 'grant');
  assert.equal(extractCandidateFromFeedItem({ title: 'Public hearing', link: 'https://agency.gov/hearing', description: 'For assistance, contact the clerk. Hearing January 15, 2027.' }), null);
});
test('voucher classifies as coupon', () => {
  assert.equal(extractCandidateFromFeedItem({ title: 'Food voucher', link: 'https://agency.gov/voucher', description: 'Redeem your voucher. Expires December 31, 2026. Deadline: December 31, 2026.' })?.category, 'coupon');
});
test('category may come from the article head when the snippet lacks one', () => {
  const out = extractCandidateWithDeadline(
    { title: 'City program update', link: 'https://agency.gov/program', description: 'The city announced a new program for residents.' },
    '2026-12-31',
    'City program update The city announced a new program for residents. Energy assistance program applications open now.',
  );
  assert.equal(out?.category, 'grant');
});
