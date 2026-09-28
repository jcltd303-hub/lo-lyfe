-- Track opportunity embedding provenance for safe re-embedding. No user/profile vectors are stored.
alter table public.opportunities add column if not exists embedding_model text;
alter table public.opportunities add column if not exists embedded_at timestamptz;
create index if not exists opportunities_embedding_model_idx on public.opportunities(embedding_model) where content_embedding is not null;
