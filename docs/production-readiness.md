# Production deployment checklist

## Required Vercel environment
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY (server only)
- CRON_SECRET (server only; Vercel cron Authorization bearer secret)
- ADMIN_USER_IDS (server only; comma-separated reviewer Auth UUIDs)

## Supabase
Apply every migration in `supabase/migrations` to production in filename order. Run security and performance advisors afterward. Configure Auth Site URL and redirect URL to the production domain plus `/auth/callback`.

## Vercel
Use the repository root as project root. Framework/build is driven by the root `package.json`; `pnpm build` runs the monorepo build. Scheduled jobs are declared in `vercel.json`. Do not expose service-role or cron secrets to the browser.

## Release gate
A production release requires `pnpm test && pnpm lint && pnpm typecheck && pnpm build` on main, successful database migrations, and a smoke test of catalog, auth callback, save, claim, account, and admin review flows.

## Privacy/trust invariants
Profile answers remain encrypted on-device. Never add profile-answer columns or server sync. Never collect SSN, bank/routing/account or card numbers. Claims are user-submitted at the official site; Lo-lyfe only guides and tracks. Ingestion candidates require human review before publication.
