# Lo-lyfe

A Next.js opportunity catalog and one-device profile foundation. The default preview shows illustrative listings only. With a configured Supabase project, the catalog reads reviewed, unexpired opportunities; no real listings are seeded yet.

## Run

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `apps/web/.env.local` to use Auth and the development catalog. Set `SUPABASE_SERVICE_ROLE_KEY` only in a trusted server environment to enable account deletion. Configure the Supabase Auth site URL and redirect allowlist for `/auth/callback`. Do not commit keys.

Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`. CI runs these checks on each PR.

## Privacy and current behavior

Users sign in by email link. Their ZIP, birth year, household size, and employment answers are encrypted with a non-extractable Web Crypto key in IndexedDB on one device. The key and ciphertext remain in the same browser storage, so this is device-local storage, not a defense against a compromised browser or device. Clearing site data loses the profile, and signing in on another device starts a blank one. Supabase Auth necessarily stores the sign-in email; the app database never stores profile answers. Do not enter SSNs, banking details, or full claim forms into the profile.

The database contains reviewed catalog records, saved listing IDs, minimal account rows, and claim statuses. The app links to official sites and lets the user attest after submitting a claim themselves. It never auto-submits a form. Account export contains server-held data; the local profile is excluded. Deletion needs the server-only key configured.

See [source policy](docs/policies/source-policy.md), [device-only design](docs/superpowers/specs/2026-09-28-device-only-profile-design.md), and [Supabase development verification](supabase/tests/rls-integration.md). The repository now includes reviewed-source ingestion, eligibility/ranking, reminders, guided claim tracking, payout logging, crowd trust signals, and production deployment documentation. Ads, paid VIP features, mobile packaging, and broader launch operations remain later roadmap phases and are not required for the core web deployment.
