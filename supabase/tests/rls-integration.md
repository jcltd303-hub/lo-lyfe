# Development Supabase verification

Project: `lo-lyfe-dev` (`nutfhypocktoinqsmhfo`, us-west-1). This is an isolated development database; no production project is configured.

Applied migrations:
- `20260928071003_foundation_device_only_profile.sql`
- `20260928072708_owner_claim_transitions.sql`
- `20260928073121_limit_public_source_columns.sql`

All test users, opportunities, saves, claims, and payouts below were inserted within SQL transactions and rolled back.

## Results (2026-09-28)

| Check | Observed |
| --- | --- |
| `public.profile_values` | Absent |
| Public tables without RLS | 0 |
| Extensions | `pgcrypto`, `vector` |
| Auth signup trigger | One minimal `public.users` row created for a test Auth user |
| Anonymous catalog | One reviewed listing visible; draft hidden |
| Anonymous saves/claims | No SELECT grant |
| User A / user B saves | A sees own save; B sees zero |
| Draft save / draft claim | Rejected with SQLSTATE `42501` |
| Claim submission | `started` to `submitted`; database set both timestamps |
| Cross-user claims/payouts | User B sees zero |
| Public source columns | `name` readable; `trust_score` denied |

Example transaction pattern (replace UUIDs with test values in a development environment):

```sql
begin;
-- Insert test auth.users, sources and opportunities; the Auth trigger adds users.
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select count(*) from public.saved_opportunities;
rollback;
```

The transaction must be rolled back even if an assertion fails. A failed statement aborts its transaction; start a new transaction for another scenario. These checks exercised Postgres grants and RLS with simulated role/JWT context. They did not exercise a browser session, email delivery, or a deployed API.

## Advisors

Security advisor reported only two information notices: `ad_events` and `opportunity_versions` have RLS with no client policy intentionally, leaving them server-only. See [RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Performance advisor reported unindexed foreign keys on tables beyond the active save/claim paths, plus unused indexes in this empty database. The save and claim opportunity foreign keys are indexed by the third migration. See [unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

## Before enabling a deployment

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the target environment. Set `SUPABASE_SERVICE_ROLE_KEY` only in server environment for account deletion; never expose it as a public variable. Configure Auth site URL and email redirect allowlist for the deployed origin and `/auth/callback`. Test email sign-in, encrypted IndexedDB persistence and recovery, cross-account switching, claims, export, and deletion in a browser. Keep production separate from this development project.
