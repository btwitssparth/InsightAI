-- InsightAI background analysis jobs migration

alter table public.analyses
add column if not exists error text;

create index if not exists analyses_status_created_at_idx
on public.analyses(status, created_at);
