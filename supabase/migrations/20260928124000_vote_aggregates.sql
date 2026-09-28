-- Public aggregates expose counts only, never voter identities.
create or replace view public.opportunity_vote_totals with (security_invoker=true) as
select opportunity_id,
 count(*) filter(where verdict='worked')::bigint as worked,
 count(*) filter(where verdict='no_payout')::bigint as no_payout,
 count(*) filter(where verdict='scam')::bigint as scam
from public.opportunity_votes group by opportunity_id;
grant select on public.opportunity_vote_totals to anon,authenticated;
