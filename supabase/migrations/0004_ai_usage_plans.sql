-- ============================================================
-- Arsham Form — Migration 0004: AI usage tracking & plans
-- مصرف روزانهٔ هوش مصنوعی در Supabase ذخیره می‌شود:
--   * کاربران پلن رایگان: ۲ ساخت پرسش‌نامه + ۲ تحلیل در روز
--   * کاربران پلن حرفه‌ای (pro): بدون سقف روزانه (مصرف همچنان ثبت می‌شود)
-- تاریخِ روزِ مصرفی بر اساس منطقهٔ زمانی Asia/Tehran در لایهٔ اپلیکیشن
-- محاسبه و در ستون usage_date ذخیره می‌شود.
-- ============================================================

-- ---------- plan on profiles ----------
alter table public.profiles
  add column if not exists plan text not null default 'free';

-- فقط دو مقدار معتبر (free / pro)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_plan_check'
  ) then
    alter table public.profiles
      add constraint profiles_plan_check check (plan in ('free', 'pro'));
  end if;
end $$;

-- ---------- ai_usage (one row per user per day) ----------
create table if not exists public.ai_usage (
  user_id         uuid not null references auth.users (id) on delete cascade,
  usage_date      date not null default current_date,
  generated_count integer not null default 0,  -- تعداد ساخت پرسش‌نامه با هوش مصنوعی
  analysis_count  integer not null default 0,  -- تعداد تحلیل نتایج با هوش مصنوعی
  updated_at      timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ai_usage enable row level security;

-- هر کاربر فقط مصرف خودش را می‌بیند
create policy "ai_usage_owner_select" on public.ai_usage
  for select to authenticated
  using (user_id = auth.uid());

-- ثبت/افزایش مصرف فقط از سمت سرور (service-role) انجام می‌شود؛
-- برای کاربران عادی نوشتن ممنوع است تا سهمیه‌ها دور زده نشوند.
