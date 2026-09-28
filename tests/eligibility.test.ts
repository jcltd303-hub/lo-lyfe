import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateEligibility, filterOpportunities } from '../src/lib/eligibility.ts';
import type { Opportunity } from '../src/lib/opportunities.ts';

const item: Opportunity = {
  id: 'a', title: 'Example', category: 'refund', summary: 'Example',
  provider: 'Example', location: 'Colorado', url: 'https://example.org/',
  amount: 'Varies', deadline: '2026-12-01', requirements: ['Colorado resident'],
  rules: { states: ['CO'], minAge: 18 },
};

test('unknown profile data remains unverified', () => {
  assert.equal(evaluateEligibility(item, {}), 'unknown');
});
test('known mismatch excludes an opportunity', () => {
  assert.equal(evaluateEligibility(item, { state: 'CA', age: 30 }), 'ineligible');
});
test('matching facts indicate a possible match, never a guarantee', () => {
  assert.equal(evaluateEligibility(item, { state: 'CO', age: 30 }), 'possible');
});
test('a sample without structured rules cannot claim a potential match', () => {
  assert.equal(evaluateEligibility({ ...item, rules: {} }, { state: 'CO', age: 30 }), 'unknown');
});
test('a non-finite age does not establish a potential match', () => {
  assert.equal(evaluateEligibility(item, { state: 'CO', age: Number.NaN }), 'unknown');
});
test('search, category and state filters work together', () => {
  assert.deepEqual(filterOpportunities([item], { query: 'example', category: 'refund', state: 'CO' }).map(x => x.id), ['a']);
  assert.deepEqual(filterOpportunities([item], { query: 'missing', category: 'all', state: '' }), []);
  assert.deepEqual(filterOpportunities([item], { query: '', category: 'all', state: 'CA' }), []);
});
test('expired opportunities are not shown', () => {
  assert.deepEqual(filterOpportunities([item], { query: '', category: 'all', state: '' }, new Date('2027-01-01')), []);
});
