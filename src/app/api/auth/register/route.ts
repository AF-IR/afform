import { registerUser } from '@/lib/auth/service'
import { registerSchema } from '@/lib/validation/schemas'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const rl = rateLimit(`register:${clientIp(req)}`, 10, 60_000)
  if (!rl.allowed) return jsonError('درخواست‌های بیش از حد؛ کمی بعد تلاش کنید', 429)

  const body = await readJson<unknown>(req)
  if (!body) return jsonError('درخواست نامعتبر است')

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'ورودی نامعتبر', 422)
  }

  const result = await registerUser({
    displayName: parsed.data.displayName,
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (!result.ok) return jsonError(result.error ?? 'ثبت‌نام ناموفق بود')

  return jsonOk({ needsEmailConfirmation: result.needsEmailConfirmation ?? false })
}
