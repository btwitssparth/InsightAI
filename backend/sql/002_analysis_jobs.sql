-- InsightAI background analysis jobs hardening

alter table public.analyses
add column if not exists error text;

alter table public.analyses
add column if not exists attempt_count integer not null default 0;

create index if not exists analyses_status_created_at_idx
on public.analyses(status, created_at);
