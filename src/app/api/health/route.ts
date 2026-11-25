import { NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/env'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health — deployment self-check (public, read-only).
 *
 * Verifies that the production Supabase schema contains every table and
 * column the application writes to. After running
 * `supabase/migrations/all-in-one.sql` in the SQL editor, this endpoint must
 * return ok: true. A missing table/column here is exactly what makes public
 * response submission fail with «خطای سرور» (PostgREST 500).
 */

const REQUIRED_TABLES = ['forms', 'questions', 'responses', 'answers', 'uploaded_files', 'ai_analyses', 'ai_usage'] as const

const REQUIRED_COLUMNS: { table: string; columns: string[]; label: string }[] = [
  {
    table: 'responses',
    columns: ['respondent_key', 'total_score', 'max_score', 'passed', 'attempt_number', 'started_at', 'respondent_name', 'respondent_national_id'],
    label: 'ستون‌های آزمون امن (کد ملی، نمره، تلاش)',
  },
  {
    table: 'forms',
    columns: ['public_id', 'form_type', 'settings', 'published_at'],
    label: 'ستون‌های فرم',
  },
  {
    table: 'profiles',
    columns: ['plan'],
    label: 'پلن کاربر (سهمیه هوش مصنوعی)',
  },
  {
    table: 'ai_analyses',
    columns: ['analysis', 'model', 'responses_count'],
    label: 'تحلیل هوش مصنوعی',
  },
  {
    table: 'ai_usage',
    columns: ['generated_count', 'analysis_count'],
    label: 'مصرف روزانه هوش مصنوعی',
  },
]

interface CheckResult {
  name: string
  ok: boolean
  error?: string
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      mode: 'local',
      message: 'حالت محلی (Prisma) فعال است؛ بررسی اسکیما فقط در حالت Supabase معنا دارد.',
    }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
  }

  try {
    const { adminClient } = await import('@/lib/forms/backend-supabase')
    const admin = adminClient()

    const checks: CheckResult[] = []

    for (const table of REQUIRED_TABLES) {
      const { error } = await admin.from(table).select('id', { count: 'exact', head: true })
      checks.push({ name: `جدول ${table}`, ok: !error, error: error?.message })
    }

    for (const spec of REQUIRED_COLUMNS) {
      const { error } = await admin.from(spec.table).select(spec.columns.join(', '), { count: 'exact', head: true })
      checks.push({ name: spec.label, ok: !error, error: error?.message })
    }

    const missing = checks.filter((c) => !c.ok)
    return NextResponse.json({
      ok: missing.length === 0,
      mode: 'supabase',
      checks,
      ...(missing.length > 0
        ? {
            fix: 'اسکیمای دیتابیس کامل نیست. فایل supabase/migrations/all-in-one.sql را در Supabase SQL Editor اجرا کنید و سپس این صفحه را دوباره باز کنید.',
          }
        : {}),
    }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      mode: 'supabase',
      checks: [],
      error: e instanceof Error ? e.message : 'خطای ناشناخته در اتصال به دیتابیس',
      fix: 'متغیرهای محیطی Supabase (NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY) را در Vercel بررسی کنید.',
    }, { status: 500, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
  }
}
