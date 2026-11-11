import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SESSION_COOKIE = 'af_session'

/**
 * Middleware:
 * 1. Refresh Supabase auth session cookies (Supabase mode).
 * 2. Fast UX guard for /dashboard — real verification happens server-side.
 * 3. Add noindex header to private areas.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let hasSession = false

  if (supabaseUrl && supabaseAnon) {
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    })
    try {
      const { data } = await supabase.auth.getUser()
      hasSession = Boolean(data.user)
    } catch {
      hasSession = false
    }
  } else {
    // local mode: cookie presence only (verified properly server-side)
    hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  }

  const { pathname } = request.nextUrl
  const isDashboard = pathname.startsWith('/dashboard')

  if (isDashboard && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (isDashboard) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
}

export const config = {
  matcher: [
    // refresh sessions on app pages; skip static assets
    '/((?!_next/static|_next/image|favicon.ico|api/public|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2)$).*)',
  ],
}
