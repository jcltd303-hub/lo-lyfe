-- Claim ownership and attestation. Answers and form contents remain on the device.
alter table public.claims add constraint claims_user_opportunity_unique unique (user_id, opportunity_id);

create policy own_claim_start on public.claims for insert to authenticated
with check (
  user_id = (select auth.uid()) and status = 'started'
  and attested_at is null and submitted_at is null
  and exists (select 1 from public.opportunities o where o.id = opportunity_id)
);
create policy own_claim_submit on public.claims for update to authenticated
using (user_id = (select auth.uid()) and status = 'started')
with check (user_id = (select auth.uid()) and status = 'submitted'
  and attested_at is not null and submitted_at is not null);

-- A browser can change only status. The database records its own timestamps.
create function private.enforce_claim_submit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user = 'authenticated' then
    if old.user_id is distinct from new.user_id or old.opportunity_id is distinct from new.opportunity_id
      or old.status <> 'started' or new.status <> 'submitted' then
      raise exception 'Invalid claim transition';
    end if;
    new.attested_at := now();
    new.submitted_at := now();
    new.updated_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_claim_submit() from public, anon;
create trigger enforce_claim_submit before update on public.claims
for each row execute function private.enforce_claim_submit();

grant insert (user_id, opportunity_id, status), update (status) on public.claims to authenticated;
