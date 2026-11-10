import { requestPasswordReset } from '@/lib/auth/service'
import { forgotPasswordSchema } from '@/lib/validation/schemas'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const rl = rateLimit(`forgot:${clientIp(req)}`, 5, 60_000)
  if (!rl.allowed) return jsonError('درخواست‌های بیش از حد؛ کمی بعد تلاش کنید', 429)

  const body = await readJson<unknown>(req)
  if (!body) return jsonError('درخواست نامعتبر است')

  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'ورودی نامعتبر', 422)

  const result = await requestPasswordReset(parsed.data.email)
  if (!result.ok) return jsonError(result.error ?? 'عملیات ناموفق بود')

  return jsonOk({
    // local preview mode only: no mail server, so the link is returned directly
    resetUrl: result.resetUrl ?? null,
    message: result.resetUrl
      ? 'در حالت پیش‌نمایش محلی امکان ارسال ایمیل وجود ندارد؛ لینک بازیابی زیر ساخته شد:'
      : 'اگر این ایمیل ثبت شده باشد، لینک بازیابی برای شما ارسال می‌شود.',
  })
}
