# Database deployment gate

The migration in `migrations/` is an unexecuted schema draft. Apply it only to an isolated development Supabase project first, then run cross-user and anonymous RLS tests, verify role grants, and inspect query plans. Do not point the preview web app at it until authentication, key management, profile encryption, source review, and deletion/export flows are implemented.

For `profile_values`, only an authenticated server operation with a service role may write. It must reject prohibited field keys, validate against `field_definitions`, encrypt sensitive values with a dedicated AES-GCM key outside the database, and avoid logging plaintext. The database `check` constraints are a second barrier, not a substitute for that server logic.
