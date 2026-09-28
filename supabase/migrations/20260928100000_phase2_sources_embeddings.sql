-- Phase 2 source registry and opportunity-only feature embeddings. No user/profile data is embedded.
alter table public.opportunities add column if not exists content_embedding extensions.vector(32);
create index if not exists opportunities_content_embedding_hnsw on public.opportunities using hnsw (content_embedding extensions.vector_cosine_ops);

insert into public.sources(name,source_type,base_url,crawl_interval_minutes,trust_score,active,allowed_hosts)
select 'FTC active refund programs','government','https://www.ftc.gov/enforcement/refunds',360,0.980,true,array['www.ftc.gov']
where not exists(select 1 from public.sources where base_url='https://www.ftc.gov/enforcement/refunds');
insert into public.sources(name,source_type,base_url,crawl_interval_minutes,trust_score,active,allowed_hosts)
select 'USAGov unclaimed money','government','https://www.usa.gov/unclaimed-money',1440,0.990,true,array['www.usa.gov']
where not exists(select 1 from public.sources where base_url='https://www.usa.gov/unclaimed-money');
