import { getCurrentUser } from '@/lib/auth/service'
import { backend, getRespondentKey } from '@/lib/forms/service'
import { jsonOk } from '@/lib/api-helpers'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { attemptCookieName, doneCookieName, verifyAttemptToken, verifyDoneToken, signDoneToken, examDeadline, isAttemptExpired } from '@/lib/exam/attempt'
import type { SubmitMeta } from '@/lib/forms/service'

type Params = { params: Promise<{ publicId: string }> }

const isProd = process.env.NODE_ENV === 'production'

type AttemptStatus =
  | { status: 'none' }
  | { status: 'done' }
  | { status: 'expired' }
  | { status: 'active'; attemptToken: string; deadline: number; serverNow: number }

/**
 * Passive exam-status probe — read-only, no side effects.
 *
 * The public form page calls this once on load to decide which screen to show:
 * - `active`  → an in-flight attempt exists (cookie): resume it and keep the
 *               original deadline, so reloading never resets the timer.
 * - `done`    → completion cookie or exhausted attempt quota (server-checked):
 *               show «قبلاً شرکت کرده‌اید» instead of the questions.
 * - `expired` → the attempt window is over (timer kept running while away).
 * - `none`    → nothing started yet (start screen / identity card / direct form).
 */
export async function GET(req: Request, { params }: Params) {
  const rl = rateLimit(`attempt:${clientIp(req)}`, 60, 60_000)
  if (!rl.allowed) return jsonOk({ status: 'none' })

  const { publicId } = await params
  try {
    const form = await backend().getFormByPublicId(publicId)
    if (!form || form.status !== 'published') return jsonError404()

    if (form.formType !== 'quiz') return jsonOk({ status: 'none' } satisfies AttemptStatus)

    const sessionUser = await getCurrentUser()
    const meta: SubmitMeta = { ip: clientIp(req), userAgent: req.headers.get('user-agent') ?? '', sessionUser }
    const respondentKeyValue = getRespondentKey(meta)

    const s = form.settings
    const timeLimit = s.timeLimitMinutes
    const maxAttempts = s.maxAttempts ?? 1
    const cookies = Object.fromEntries(
      (req.headers.get('cookie') ?? '')
        .split(';')
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => {
          const i = c.indexOf('=')
          return [c.slice(0, i), c.slice(i + 1)]
        }),
    ) as Record<string, string>

    // completion cookie → definitively done (unless the owner allows edits)
    if (verifyDoneToken(cookies[doneCookieName(publicId)], form.id, respondentKeyValue) && !s.allowResponseEdit) {
      return jsonOk({ status: 'done' } satisfies AttemptStatus)
    }

    // server-side attempt count (covers cookie-less / cleared-cookie visitors)
    if (!s.allowResponseEdit) {
      const attempts = await backend().countAttempts(form.id, respondentKeyValue)
      if (attempts >= maxAttempts) {
        const res = jsonOk({ status: 'done' } satisfies AttemptStatus)
        res.cookies.set({
          name: doneCookieName(publicId),
          value: signDoneToken(form.id, respondentKeyValue),
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: isProd,
          maxAge: 60 * 60 * 24 * 30,
        })
        return res
      }
    }

    // in-flight attempt cookie
    const existing = verifyAttemptToken(cookies[attemptCookieName(publicId)])
    if (existing && existing.formId === form.id && existing.key === respondentKeyValue && timeLimit) {
      if (isAttemptExpired(existing.startedAt, timeLimit, Date.now())) {
        const res = jsonOk({ status: 'expired' } satisfies AttemptStatus)
        res.cookies.set({ name: attemptCookieName(publicId), value: '', httpOnly: true, sameSite: 'lax', path: '/', secure: isProd, maxAge: 0 })
        return res
      }
      return jsonOk({
        status: 'active',
        attemptToken: cookies[attemptCookieName(publicId)],
        deadline: examDeadline(existing.startedAt, timeLimit),
        serverNow: Date.now(),
      } satisfies AttemptStatus)
    }

    return jsonOk({ status: 'none' } satisfies AttemptStatus)
  } catch (e) {
    console.error('exam attempt probe failed:', e instanceof Error ? e.message : e)
    return jsonOk({ status: 'none' })
  }
}

function jsonError404() {
  return new Response(JSON.stringify({ ok: false, error: 'فرم در دسترس نیست' }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  })
}
