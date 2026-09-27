-- InsightAI authentication migration
-- Run this in the Supabase SQL Editor.

alter table public.datasets
add column if not exists owner_id uuid;

create index if not exists datasets_owner_id_idx
on public.datasets(owner_id);

drop policy if exists "Users can view their own datasets" on public.datasets;
create policy "Users can view their own datasets"
on public.datasets for select to authenticated
using (owner_id = auth.uid());

drop policy if exists "Users can insert their own datasets" on public.datasets;
create policy "Users can insert their own datasets"
on public.datasets for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Users can update their own datasets" on public.datasets;
create policy "Users can update their own datasets"
on public.datasets for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Users can delete their own datasets" on public.datasets;
create policy "Users can delete their own datasets"
on public.datasets for delete to authenticated
using (owner_id = auth.uid());

-- Existing pre-auth datasets have NULL owner_id and will not be returned
-- by the authenticated backend. Assign them manually to a user if needed.
