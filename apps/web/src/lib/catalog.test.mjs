import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapPublishedRow } from './catalog.ts';

test('maps approved listing and rules without profile data', () => {
  const row = { id: 'listing', title: 'Refund', summary: 'Test', category: 'refund', claim_url: 'https://example.gov/claim', deadline: '2099-01-01', payout_description: '$20', proof_required: ['Receipt'], sources: { name: 'Official' }, eligibility_rules: [{ rule_type: 'state', rule_value: { states: ['CO'] }, reviewer_approved: true }] };
  const item = mapPublishedRow(row);
  assert.equal(item.provider, 'Official');
  assert.deepEqual(item.rules, { states: ['CO'] });
  assert.equal(item.url, 'https://example.gov/claim');
  assert.equal('profile' in item, false);
});
