# Lo-lyfe

Aggregator for free money and free stuff: class action settlements, free trials and coupons, refunds and replacements, low-barrier grants and stipends. Users get a dynamic profile that pre-fills applications, and a catalog filtered to what they actually qualify for.

## Stack
- Next.js (App Router, TypeScript) on Vercel, Capacitor shell for mobile later
- Supabase: Postgres, pgvector, auth, row-level security
- Ingestion: Vercel Cron or GitHub Actions, Crawlee/Firecrawl, LLM extraction to a strict schema
- Retrieval: hard SQL eligibility filters, then hybrid BM25 + vector ranking
- Optimization: bandits (Thompson sampling) for source crawl rates and ad selection

## Ground rules
1. Vercel Hobby is non-commercial. Upgrade to Pro before ads go live.
2. Only disclosed, honest-review offers. No paid fake 5-star reviews.
3. Use official APIs and public sources. Respect robots.txt and platform ToS.
4. Users attest before every submission. No blind auto-submit.
5. Never store SSNs or bank numbers. Sensitive profile fields are encrypted per field.

## Roadmap
Tracked as epic issues with task checklists. See [Issues labeled `epic`](../../issues?q=is%3Aissue+label%3Aepic).

| Phase | Focus | Timing |
|---|---|---|
| [0](../../issues/1) | Foundations and compliance | Week 1 |
| [1](../../issues/2) | Data model and dynamic profile | Weeks 1-3 |
| [2](../../issues/3) | Ingestion pipeline | Weeks 2-5 |
| [3](../../issues/4) | Retrieval and eligibility | Weeks 4-6 |
| [4](../../issues/5) | Apply flow and trust | Weeks 5-8 |
| [5](../../issues/6) | Ad monetization | Weeks 7-9 |
| [6](../../issues/7) | Autonomy loop | Weeks 10-13 |
| [7](../../issues/8) | VIP and mobile | Weeks 12-16 |
| [8](../../issues/9) | Launch and operations | Weeks 16+ |

Task tags: `FE` frontend, `BE` backend, `Data` ingestion/ML, `Ops` infra, `legal` compliance.
