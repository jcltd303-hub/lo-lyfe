-- Lo-lyfe foundation. Run in an isolated Supabase project and test RLS before use.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.field_definitions (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,63}$'),
  label text not null,
  value_type text not null check (value_type in ('text','number','boolean','date')),
  sensitivity text not null default 'standard' check (sensitivity in ('standard','sensitive','ask_each_time')),
  validator jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint prohibited_field check (key !~* '(ssn|social_security|bank|routing|account_number|credit_card)')
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null check (source_type in ('government','administrator','merchant','rss','official_api')),
  base_url text not null check (base_url ~ '^https://'),
  crawl_interval_minutes integer not null default 1440 check (crawl_interval_minutes between 60 and 43200),
  trust_score numeric(4,3) not null default 0 check (trust_score between 0 and 1),
  active boolean not null default false,
  last_crawled_at timestamptz,
  last_yield integer not null default 0 check (last_yield >= 0),
  created_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id),
  title text not null,
  summary text not null,
  category text not null check (category in ('settlement','refund','grant','freebie','coupon')),
  claim_url text not null check (claim_url ~ '^https://'),
  canonical_url text not null unique check (canonical_url ~ '^https://'),
  eligibility_text text not null,
  deadline date not null,
  payout_description text,
  proof_required text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','review','published','rejected','expired')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_requires_review check (status <> 'published' or reviewed_at is not null)
);
create index opportunities_public_idx on public.opportunities (category, deadline) where status = 'published';

create table public.saved_opportunities (
  user_id uuid not null references public.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);
create index saved_opportunities_user_idx on public.saved_opportunities(user_id, created_at desc);

create table public.opportunity_versions (
  id bigint generated always as identity primary key,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  snapshot jsonb not null,
  captured_at timestamptz not null default now()
);

create table public.eligibility_rules (
  id bigint generated always as identity primary key,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  rule_type text not null check (rule_type in ('state','min_age','purchase_period','purchase_proof')),
  rule_value jsonb not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  reviewer_approved boolean not null default false
);
create index eligibility_rules_opportunity_idx on public.eligibility_rules(opportunity_id);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id),
  status text not null default 'started' check (status in ('started','submitted','pending','paid','rejected')),
  attested_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submission_requires_attestation check (status = 'started' or attested_at is not null)
);
create index claims_user_idx on public.claims(user_id, created_at desc);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.ad_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete set null,
  event_type text not null check (event_type in ('impression','click','submission','revenue')),
  opportunity_id uuid references public.opportunities(id) on delete set null,
  revenue_cents bigint check (revenue_cents >= 0),
  occurred_at timestamptz not null default now()
);

insert into public.field_definitions(key,label,value_type,sensitivity,validator) values
  ('zip','ZIP code','text','standard','{"pattern":"^[0-9]{5}$"}'::jsonb),
  ('birth_year','Birth year','number','sensitive','{"min":1900}'::jsonb),
  ('household_size','Household size','number','standard','{"min":1}'::jsonb),
  ('employment','Employment status','text','standard','{}'::jsonb)
on conflict (key) do nothing;

alter table public.users enable row level security;
alter table public.field_definitions enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.sources enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_versions enable row level security;
alter table public.eligibility_rules enable row level security;
alter table public.claims enable row level security;
alter table public.payouts enable row level security;
alter table public.ad_events enable row level security;

-- Catalog readers see only reviewed, active records. Drafts stay service-role only.
create policy published_opportunities_read on public.opportunities for select to anon, authenticated
using (status = 'published' and deadline >= current_date and reviewed_at is not null);
create policy published_rules_read on public.eligibility_rules for select to anon, authenticated
using (reviewer_approved and exists (
  select 1 from public.opportunities o where o.id = opportunity_id
));
create policy source_names_read on public.sources for select to anon, authenticated
using (active and exists (
  select 1 from public.opportunities o where o.source_id = sources.id
));
create policy field_schema_read on public.field_definitions for select to authenticated using (true);

-- Profile answers live on the user's device. Claims use authenticated server operations.
create policy own_user_read on public.users for select to authenticated using (id = (select auth.uid()));
create policy own_saved_read on public.saved_opportunities for select to authenticated using (user_id = (select auth.uid()));
create policy own_saved_insert on public.saved_opportunities for insert to authenticated
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.opportunities o where o.id = opportunity_id
));
create policy own_saved_delete on public.saved_opportunities for delete to authenticated using (user_id = (select auth.uid()));
create policy own_claim_read on public.claims for select to authenticated using (user_id = (select auth.uid()));
create policy own_payout_read on public.payouts for select to authenticated using (
  exists (select 1 from public.claims c where c.id = claim_id and c.user_id = (select auth.uid()))
);
-- No policy on ad_events, opportunity_versions, or writes to any table.

-- Explicit grants complement RLS; service_role performs reviewed server writes.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on public.opportunities, public.eligibility_rules, public.sources to anon, authenticated;
grant select on public.field_definitions, public.users, public.claims, public.payouts to authenticated;
grant select, insert, delete on public.saved_opportunities to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
