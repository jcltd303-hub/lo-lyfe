-- A started claim can be submitted only while its reviewed listing remains open.
drop policy own_claim_submit on public.claims;
create policy own_claim_submit on public.claims for update to authenticated
using (
  user_id = (select auth.uid()) and status = 'started'
  and exists (select 1 from public.opportunities o where o.id = opportunity_id)
)
with check (
  user_id = (select auth.uid()) and status = 'submitted'
  and attested_at is not null and submitted_at is not null
  and exists (select 1 from public.opportunities o where o.id = opportunity_id)
);
