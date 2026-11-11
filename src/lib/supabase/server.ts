import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Supabase client for Server Components / Route Handlers (cookie-based session). */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase env vars are missing')

  const cookieStore = await cookies()

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // called from a Server Component — session refresh happens in middleware
        }
      },
    },
  })
}
