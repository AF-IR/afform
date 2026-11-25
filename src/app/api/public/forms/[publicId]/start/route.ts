import { getCurrentUser } from '@/lib/auth/service'
import { backend, getRespondentKey, checkIdentityGate, checkExamAccountGate } from '@/lib/forms/service'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { startExamSchema } from '@/lib/validation/schemas'
import { attemptCookieName, doneCookieName, signAttemptToken, verifyAttemptToken, signDoneToken, examDeadline, isAttemptExpired, EXAM_GRACE_SEC } from '@/lib/exam/attempt'
import type { SubmitMeta } from '@/lib/forms/service'

type Params = { params: Promise<{ publicId: string }> }

const isProd = process.env.NODE_ENV === 'production'

/**
 * Start (or resume) a quiz attempt.
 *
 * - The attempt token is signed with the SERVER clock; the browser clock is
 *   never trusted. The deadline is returned pre-computed so every device and
 *   every reload shows exactly the same remaining time.
 * - The attempt lives in an HttpOnly cookie → reloading, navigating away and
 *   coming back RESUMES the same attempt (timer keeps running — restarting is
 *   not possible without clearing cookies, and even then the server rejects
 *   submissions without a valid started token).
 * - Re-entry guard: once the attempt quota (default 1 for quizzes) is used,
 *   the start endpoint refuses to issue a new token and marks the browser
 *   with a completion cookie, so the participant sees «قبلاً شرکت کرده‌اید».
 * - Secure-exam forms validate the identity gate here too, so an unauthorized
 *   or already-used national ID fails BEFORE the exam timer starts.
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
    let respondentKeyValue = getRespondentKey(meta)

    const s = form.settings
    const isQuiz = form.formType === 'quiz'
    const timeLimit = isQuiz ? s.timeLimitMinutes : null
    const maxAttempts = isQuiz ? (s.maxAttempts ?? 1) : null

    // ---- exam access account gate (creator-defined username/password) ----
    // The attempt is keyed on the ACCOUNT: the one-attempt rule, the attempt
    // token and the done cookie all bind to the account — on every device.
    const body0 = (await readJson<Record<string, unknown>>(req, 16 * 1024)) ?? {}
    const examCreds = (body0 as { exam?: { username?: string; password?: string } }).exam
    const accountGate = checkExamAccountGate(s, examCreds)
    if (!accountGate.ok) {
      return jsonError(accountGate.message, 401, { code: accountGate.code, fieldErrors: { __exam: accountGate.message } })
    }
    if (accountGate.key) respondentKeyValue = accountGate.key

    const doneCookie = doneCookieName(publicId)
    const attemptCookie = attemptCookieName(publicId)

    const setDoneCookie = (res: ReturnType<typeof jsonOk> | ReturnType<typeof jsonError>) => {
      res.cookies.set({
        name: doneCookie,
        value: signDoneToken(form.id, respondentKeyValue),
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
      return res
    }

    // ---- re-entry guard (server-authoritative; independent of cookies) ----
    if (isQuiz && maxAttempts !== null && !s.allowResponseEdit) {
      const attempts = await backend().countAttempts(form.id, respondentKeyValue)
      if (attempts >= maxAttempts) {
        return setDoneCookie(jsonError(
          'شما قبلاً در این آزمون شرکت کرده‌اید و شرکت دوباره مجاز نیست',
          403,
          { code: 'already_participated' },
        ))
      }
    }

    // ---- resume an in-flight attempt from the cookie ----
    const rawAttempt = req.headers
      .get('cookie')
      ?.split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${attemptCookie}=`))
      ?.slice(attemptCookie.length + 1)

    const existing = verifyAttemptToken(rawAttempt)
    if (existing && existing.formId === form.id && existing.key === respondentKeyValue && timeLimit) {
      if (isAttemptExpired(existing.startedAt, timeLimit, Date.now())) {
        const res = jsonError('زمان آزمون به پایان رسیده است؛ امکان ادامه یا ثبت پاسخ نیست', 410, { code: 'time_expired' })
        res.cookies.set({ name: attemptCookie, value: '', httpOnly: true, sameSite: 'lax', path: '/', secure: isProd, maxAge: 0 })
        return res
      }
      const deadline = examDeadline(existing.startedAt, timeLimit)
      return jsonOk({
        attemptToken: rawAttempt,
        serverNow: Date.now(),
        startedAt: existing.startedAt,
        deadline,
        resumed: true,
      })
    }

    // ---- secure-exam identity pre-check (best-effort UX — submit re-validates) ----
    if (s.identityGate?.enabled) {
      const parsed = startExamSchema.safeParse(body0)
      const gate = await checkIdentityGate(
        form.id,
        s.identityGate,
        parsed.success ? parsed.data.identity : undefined,
        false,
      )
      if (!gate.ok) {
        const res = jsonError(gate.message, gate.code === 'identity_not_allowed' || gate.code === 'identity_already_used' ? 403 : 422, {
          code: gate.code,
          fieldErrors: gate.fieldErrors ?? {},
        })
        // a used national ID permanently blocks this browser from re-entering
        if (gate.code === 'identity_already_used') setDoneCookie(res)
        return res
      }
    }

    // ---- account-level attempt guard (server-side, device independent) ----
    // When the exam uses access accounts, the one-attempt rule binds to the
    // account key — so a second login from ANY device is refused.
    if (isQuiz && accountGate.key && maxAttempts !== null && !s.allowResponseEdit) {
      const attempts = await backend().countAttempts(form.id, accountGate.key)
      if (attempts >= maxAttempts) {
        return setDoneCookie(jsonError(
          'این اکانت قبلاً در آزمون شرکت کرده است؛ ورود دوباره مجاز نیست',
          403,
          { code: 'already_participated' },
        ))
      }
    }

    // ---- fresh start ----
    if (timeLimit) {
      const startedAt = Date.now()
      const token = signAttemptToken({ formId: form.id, startedAt, key: respondentKeyValue })
      const res = jsonOk({
        attemptToken: token,
        serverNow: startedAt,
        startedAt,
        deadline: examDeadline(startedAt, timeLimit),
        resumed: false,
      })
      res.cookies.set({
        name: attemptCookie,
        value: token,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
        maxAge: timeLimit * 60 + EXAM_GRACE_SEC + 600,
      })
      return res
    }

    // untimed quiz / gated form: nothing to sign — the guard above already ran
    return jsonOk({ serverNow: Date.now(), resumed: false })
  } catch (e) {
    console.error('exam start failed:', e instanceof Error ? `${e.message}\n${e.stack}` : e)
    return jsonError('خطا در شروع آزمون؛ دوباره تلاش کنید', 500)
  }
}
