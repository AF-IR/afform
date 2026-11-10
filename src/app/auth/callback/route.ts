import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Supabase auth callback — exchanges the PKCE `code` from confirmation /
 * recovery links for a session, then redirects to `next` or the dashboard.
 * In local preview mode this route simply redirects (no Supabase configured).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) return NextResponse.redirect(`${origin}/login`)

  if (code) {
    const cookieStore = request.cookies
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => cookieStore.set(name, value))
        },
      },
    })
    try {
      await supabase.auth.exchangeCodeForSession(code)
    } catch {
      return NextResponse.redirect(`${origin}/login?error=callback`)
    }
  }

  return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/dashboard'}`)
}
