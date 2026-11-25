import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth/service'
import { backend, submitResponse, getRespondentKey } from '@/lib/forms/service'
import { submitSchema } from '@/lib/validation/schemas'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { doneCookieName, signDoneToken } from '@/lib/exam/attempt'
import type { SubmitMeta } from '@/lib/forms/service'

type Params = { params: Promise<{ publicId: string }> }

const isProd = process.env.NODE_ENV === 'production'

const STATUS_MESSAGES: Record<string, string> = {
  not_found: 'فرم یافت نشد',
  not_published: 'این فرم هنوز منتشر نشده است',
  not_started: 'زمان شروع این فرم هنوز نرسیده است',
  closed: 'این فرم بسته شده است یا مهلت آن به پایان رسیده است',
  limit_reached: 'سقف تعداد پاسخ‌های این فرم پر شده است',
  max_attempts: 'شما قبلاً در این آزمون شرکت کرده‌اید و شرکت دوباره مجاز نیست',
  already_participated: 'شما قبلاً در این آزمون شرکت کرده‌اید و شرکت دوباره مجاز نیست',
  time_expired: 'زمان آزمون به پایان رسیده است و پاسخ شما پذیرفته نشد',
  login_required: 'برای پاسخ‌دادن به این فرم ابتدا وارد حساب خود شوید',
  identity_not_allowed: 'این کد ملی در لیست مجاز این آزمون ثبت نشده است',
  identity_already_used: 'با این کد ملی قبلاً در آزمون شرکت شده است و ورود دوباره مجاز نیست',
  account_invalid: 'نام کاربری یا رمز عبور نادرست است',
  account_already_used: 'این اکانت قبلاً در آزمون شرکت کرده است',
  validation: 'برخی پاسخ‌ها معتبر نیستند',
  server: 'خطای سرور؛ دوباره تلاش کنید',
}

/** Public submit — full server-side validation; browser data is never trusted. */
export async function POST(req: Request, { params }: Params) {
  const rl = rateLimit(`submit:${clientIp(req)}`, 10, 60_000)
  if (!rl.allowed) {
    return jsonError('تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید', 429, { code: 'rate_limited' })
  }

  const { publicId } = await params

  const body = await readJson<Record<string, unknown>>(req, 1024 * 1024)
  if (!body) return jsonError('حجم یا ساختار درخواست نامعتبر است', 413)

  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) return jsonError('ساختار پاسخ نامعتبر است', 422)

  try {
    const form = await backend().getFormByPublicId(publicId)
    if (!form) return jsonError('فرم یافت نشد', 404)

    const sessionUser = await getCurrentUser()
    const meta: SubmitMeta = { ip: clientIp(req), userAgent: req.headers.get('user-agent') ?? '', sessionUser }

    const outcome = await submitResponse(form, parsed.data, meta)
    if (!outcome.ok) {
      const status = outcome.code === 'validation'
        ? 422
        : outcome.code === 'identity_not_allowed' || outcome.code === 'identity_already_used'
          ? 403
          : outcome.code === 'account_invalid'
            ? 401
            : outcome.code === 'time_expired'
              ? 410
              : 409
      const res = jsonError(
        outcome.message ?? STATUS_MESSAGES[outcome.code ?? 'server'] ?? 'ثبت پاسخ ناموفق بود',
        status,
        { code: outcome.code, fieldErrors: outcome.fieldErrors ?? {} },
      )
      // exhausted quota / used identity → permanently mark this browser so the
      // exam can no longer be re-entered from the public link
      if (outcome.code === 'max_attempts' || outcome.code === 'identity_already_used') {
        res.cookies.set({
          name: doneCookieName(publicId),
          value: signDoneToken(form.id, getRespondentKey(meta)),
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: isProd,
          maxAge: 60 * 60 * 24 * 30,
        })
      }
      return res
    }

    const res = jsonOk({
      responseId: outcome.responseId,
      thankYouMessage: outcome.thankYouMessage,
      result: outcome.result,
      edited: outcome.edited ?? false,
    })
    // quiz completed (fresh submission, not an edit) → cookie-based re-entry block
    if (form.formType === 'quiz' && !form.settings.allowResponseEdit && !outcome.edited) {
      res.cookies.set({
        name: doneCookieName(publicId),
        value: signDoneToken(form.id, getRespondentKey(meta)),
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
        maxAge: 60 * 60 * 24 * 30,
      })
    }
    return res
  } catch (e) {
    console.error('public submit error:', e instanceof Error ? `${e.message}\n${e.stack}` : e)
    return jsonError('خطای سرور در ثبت پاسخ', 500)
  }
}
