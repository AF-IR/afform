import { backend, startAttempt, getRespondentKey, checkIdentityGate } from '@/lib/forms/service'
import { getCurrentUser } from '@/lib/auth/service'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { startExamSchema } from '@/lib/validation/schemas'
import type { SubmitMeta } from '@/lib/forms/service'

type Params = { params: Promise<{ publicId: string }> }

/**
 * Start a quiz attempt: issues a signed, server-timestamped attempt token.
 * The remaining time is validated against the server clock on submit —
 * the browser clock is never trusted.
 *
 * Secure-exam forms validate the identity gate here too, so an unauthorized
 * or already-used national ID fails BEFORE the exam timer starts.
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

    // secure-exam identity pre-check (best-effort UX — submit re-validates)
    if (form.settings.identityGate?.enabled) {
      const body = (await readJson<Record<string, unknown>>(req, 16 * 1024)) ?? {}
      const parsed = startExamSchema.safeParse(body)
      const gate = await checkIdentityGate(
        form.id,
        form.settings.identityGate,
        parsed.success ? parsed.data.identity : undefined,
        false,
      )
      if (!gate.ok) {
        return jsonError(gate.message, gate.code === 'identity_not_allowed' || gate.code === 'identity_already_used' ? 403 : 422, {
          code: gate.code,
          fieldErrors: gate.fieldErrors ?? {},
        })
      }
    }

    const { token, serverNow } = startAttempt(form, meta)
    return jsonOk({ attemptToken: token, serverNow })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'خطا در شروع آزمون', 500)
  }
}
