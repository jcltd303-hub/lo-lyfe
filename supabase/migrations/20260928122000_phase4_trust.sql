-- Phase 4 trust signals. Votes contain no profile answers.
create table public.opportunity_votes(
 user_id uuid not null references public.users(id) on delete cascade,
 opportunity_id uuid not null references public.opportunities(id) on delete cascade,
 verdict text not null check(verdict in('worked','no_payout','scam')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(user_id,opportunity_id)
);
alter table public.opportunity_votes enable row level security;
create policy own_vote_read on public.opportunity_votes for select to authenticated using(user_id=(select auth.uid()));
create policy own_vote_insert on public.opportunity_votes for insert to authenticated with check(user_id=(select auth.uid()));
create policy own_vote_update on public.opportunity_votes for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update(verdict,updated_at) on public.opportunity_votes to authenticated;
grant all on public.opportunity_votes to service_role;
create index opportunity_votes_opportunity_idx on public.opportunity_votes(opportunity_id);

create policy own_claim_progress on public.claims for update to authenticated
using(user_id=(select auth.uid()) and status in('submitted','pending'))
with check(user_id=(select auth.uid()) and status in('pending','paid','rejected') and attested_at is not null);
