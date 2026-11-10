import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth/service'
import { backend, submitResponse } from '@/lib/forms/service'
import { submitSchema } from '@/lib/validation/schemas'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import type { SubmitMeta } from '@/lib/forms/service'

type Params = { params: Promise<{ publicId: string }> }

const STATUS_MESSAGES: Record<string, string> = {
  not_found: 'فرم یافت نشد',
  not_published: 'این فرم هنوز منتشر نشده است',
  not_started: 'زمان شروع این فرم هنوز نرسیده است',
  closed: 'این فرم بسته شده است یا مهلت آن به پایان رسیده است',
  limit_reached: 'سقف تعداد پاسخ‌های این فرم پر شده است',
  max_attempts: 'تعداد تلاش‌های مجاز شما به پایان رسیده است',
  time_expired: 'زمان آزمون به پایان رسیده است و پاسخ شما پذیرفته نشد',
  login_required: 'برای پاسخ‌دادن به این فرم ابتدا وارد حساب خود شوید',
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
      return jsonError(outcome.message ?? STATUS_MESSAGES[outcome.code ?? 'server'] ?? 'ثبت پاسخ ناموفق بود', outcome.code === 'validation' ? 422 : 409, {
        code: outcome.code,
        fieldErrors: outcome.fieldErrors ?? {},
      })
    }

    return jsonOk({
      responseId: outcome.responseId,
      thankYouMessage: outcome.thankYouMessage,
      result: outcome.result,
      edited: outcome.edited ?? false,
    })
  } catch (e) {
    console.error('public submit error:', e instanceof Error ? e.message : e)
    return jsonError('خطای سرور در ثبت پاسخ', 500)
  }
}
