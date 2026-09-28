# Device-Only Profile and Supabase Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver authenticated saves and claims with a reviewed catalog while profile answers remain exclusively on one device.

**Architecture:** Supabase owns Auth and minimal account/catalog/claim records under RLS. Web Crypto and IndexedDB own the local vault; eligibility executes in the browser. Server mutations accept identifiers and attestation only.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth/Postgres/RLS, Web Crypto, IndexedDB, PGlite, node:test, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-28-device-only-profile-design.md`

## Global Constraints

- Never persist profile answers, inferred eligibility attributes, form contents, or encryption keys on the server.
- No automatic backup or cross-device sync; another device begins with a blank local profile.
- No plaintext in localStorage, cookies, URLs, logs, analytics, exceptions, or Supabase tables.
- No blind auto-submission; claims require user review and attestation.
- Only reviewed, published, unexpired listings are public.
- An authentication or authorization error fails closed.
- Keep sample listings explicitly labeled as examples until real reviewed records exist.
- Pin Supabase dependency versions and commit the lockfile; never expose a service key in browser code.

## Review Focus

- IndexedDB denied or quota exceeded: show persistence failure and retain in-memory edits without claiming they were saved (Task 3).
- Corrupted vault or missing key: keep ciphertext intact and offer explicit reset, never overwrite automatically (Task 3).
- Switch accounts on one browser: isolate vault namespaces by authenticated user ID and clear decrypted memory on sign-out (Task 3).
- Expired or draft listing ID submitted directly: reject save/claim mutation even if the UI once showed it (Task 4).
- Repeat or conflicting claim transitions: enforce idempotency or reject invalid transitions without losing attestation (Task 4).

---

### Task 1: Revise schema and prove RLS

**Files:**
- Modify: `supabase/migrations/20260928030000_foundation.sql`
- Modify: `packages/core/tests/database.test.ts`
- Modify: `supabase/README.md`

**Interfaces:**
- Produces: `public.saved_opportunities(user_id uuid, opportunity_id uuid, created_at timestamptz)`; existing `public.claims` and `public.users` contain no profile answers.
- Produces: RLS reads for public approved catalog and owner reads/mutations for saves and claims; service operations must still validate transitions.

- [ ] **Step 1: Write failing database tests** asserting `profile_values` is absent, no user answers table exists, anonymous users cannot read saves/claims, user A cannot read or mutate user B rows, draft/expired listings are unavailable, and approved records are readable.
- [ ] **Step 2: Run `pnpm test`** and confirm the new assertions fail against the existing migration.
- [ ] **Step 3: Revise the existing unapplied migration**: remove `profile_values`; add saved IDs and scoped grants/policies; ensure `WITH CHECK` on authenticated updates; keep field definitions blank and forbid unreviewed catalog exposure.
- [ ] **Step 4: Run `pnpm test`** and confirm the new database assertions pass. Re-read schema for auth, grants, RLS, and view/function privileges.
- [ ] **Step 5: Update `supabase/README.md`** with the dev integration procedure, explicitly replacing the former server-encrypted-profile instructions; commit this coherent schema change.

### Task 2: Wire Supabase Auth and reviewed catalog

**Files:**
- Modify: `apps/web/package.json`, `pnpm-lock.yaml`, `.env.example`
- Create: `apps/web/src/lib/supabase/browser.ts`, `apps/web/src/lib/supabase/server.ts`, `apps/web/src/lib/catalog.ts`
- Create: `apps/web/src/app/auth/page.tsx`, `apps/web/src/app/auth/callback/route.ts`
- Modify: `apps/web/src/app/page.tsx`
- Test: `apps/web/src/lib/catalog.test.ts`

**Interfaces:**
- Produces: `loadPublishedCatalog(client): Promise<Opportunity[]>` mapping approved DB rows into core opportunity records without user fields.
- Produces: browser and server Supabase clients with publishable key only; auth callback uses code exchange and secure cookies.

- [ ] **Step 1: Add a failing catalog mapping test** for published rows, absent required data, and empty results; ensure example records stay labeled in preview mode.
- [ ] **Step 2: Run the focused test** and confirm failure.
- [ ] **Step 3: Consult current Supabase changelog/docs and Next.js auth guidance; pin `@supabase/supabase-js` and `@supabase/ssr` versions**, update lockfile and env template, implement clients, auth callback, and login/logout UI.
- [ ] **Step 4: Implement `loadPublishedCatalog`** and switch the page to verified records only when configured; keep explicit sample mode otherwise. Render only browser-calculated eligibility; do not send location/age to the server.
- [ ] **Step 5: Run focused test, `pnpm lint`, `pnpm typecheck`, `pnpm build`**; commit.

### Task 3: Build the one-device vault and onboarding

**Files:**
- Create: `apps/web/src/lib/device-vault.ts`, `apps/web/src/lib/device-vault.test.ts`
- Create: `apps/web/src/app/profile/page.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `packages/core/src/profile.ts`, `packages/core/tests/profile.test.ts`

**Interfaces:**
- Produces: `readProfile(userId: string): Promise<ProfileAnswers | null>`, `writeProfile(userId: string, answers: ProfileAnswers): Promise<void>`, `deleteProfile(userId: string): Promise<void>`.
- Storage namespace is user ID; vault record is versioned AES-GCM ciphertext and non-extractable Web Crypto key in IndexedDB. `ask_each_time` and prohibited keys never persist.

- [ ] **Step 1: Write failing vault tests** for round-trip, per-user separation, forbidden fields, missing key/corruption preservation, storage failures, and deletion; add core tests for skipped onboarding fields.
- [ ] **Step 2: Run focused tests** and confirm expected failures.
- [ ] **Step 3: Implement the vault interfaces** and skippable local onboarding; expose separate empty/corrupt/storage-failure states, and ensure no profile-answer network request is made.
- [ ] **Step 4: Run focused tests and CI checks**; manually inspect network interactions for absence of profile values and account-switch behavior; commit.

### Task 4: Add saved IDs and attested claim state

**Files:**
- Create: `apps/web/src/app/api/saves/route.ts`, `apps/web/src/app/api/claims/route.ts`
- Create: `apps/web/src/lib/claims.ts`, `apps/web/src/lib/claims.test.ts`
- Create: `apps/web/src/app/account/page.tsx`
- Modify: `apps/web/src/app/page.tsx`

**Interfaces:**
- Produces: save mutation request `{ opportunityId: string }`; claim request `{ opportunityId: string, attested: true }`; response contains IDs/status/timestamps only.
- `startClaim` accepts a published, unexpired listing; `markSubmitted` requires explicit attestation and validates transition. External claim URL is shown for user-controlled navigation.

- [ ] **Step 1: Write failing API/domain tests** for unauthorized calls, extraneous PII fields, expired/draft listing IDs, duplicate saves, cross-user access, missing attestation, and invalid/repeated transitions.
- [ ] **Step 2: Run focused tests** to confirm failure.
- [ ] **Step 3: Implement request schemas, server-side `getUser()` checks, ownership-scoped queries, transition validation, and local-only copy-fields UI**, ensuring request and response contain no profile data.
- [ ] **Step 4: Run focused tests and CI checks**; commit.

### Task 5: Validate live Supabase development environment and end-to-end behavior

**Files:**
- Create: `supabase/tests/rls-integration.md` or an executable integration script beside it
- Modify: `README.md`, `supabase/README.md`, `docs/superpowers/specs/2026-09-28-device-only-profile-design.md` only if validation exposes a spec contradiction

**Interfaces:**
- Consumes: Tasks 1–4, development project ref and publishable key.
- Produces: reproducible dev RLS results and deployment notes; no production schema change until verified.

- [ ] **Step 1: Create or identify an isolated development Supabase project in the approved organization**, inspect current changelog/docs, discover CLI commands with `--help`, and apply the revised migration using the supported route.
- [ ] **Step 2: Execute anonymous, user A, user B, and service checks** for grants/RLS on catalog, saves, claims, and payouts; inspect extensions and run database security/performance advisors.
- [ ] **Step 3: Exercise browser flow**: preview catalog, sign up, local profile, sign out/in on same device, second-device blank profile, save, attestation, account deletion, and failed-storage recovery.
- [ ] **Step 4: Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`**; record outputs and remaining external gates, then commit documentation and prepare PR review.
