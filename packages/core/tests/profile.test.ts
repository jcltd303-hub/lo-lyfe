import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missingProfileFields, type FieldDefinition } from '../src/profile.ts';

const fields: FieldDefinition[] = [
  { key: 'zip', sensitivity: 'standard' },
  { key: 'birth_year', sensitivity: 'sensitive' },
  { key: 'proof_of_purchase', sensitivity: 'ask_each_time' },
];

test('only missing answers and each-time proof are requested', () => {
  assert.deepEqual(missingProfileFields(['zip', 'birth_year', 'proof_of_purchase'], { zip: '80203', birth_year: 1990, proof_of_purchase: true }, fields), ['proof_of_purchase']);
});
test('blank answers still count as missing', () => {
  assert.deepEqual(missingProfileFields(['zip', 'birth_year'], { zip: '   ', birth_year: null }, fields), ['zip', 'birth_year']);
});
test('unknown and prohibited keys are rejected', () => {
  assert.throws(() => missingProfileFields(['ssn'], {}, fields), /prohibited/i);
  assert.throws(() => missingProfileFields(['unknown'], {}, fields), /unknown/i);
});
