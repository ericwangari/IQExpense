create table if not exists public.expenseiq_workspace (
  id integer primary key,
  payload jsonb not null,
  version integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.expenseiq_workspace enable row level security;

drop policy if exists "service role manages workspace" on public.expenseiq_workspace;
create policy "service role manages workspace"
  on public.expenseiq_workspace
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
