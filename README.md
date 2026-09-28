
## Runnable preview

The first app slice is a Next.js catalog with illustrative listings and client-side search, category and location filters. The records are explicitly examples; no listing is verified or links to a claim form. Eligibility is a preliminary filter, never a determination. Profile inputs stay in memory and are not submitted or stored.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Visit http://localhost:3000. Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` before opening a PR. CI runs those checks on pushes and PRs.

This preview does **not** implement Supabase, ingestion, applications, authentication, payments, or ads. The epic issues remain the source of truth for those phases. No secrets should be committed.

## Workspace

`apps/web` contains the Next.js app, `packages/core` contains shared opportunity and eligibility logic, and `supabase/migrations` will contain the backend schema. See `docs/policies/source-policy.md` for source and review requirements. Database credentials and live ingestion are not configured.

The shared core now includes a missing-field calculator and strict ingestion draft validator. These are offline contracts only: no crawler, verified live listing, profile persistence, or submission path is enabled.
