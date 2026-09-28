# Device-only profile and Supabase foundation

## Outcome and scope

Lo-lyfe users can sign in, browse reviewed opportunities, save listing IDs, and track their own claims. Personal profile answers live on one device only. The server must not persist those answers, inferred eligibility attributes, form contents, or encryption keys. This spec covers the Supabase-backed foundation; live ingestion, ads, payments, mobile packaging, and a production launch remain separate epics.

## Trust boundaries

- Supabase Auth identifies the account. The database holds a minimal user row, approved catalog data, saved opportunity IDs, and claim state. It never holds profile values.
- A local profile vault holds ZIP, birth year, household, employment, and future user-entered answers. Encrypt it before writing to device storage. Use a non-extractable device key when supported, and avoid claiming hardware-backed protection in ordinary web browsers. No automatic backup or cross-device synchronization.
- The browser evaluates eligibility using locally stored answers and public eligibility rules. The server receives a listing ID for saves and claims, not the answers or a derived personal match score.
- Claim forms that require PII lead to the official claim destination or a local copy-fields view. No blind auto-submission. The app stores attestation time and status only, not form contents.
- Authentication on a second device restores account, saves, and claim history; the local profile begins empty. Sign-out should clear decrypted memory; local profile deletion must be explicit and available in settings. Account deletion removes server rows and local vault.

## Data model and authorization

Revise the draft migration before applying it. Remove `profile_values` entirely. Retain `field_definitions` as a public, blank schema if useful for rendering; it must contain no user values. Add `saved_opportunities(user_id, opportunity_id, created_at)` with a composite key. Keep `users`, `claims`, and `payouts` minimal; prevent claim notes or receipt content from containing PII. All public-schema tables have RLS. Catalog SELECT exposes only reviewed, published, unexpired listings and approved rules. Saves and claims are scoped to `auth.uid()` for SELECT/INSERT/DELETE or tightly defined updates. The server validates state transitions and records attestation. Administrator and ingestion writes use a server-only credential, never browser code. Audit grants separately from RLS. A database trigger or equivalent idempotent server operation creates the minimal user row after signup.

## Local vault behavior

The first device creates an encryption key with Web Crypto and stores only ciphertext in IndexedDB. Browser storage may be cleared by the OS or user, and browser key persistence is not guaranteed across device or browser reinstalls; onboarding states that losing the device/browser data loses the profile. A passphrase option or native secure storage would be a separate design. Never store plaintext in localStorage, cookies, URLs, logs, analytics, exceptions, or Supabase tables. Version vault records to permit migration; handle decrypt failure with a clear reset action without silently overwriting ciphertext. A device lock can reduce casual access while the app is open, but web platform limitations must be described accurately.

## User flow

A visitor browses reviewed listings anonymously. After signup, they can create a local profile in skippable steps, see tentative eligibility calculated on-device, save a listing, and start a claim. Before marking a claim submitted, they review the destination and attest to the accuracy of their own submission. A new device permits sign-in and server-backed history but asks the user to create a new local profile. No PII is sent with telemetry or server requests.

## Errors and verification

Fail closed if auth or RLS cannot establish ownership. Distinguish an empty profile from inaccessible or corrupted vault data. Unit-test local eligibility and vault serialization, including no network payload with profile answers. In an isolated Supabase development project, apply migration, verify roles/grants and extensions, and execute anonymous, user A, user B, and service scenarios for catalog, saves, claims, and payouts. Run advisors and CI lint, typecheck, tests, and build. Production schema application requires passing integration checks and separate production configuration. External source verification and legal review remain release gates.

## Implementation boundaries

1. Correct migration and RLS, prove it in development.
2. Connect Auth and minimal account/server models.
3. Add device vault and local profile/eligibility flow.
4. Add saved IDs and claims with a PII-free API.
5. Verify end-to-end flows and document browser storage limits.

The foundation PR can carry this work or a stacked follow-up, but it must not claim all nine epics are complete.