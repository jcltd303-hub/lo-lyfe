# Supabase schema

The three migrations in `migrations/` are applied to isolated development project `nutfhypocktoinqsmhfo`. Their filenames match the project migration history. Do not apply them again to that project. Use a separate production project and run the same RLS checks before release.

`public.profile_values` does not exist. Profile answers and the Web Crypto key remain on one device in IndexedDB; Supabase Auth stores the sign-in email. No client secret key is used for catalog, saves, or claims. RLS restricts public catalog reads and user-owned saves/claims. Only the server deletion endpoint needs a server-only service role key.

See [live RLS results](tests/rls-integration.md). The PGlite test runs the initial schema without extensions and checks row isolation; the live development checks verify Supabase roles, grants, Auth signup trigger, and claim transitions. Keep all future migrations committed with versions matching the target project's migration history.
