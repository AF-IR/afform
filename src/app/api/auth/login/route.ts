import { signIn } from '@/lib/auth/service'
import { loginSchema } from '@/lib/validation/schemas'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const rl = rateLimit(`login:${clientIp(req)}`, 15, 60_000)
  if (!rl.allowed) return jsonError('تلاش‌های زیاد برای ورود؛ کمی بعد دوباره امتحان کنید', 429)

  const body = await readJson<unknown>(req)
  if (!body) return jsonError('درخواست نامعتبر است')

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'ورودی نامعتبر', 422)

  const result = await signIn(parsed.data.email, parsed.data.password)
  if (!result.ok) return jsonError(result.error ?? 'ورود ناموفق بود', 401)

  return jsonOk()
}
