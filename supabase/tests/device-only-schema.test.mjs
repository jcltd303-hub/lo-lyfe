import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const migration = readFileSync(new URL('../migrations/20260928071003_foundation_device_only_profile.sql', import.meta.url), 'utf8');

test('foundation stores no user profile answers', () => {
  assert.doesNotMatch(migration, /create table public\.profile_values\b/i);
  assert.doesNotMatch(migration, /plain_value|encrypted_value|encryption_version/i);
});

test('saves have owner-scoped read, insert, and delete policies', () => {
  assert.match(migration, /create table public\.saved_opportunities\s*\(/i);
  assert.match(migration, /create policy own_saved_read[\s\S]*?for select to authenticated using \(user_id = \(select auth\.uid\(\)\)\)/i);
  assert.match(migration, /create policy own_saved_insert[\s\S]*?for insert to authenticated\s+with check \(user_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /create policy own_saved_delete[\s\S]*?for delete to authenticated using \(user_id = \(select auth\.uid\(\)\)\)/i);
});

test('signup creates a minimal user row without a profile answer', () => {
  assert.match(migration, /create trigger on_auth_user_created[\s\S]*?after insert on auth\.users/i);
  assert.match(migration, /insert into public\.users\s*\(id\)\s*values\s*\(new\.id\)/i);
});
