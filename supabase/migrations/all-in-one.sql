-- ==========================================================
-- آرشام فرم — اجرای کامل مایگریشن‌ها (یک‌جا)
-- کل این فایل را در Supabase SQL Editor اجرا کنید (فقط یک بار)
-- ==========================================================

-- ============================================================
-- Arsham Form — Migration 0001: schema, indexes, RLS
-- Idempotent-safe ordering; run in Supabase SQL editor or CLI.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- forms ----------
create table if not exists public.forms (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  description  text not null default '',
  form_type    text not null default 'form' check (form_type in ('form', 'survey', 'quiz')),
  status       text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  public_id    text not null unique,
  settings     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz
);

-- ---------- questions ----------
create table if not exists public.questions (
  id                text primary key default gen_random_uuid()::text,
  form_id           uuid not null references public.forms (id) on delete cascade,
  type              text not null,
  title             text not null default '',
  description       text not null default '',
  required          boolean not null default false,
  position          integer not null default 0,
  options           jsonb not null default '{}',           -- type-specific config (choices, limits…)
  scoring_rules     jsonb,
  conditional_rules jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------- responses ----------
create table if not exists public.responses (
  id             uuid primary key default gen_random_uuid(),
  form_id        uuid not null references public.forms (id) on delete cascade,
  respondent_id  uuid references auth.users (id) on delete set null,
  respondent_key text not null default '',   -- hashed anon key (no personal data)
  status         text not null default 'submitted',
  total_score    numeric,
  max_score      numeric,
  passed         boolean,
  attempt_number integer not null default 1,
  started_at     timestamptz,
  submitted_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  respondent_name          text,             -- secure exam: «نام و نام خانوادگی»
  respondent_national_id   text              -- secure exam: normalized 10-digit «کد ملی»
);

-- ---------- answers ----------
create table if not exists public.answers (
  id           uuid primary key default gen_random_uuid(),
  response_id  uuid not null references public.responses (id) on delete cascade,
  question_id  text not null references public.questions (id) on delete cascade,
  answer_value jsonb,
  created_at   timestamptz not null default now()
);

-- ---------- uploaded files ----------
create table if not exists public.uploaded_files (
  id         uuid primary key default gen_random_uuid(),
  form_id    uuid not null references public.forms (id) on delete cascade,
  path       text not null,
  name       text not null,
  mime       text not null,
  size       bigint not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- indexes ----------
create index if not exists idx_forms_owner          on public.forms (owner_id);
create index if not exists idx_forms_owner_status   on public.forms (owner_id, status);
create index if not exists idx_questions_form_pos   on public.questions (form_id, position);
create index if not exists idx_responses_form_sub   on public.responses (form_id, submitted_at);
create index if not exists idx_responses_form_key   on public.responses (form_id, respondent_key);
create index if not exists idx_responses_form_national_id on public.responses (form_id, respondent_national_id);
create index if not exists idx_answers_response     on public.answers (response_id);
create index if not exists idx_answers_question     on public.answers (question_id);
create index if not exists idx_uploaded_files_form  on public.uploaded_files (form_id);

-- ---------- updated_at maintenance ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_forms_updated on public.forms;
create trigger trg_forms_updated before update on public.forms
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_questions_updated on public.questions;
create trigger trg_questions_updated before update on public.questions
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.forms         enable row level security;
alter table public.questions     enable row level security;
alter table public.responses     enable row level security;
alter table public.answers       enable row level security;
alter table public.uploaded_files enable row level security;

-- ---------- profiles ----------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- forms ----------
drop policy if exists forms_select on public.forms;
create policy forms_select on public.forms
  for select using (owner_id = auth.uid() or status = 'published');

drop policy if exists forms_insert_own on public.forms;
create policy forms_insert_own on public.forms
  for insert with check (owner_id = auth.uid());

drop policy if exists forms_update_own on public.forms;
create policy forms_update_own on public.forms
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists forms_delete_own on public.forms;
create policy forms_delete_own on public.forms
  for delete using (owner_id = auth.uid());

-- ---------- questions ----------
drop policy if exists questions_select on public.questions;
create policy questions_select on public.questions
  for select using (
    exists (select 1 from public.forms f where f.id = form_id and (f.owner_id = auth.uid() or f.status = 'published'))
  );

drop policy if exists questions_write_own on public.questions;
create policy questions_write_own on public.questions
  for insert with check (
    exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid())
  );

drop policy if exists questions_update_own on public.questions;
create policy questions_update_own on public.questions
  for update using (
    exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid())
  );

drop policy if exists questions_delete_own on public.questions;
create policy questions_delete_own on public.questions
  for delete using (
    exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid())
  );

-- ---------- responses ----------
drop policy if exists responses_select on public.responses;
create policy responses_select on public.responses
  for select using (
    respondent_id = auth.uid()
    or exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid())
  );

drop policy if exists responses_insert_public on public.responses;
create policy responses_insert_public on public.responses
  for insert with check (
    respondent_id is null or respondent_id = auth.uid()
  );

drop policy if exists responses_delete_own on public.responses;
create policy responses_delete_own on public.responses
  for delete using (
    exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid())
  );

-- updates happen only through the server (service role bypasses RLS)

-- ---------- answers ----------
drop policy if exists answers_select on public.answers;
create policy answers_select on public.answers
  for select using (
    exists (
      select 1 from public.responses r
      join public.forms f on f.id = r.form_id
      where r.id = response_id and (f.owner_id = auth.uid() or r.respondent_id = auth.uid())
    )
  );

drop policy if exists answers_insert_public on public.answers;
create policy answers_insert_public on public.answers
  for insert with check (true);

drop policy if exists answers_delete_own on public.answers;
create policy answers_delete_own on public.answers
  for delete using (
    exists (
      select 1 from public.responses r
      join public.forms f on f.id = r.form_id
      where r.id = response_id and f.owner_id = auth.uid()
    )
  );

-- ---------- uploaded files ----------
drop policy if exists uploaded_files_select_own on public.uploaded_files;
create policy uploaded_files_select_own on public.uploaded_files
  for select using (
    exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid())
  );

drop policy if exists uploaded_files_insert_own on public.uploaded_files;
create policy uploaded_files_insert_own on public.uploaded_files
  for insert with check (
    exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid())
  );

-- ============================================================
-- Storage: private bucket for form uploads (created once)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('form-uploads', 'form-uploads', false)
on conflict (id) do nothing;


-- ==========================================================
-- بخش ۲: جدول تحلیل هوش مصنوعی (0002)
-- ==========================================================

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
