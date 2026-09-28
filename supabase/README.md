# Database deployment gate

The migration in `migrations/` is an unexecuted schema draft. The core test suite exercises its tables and RLS with embedded PostgreSQL (PGlite), omitting the two extensions unavailable in that runtime. Apply it to an isolated development Supabase project first, then repeat cross-user and anonymous RLS tests, verify extensions and role grants, and inspect query plans. Do not point the preview web app at it until authentication, key management, profile encryption, source review, and deletion/export flows are implemented.

Profile answers are stored only in an encrypted vault on one device. The database contains no `profile_values` table. Do not send answers, eligibility attributes, or form contents to Supabase, analytics, or logs. Saved IDs are owner-scoped by RLS; claim writes remain restricted to authenticated server operations.
