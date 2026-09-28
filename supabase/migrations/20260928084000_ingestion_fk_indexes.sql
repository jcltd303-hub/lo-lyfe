-- Cover foreign keys used by ingestion/catalog joins and deletes.
create index if not exists opportunities_source_idx on public.opportunities(source_id);
create index if not exists opportunity_versions_opportunity_idx on public.opportunity_versions(opportunity_id);
create index if not exists payouts_claim_idx on public.payouts(claim_id);
create index if not exists ad_events_user_idx on public.ad_events(user_id);
create index if not exists ad_events_opportunity_idx on public.ad_events(opportunity_id);
