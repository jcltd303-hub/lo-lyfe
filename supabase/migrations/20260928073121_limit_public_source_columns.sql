-- Public catalog needs source names, not internal crawl and trust metadata.
revoke select on public.sources from anon, authenticated;
grant select (id, name) on public.sources to anon, authenticated;

create index saved_opportunities_opportunity_idx on public.saved_opportunities(opportunity_id);
create index claims_opportunity_idx on public.claims(opportunity_id);
