-- Saved-item deadline reminders contain account/opportunity references only; no device profile answers.
create table public.deadline_reminders (
  user_id uuid not null references public.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  remind_at timestamptz not null,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  primary key(user_id,opportunity_id)
);
alter table public.deadline_reminders enable row level security;
create policy own_reminders_read on public.deadline_reminders for select to authenticated using(user_id=(select auth.uid()));
create policy own_reminders_insert on public.deadline_reminders for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.saved_opportunities s where s.user_id=(select auth.uid()) and s.opportunity_id=opportunity_id));
create policy own_reminders_delete on public.deadline_reminders for delete to authenticated using(user_id=(select auth.uid()));
grant select,insert,delete on public.deadline_reminders to authenticated;
grant all on public.deadline_reminders to service_role;
create index deadline_reminders_due_idx on public.deadline_reminders(remind_at) where delivered_at is null;
