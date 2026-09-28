import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDeviceVault, VaultCorruptError } from './device-vault.ts';

function memoryStore() {
  const records = new Map();
  return {
    records,
    async get(key) { return records.get(key); },
    async set(key, value) { records.set(key, value); },
    async delete(key) { records.delete(key); },
  };
}

test('encrypts locally and separates users', async () => {
  const store = memoryStore();
  const vault = createDeviceVault(store);
  await vault.writeProfile('user-a', { zip: '80203', birth_year: 1990 });
  assert.deepEqual(await vault.readProfile('user-a'), { zip: '80203', birth_year: 1990 });
  assert.equal(await vault.readProfile('user-b'), null);
  const raw = store.records.get('profile:user-a');
  assert.equal(raw.version, 1);
  assert.ok(raw.key instanceof CryptoKey);
  assert.equal(raw.key.extractable, false);
  assert.doesNotMatch(JSON.stringify(raw), /80203|1990/);
});

test('rejects prohibited and ask-each-time values', async () => {
  const vault = createDeviceVault(memoryStore());
  await assert.rejects(vault.writeProfile('user-a', { ssn: '123' }), /prohibited/i);
  await vault.writeProfile('user-a', { zip: '80203', receipt_number: 'secret' }, ['receipt_number']);
  assert.deepEqual(await vault.readProfile('user-a'), { zip: '80203' });
});

test('corrupt ciphertext is preserved until explicit deletion', async () => {
  const store = memoryStore();
  const vault = createDeviceVault(store);
  await vault.writeProfile('user-a', { zip: '80203' });
  const raw = store.records.get('profile:user-a');
  raw.ciphertext[0] ^= 255;
  await assert.rejects(vault.readProfile('user-a'), VaultCorruptError);
  assert.equal(store.records.get('profile:user-a'), raw);
  await vault.deleteProfile('user-a');
  assert.equal(await vault.readProfile('user-a'), null);
});
