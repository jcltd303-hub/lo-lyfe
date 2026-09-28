import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(new URL('../../../supabase/migrations/20260928071003_foundation_device_only_profile.sql', import.meta.url), 'utf8')
  // PGlite supplies gen_random_uuid(), but its embedded build does not include Supabase extensions.
  .replace(/^create extension if not exists (pgcrypto|vector).*;$/gm, '');

const userA = '11111111-1111-4111-8111-111111111111';
const userB = '22222222-2222-4222-8222-222222222222';

async function asRole<T extends Record<string, unknown>>(db: PGlite, role: 'anon' | 'authenticated', userId: string | null, statement: string) {
  await db.exec(`set role ${role}`);
  try {
    await db.query("select set_config('app.user_id', $1, false)", [userId ?? '']);
    return await db.query<T>(statement);
  } finally {
    await db.exec('reset role');
  }
}

test('migration isolates unpublished records and saved IDs by role', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('app.user_id', true), '')::uuid
      $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
    `);
    await db.exec(migration);
    await db.query('insert into auth.users(id) values ($1),($2)', [userA, userB]);
    const accountRows = await db.query('select id from public.users');
    assert.equal(accountRows.rows.length, 2);
    await db.query("insert into public.sources(id,name,source_type,base_url,active) values ('33333333-3333-4333-8333-333333333333','Official','government','https://example.gov',true)");
    await db.query("insert into public.opportunities(id,source_id,title,summary,category,claim_url,canonical_url,eligibility_text,deadline,status,reviewed_at) values ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333','Public','Summary','refund','https://example.gov/claim','https://example.gov/claim','US',current_date + 1,'published',now()),('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333','Draft','Summary','refund','https://example.gov/draft','https://example.gov/draft','US',current_date + 1,'draft',null)");

    const anon = await asRole<{ title: string }>(db, 'anon', null, 'select title from public.opportunities');
    assert.deepEqual(anon.rows.map(row => row.title), ['Public']);
    await assert.rejects(asRole(db, 'anon', null, 'select * from public.saved_opportunities'), /permission denied/i);
    await asRole(db, 'authenticated', userA, "insert into public.saved_opportunities(user_id,opportunity_id) values ('11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444')");
    const own = await asRole<{ opportunity_id: string }>(db, 'authenticated', userA, 'select opportunity_id from public.saved_opportunities');
    assert.equal(own.rows.length, 1);
    const other = await asRole<{ opportunity_id: string }>(db, 'authenticated', userB, 'select opportunity_id from public.saved_opportunities');
    assert.equal(other.rows.length, 0);
    await assert.rejects(asRole(db, 'authenticated', userA, "insert into public.saved_opportunities(user_id,opportunity_id) values ('22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444444')"), /row-level security/i);
    await assert.rejects(asRole(db, 'authenticated', userA, "insert into public.saved_opportunities(user_id,opportunity_id) values ('11111111-1111-4111-8111-111111111111','55555555-5555-4555-8555-555555555555')"), /row-level security/i);
  } finally {
    await db.close();
  }
});
