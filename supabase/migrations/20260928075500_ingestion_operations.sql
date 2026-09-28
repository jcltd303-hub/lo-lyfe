-- Phase 2 ingestion operations. Service-role only; no user PII is stored here.
alter table public.sources
  add column if not exists allowed_hosts text[] not null default '{}',
  add column if not exists etag text,
  add column if not exists next_crawl_at timestamptz,
  add column if not exists consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  add column if not exists disabled_reason text,
  add column if not exists robots_checked_at timestamptz;

create index if not exists sources_due_idx
  on public.sources (next_crawl_at)
  where active;

create table if not exists public.ingestion_runs (
  id bigint generated always as identity primary key,
  source_id uuid not null references public.sources(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  outcome text not null default 'running'
    check (outcome in ('running','success','unchanged','retry','disabled','failed')),
  http_status integer check (http_status between 100 and 599),
  candidates_found integer not null default 0 check (candidates_found >= 0),
  candidates_accepted integer not null default 0 check (candidates_accepted >= 0),
  error_code text,
  retry_at timestamptz
);
create index if not exists ingestion_runs_source_idx on public.ingestion_runs(source_id, started_at desc);

alter table public.ingestion_runs enable row level security;
revoke all on public.ingestion_runs from anon, authenticated;
grant all on public.ingestion_runs to service_role;

-- Existing source/catalog RLS remains unchanged. Ingestion metadata is never exposed to clients.
