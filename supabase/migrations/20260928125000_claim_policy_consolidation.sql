drop policy if exists own_claim_submit on public.claims;drop policy if exists own_claim_progress on public.claims;
create policy own_claim_update on public.claims for update to authenticated
using(user_id=(select auth.uid()) and status in('started','submitted','pending'))
with check(user_id=(select auth.uid()) and (
 (status='submitted' and attested_at is not null and submitted_at is not null)
 or (status in('pending','paid','rejected') and attested_at is not null)
));
