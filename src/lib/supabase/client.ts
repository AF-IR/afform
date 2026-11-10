'use client'

import { createBrowserClient } from '@supabase/ssr'

/** Browser Supabase client — only public (anon) key is used, never service role. */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase env vars are missing')
  return createBrowserClient(url, anon)
}
