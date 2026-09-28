# Lo-lyfe foundation design

## Outcome

Provide a runnable, accessible catalog preview and a safe foundation for future verified opportunities. The nine roadmap epics form a staged product, not a single checkbox: the first engineering layer must keep unverified content and personal information away from claim workflows.

## Boundaries

- `apps/web` owns the Next.js UI, routes, and browser interactions.
- `packages/core` owns opportunity types, eligibility rules, and deterministic tests. Missing rule data means unknown; a matching rule set is only a possible match.
- `supabase/migrations` owns data tables and RLS. It does not imply a provisioned or verified Supabase deployment.
- `docs/policies` owns source rules and documents which approvals remain external.

## Data flow

The preview reads example records from core. It keeps input state in memory and never submits or stores a user profile. Later, authenticated users will have their own profile rows protected by RLS. Ingestion produces draft records, human verification marks them published, and the catalog should read published, unexpired records only. Claim submissions require review and attestation. No automated claim submission, tracking, monetization, or VIP behavior is enabled by the preview.

## Verification

Run core tests, lint, typecheck, and a production build in CI. SQL policies need execution against an isolated Supabase instance before being treated as validated. Live sources, encryption keys, providers, legal review, beta evidence, and Vercel plan changes require actual configured environments and external decisions.
