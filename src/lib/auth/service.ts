import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { isSupabaseConfigured } from '@/lib/env'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  randomToken,
  sha256,
  signSession,
  verifySessionToken,
} from '@/lib/auth/session'
import type { SessionUser } from '@/types'

export interface AuthResult {
  ok: boolean
  error?: string
  needsEmailConfirmation?: boolean
  resetUrl?: string // local preview mode only (no mail server available)
}

function localSecretReady(): boolean {
  return Boolean(process.env.LOCAL_AUTH_SECRET && process.env.LOCAL_AUTH_SECRET.length >= 16)
}

/** Current user for the request (cached per render). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient()
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) return null
      let displayName = (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || 'کاربر'
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()
        if (profile?.display_name) displayName = profile.display_name
      } catch {
        // profiles table may not exist yet — fall back to metadata
      }
      return {
        id: user.id,
        email: user.email ?? '',
        displayName,
        emailVerified: Boolean(user.email_confirmed_at ?? user.confirmed_at),
        createdAt: user.created_at ?? new Date().toISOString(),
      }
    } catch {
      return null
    }
  }

  // local mode
  if (!localSecretReady()) return null
  const store = await cookies()
  const payload = verifySessionToken(store.get(SESSION_COOKIE)?.value)
  if (!payload) return null
  const user = await db.user.findUnique({ where: { id: payload.uid } })
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    emailVerified: true,
    createdAt: user.createdAt.toISOString(),
  }
})

export async function registerUser(input: {
  displayName: string
  email: string
  password: string
}): Promise<AuthResult> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { display_name: input.displayName },
        emailRedirectTo: `${getOrigin()}/auth/callback`,
      },
    })
    if (error) return { ok: false, error: faAuthError(error.message) }
    return { ok: true, needsEmailConfirmation: !data.session && Boolean(data.user) }
  }

  if (!localSecretReady()) {
    return { ok: false, error: 'حالت محلی پیکربندی نشده است (LOCAL_AUTH_SECRET)' }
  }
  const email = input.email.toLowerCase()
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return { ok: false, error: 'این ایمیل قبلاً ثبت شده است' }
  const passwordHash = await bcrypt.hash(input.password, 10)
  await db.user.create({ data: { email, passwordHash, displayName: input.displayName } })
  return { ok: true }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: faAuthError(error.message) }
    return { ok: true }
  }

  if (!localSecretReady()) return { ok: false, error: 'حالت محلی پیکربندی نشده است' }
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { ok: false, error: 'ایمیل یا رمز عبور نادرست است' }
  }
  const { token, maxAge } = signSession({ uid: user.id, email: user.email, name: user.displayName })
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  })
  return { ok: true }
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
    return
  }
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getOrigin()}/auth/callback?next=/reset-password`,
    })
    if (error) return { ok: false, error: faAuthError(error.message) }
    return { ok: true }
  }

  // local preview mode: no mail server — return the link directly (clearly labelled)
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) {
    // do not disclose existence of accounts
    return { ok: true }
  }
  const token = randomToken()
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  })
  return { ok: true, resetUrl: `${getOrigin()}/reset-password?token=${encodeURIComponent(token)}` }
}

export async function resetPasswordWithToken(token: string, password: string): Promise<AuthResult> {
  const tokenHash = sha256(token)
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } })
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, error: 'لینک بازیابی نامعتبر یا منقضی شده است' }
  }
  const passwordHash = await bcrypt.hash(password, 10)
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ])
  return { ok: true }
}

/** Complete password reset for Supabase recovery sessions (used by /reset-password page). */
export async function completePasswordResetSession(password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'این عملیات فقط در حالت Supabase معتبر است' }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false, error: faAuthError(error.message) }
  return { ok: true }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return { ok: false, error: 'ابتدا وارد شوید' }
    // re-verify current password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: data.user.email ?? '',
      password: currentPassword,
    })
    if (verifyError) return { ok: false, error: 'رمز عبور فعلی نادرست است' }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, error: faAuthError(error.message) }
    return { ok: true }
  }

  const sessionUser = await getCurrentUser()
  if (!sessionUser) return { ok: false, error: 'ابتدا وارد شوید' }
  const user = await db.user.findUnique({ where: { id: sessionUser.id } })
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return { ok: false, error: 'رمز عبور فعلی نادرست است' }
  }
  const passwordHash = await bcrypt.hash(newPassword, 10)
  await db.user.update({ where: { id: user.id }, data: { passwordHash } })
  return { ok: true }
}

export async function updateDisplayName(userId: string, displayName: string): Promise<AuthResult> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, display_name: displayName, updated_at: new Date().toISOString() })
    if (error) return { ok: false, error: 'به‌روزرسانی پروفایل ناموفق بود' }
    await supabase.auth.updateUser({ data: { display_name: displayName } })
    return { ok: true }
  }
  await db.user.update({ where: { id: userId }, data: { displayName } })
  return { ok: true }
}

function getOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

function faAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'ایمیل یا رمز عبور نادرست است'
  if (m.includes('already registered')) return 'این ایمیل قبلاً ثبت شده است'
  if (m.includes('rate limit')) return 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید'
  if (m.includes('password') && m.includes('weak') ) return 'رمز عبور ضعیف است'
  if (m.includes('email not confirmed')) return 'ایمیل شما تأیید نشده است؛ صندوق ورودی خود را بررسی کنید'
  if (m.includes('session not found') || m.includes('refresh_token')) return 'نشست شما منقضی شده است؛ دوباره وارد شوید'
  return message
}

export { SESSION_COOKIE, SESSION_MAX_AGE }
