import { getCurrentUser, completePasswordResetSession, resetPasswordWithToken } from '@/lib/auth/service'
import { resetPasswordSchema } from '@/lib/validation/schemas'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Two flows:
 * - Supabase mode: the recovery link creates a session; the new password is set for it.
 * - Local mode: a one-time token from the reset link is passed in the body.
 */
export async function POST(req: Request) {
  const rl = rateLimit(`reset:${clientIp(req)}`, 10, 60_000)
  if (!rl.allowed) return jsonError('درخواست‌های بیش از حد؛ کمی بعد تلاش کنید', 429)

  const body = await readJson<{ token?: string } & Record<string, unknown>>(req)
  if (!body) return jsonError('درخواست نامعتبر است')

  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'ورودی نامعتبر', 422)

  if (body.token) {
    const result = await resetPasswordWithToken(body.token, parsed.data.password)
    if (!result.ok) return jsonError(result.error ?? 'عملیات ناموفق بود')
    return jsonOk({ message: 'رمز عبور با موفقیت تغییر کرد؛ اکنون وارد شوید.' })
  }

  const user = await getCurrentUser()
  if (!user) return jsonError('نشست بازیابی یافت نشد؛ لینک را دوباره باز کنید', 401)
  const result = await completePasswordResetSession(parsed.data.password)
  if (!result.ok) return jsonError(result.error ?? 'عملیات ناموفق بود')
  return jsonOk({ message: 'رمز عبور با موفقیت تغییر کرد.' })
}
