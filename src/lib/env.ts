/**
 * Runtime backend mode.
 * - "supabase": real production mode (Supabase Auth + PostgreSQL + RLS).
 *   Activated when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
 * - "local": local preview mode (SQLite via Prisma + signed-cookie sessions).
 *   Used when Supabase env vars are not configured yet (e.g. sandbox preview).
 *
 * NOTE: reads only NEXT_PUBLIC_* vars — safe for both client and server bundles.
 */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

export function backendMode(): 'supabase' | 'local' {
  return isSupabaseConfigured() ? 'supabase' : 'local'
}

export const SUPABASE_MISSING_MESSAGE =
  'اتصال به Supabase برقرار نشد. متغیرهای NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY را طبق راهنمای استقرار تنظیم کنید.'
