
## Runnable preview

The first app slice is a Next.js catalog with illustrative listings and client-side search, category and location filters. The records are explicitly examples; no listing is verified or links to a claim form. Eligibility is a preliminary filter, never a determination. Profile inputs stay in memory and are not submitted or stored.

```bash
npm ci
npm run dev
```

Visit http://localhost:3000. Run `npm test`, `npm run typecheck`, and `npm run build` before opening a PR. CI runs those checks on pushes and PRs.

This preview does **not** implement Supabase, ingestion, applications, authentication, payments, or ads. The epic issues remain the source of truth for those phases. No secrets should be committed.
