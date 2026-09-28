create policy own_payout_insert on public.payouts for insert to authenticated
with check(exists(select 1 from public.claims c where c.id=claim_id and c.user_id=(select auth.uid()) and c.status='paid'));
grant insert(claim_id,amount_cents,currency,confirmed_at) on public.payouts to authenticated;
