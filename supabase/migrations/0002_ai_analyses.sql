-- 0002 — AI analysis of results (تحلیل هوش مصنوعی نتایج)
-- One row per generated analysis; the reports page shows the latest one.
-- Access is enforced by RLS: only the owner of the parent form may
-- select/insert/delete rows of this table.

create table if not exists public.ai_analyses (
  id              uuid primary key default gen_random_uuid(),
  form_id         uuid not null references public.forms (id) on delete cascade,
  analysis        jsonb not null,          -- { summary, insights[], anomalies[], suggestions[] }
  model           text not null,           -- e.g. glm-4.5-flash
  provider        text not null default 'zai',
  responses_count integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_ai_analyses_form_created
  on public.ai_analyses (form_id, created_at desc);

alter table public.ai_analyses enable row level security;

create policy "ai_analyses_owner_select" on public.ai_analyses
  for select to authenticated
  using (
    exists (
      select 1 from public.forms f
      where f.id = form_id and f.owner_id = auth.uid()
    )
  );

create policy "ai_analyses_owner_insert" on public.ai_analyses
  for insert to authenticated
  with check (
    exists (
      select 1 from public.forms f
      where f.id = form_id and f.owner_id = auth.uid()
    )
  );

create policy "ai_analyses_owner_delete" on public.ai_analyses
  for delete to authenticated
  using (
    exists (
      select 1 from public.forms f
      where f.id = form_id and f.owner_id = auth.uid()
    )
  );
