-- ============================================================
-- Arsham Form — Migration 0003: secure-exam identity columns
-- Safe to re-run (idempotent). Run in Supabase SQL editor or CLI.
-- Adds respondent identity captured by the secure-exam gate:
--   respondent_name           «نام و نام خانوادگی»
--   respondent_national_id    normalized 10-digit «کد ملی»
-- The (form_id, respondent_national_id) index powers the
-- one-entry-per-national-ID rule enforced server-side.
-- ============================================================

alter table public.responses
  add column if not exists respondent_name text,
  add column if not exists respondent_national_id text;

create index if not exists idx_responses_form_national_id
  on public.responses (form_id, respondent_national_id);
