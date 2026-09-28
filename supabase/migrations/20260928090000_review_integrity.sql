-- Review timestamps represent explicit human decisions. Expiry is lifecycle state, not review.
alter table public.opportunities
  add constraint reviewed_state_consistency
  check (
    (status in ('published','rejected') and reviewed_at is not null)
    or (status in ('draft','review','expired'))
  );
