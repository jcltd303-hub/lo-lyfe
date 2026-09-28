# Lo-lyfe Foundation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Establish a shared app/core workspace and database-ready foundation without representing example listings as live offers.

**Architecture:** Next.js renders the preview from a shared typed core package. SQL migrations define a separate backend boundary with RLS; no database connection is wired until environments are provisioned.

**Tech Stack:** pnpm, Turborepo, Next.js 16, React 19, TypeScript, PostgreSQL/Supabase.

**Spec:** `docs/superpowers/specs/2026-09-28-foundation-design.md`

## Global constraints

- No claim auto-submit or storage of SSNs and bank numbers.
- Missing eligibility evidence displays unknown.
- Example listings carry no application links.

## Review focus

- Missing rule data: status unknown, covered by `packages/core/tests/eligibility.test.ts`.
- Invalid age: status unknown, covered by `packages/core/tests/eligibility.test.ts`.
- Expired record: excluded, covered by `packages/core/tests/eligibility.test.ts`.
- Anonymous profile read: disallowed by RLS, requiring isolated database tests before activation.
- Cross-user profile read/write: disallowed by RLS, requiring isolated database tests before activation.

### Task 1: Workspace

**Files:** `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `apps/web/**`, `packages/core/**`, `.github/workflows/ci.yml`

**Interfaces:** Web imports `evaluateEligibility`, `filterOpportunities`, and opportunity types from `@lo-lyfe/core`.

- [ ] Move existing app and tests into workspace packages.
- [ ] Verify baseline and regression tests with `pnpm test`.
- [ ] Run `pnpm lint`, `pnpm typecheck`, and `pnpm build`.

### Task 2: Data boundary

**Files:** `supabase/migrations/*.sql`, `docs/policies/source-policy.md`

**Interfaces:** Authenticated users may access only their own profile and claim rows. Public reads are restricted to approved active listings.

- [ ] Define tables, constraints, and default-deny RLS policies.
- [ ] Add source and verification rules to policy document.
- [ ] Test migration and policies against an isolated local or development Supabase instance before wiring production credentials.
