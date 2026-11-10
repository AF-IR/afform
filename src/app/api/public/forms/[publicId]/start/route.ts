import { backend, startAttempt } from '@/lib/forms/service'
import { getCurrentUser } from '@/lib/auth/service'
import { jsonError, jsonOk } from '@/lib/api-helpers'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import type { SubmitMeta } from '@/lib/forms/service'

type Params = { params: Promise<{ publicId: string }> }

/**
 * Start a quiz attempt: issues a signed, server-timestamped attempt token.
 * The remaining time is validated against the server clock on submit —
 * the browser clock is never trusted.
 */
export async function POST(req: Request, { params }: Params) {
  const rl = rateLimit(`start:${clientIp(req)}`, 30, 60_000)
  if (!rl.allowed) return jsonError('درخواست‌های بیش از حد', 429)

  const { publicId } = await params
  try {
    const form = await backend().getFormByPublicId(publicId)
    if (!form || form.status !== 'published') return jsonError('فرم در دسترس نیست', 404)

    const sessionUser = await getCurrentUser()
    const meta: SubmitMeta = { ip: clientIp(req), userAgent: req.headers.get('user-agent') ?? '', sessionUser }
    const { token, serverNow } = startAttempt(form, meta)
    return jsonOk({ attemptToken: token, serverNow })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'خطا در شروع آزمون', 500)
  }
}
