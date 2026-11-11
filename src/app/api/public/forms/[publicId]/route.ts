import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth/service'
import { backend, getRespondentKey } from '@/lib/forms/service'
import { jsonError, jsonOk } from '@/lib/api-helpers'
import type { SubmitMeta } from '@/lib/forms/service'
import { clientIp } from '@/lib/rate-limit'

type Params = { params: Promise<{ publicId: string }> }

/** Public form read — returns everything needed to render, nothing private. */
export async function GET(_req: Request, { params }: Params) {
  const { publicId } = await params
  try {
    const form = await backend().getFormByPublicId(publicId)
    if (!form) return jsonError('فرم یافت نشد', 404)
    if (form.status === 'draft') return jsonError('این فرم هنوز منتشر نشده است', 403)

    const sessionUser = await getCurrentUser()
    const meta: SubmitMeta = { ip: clientIp(_req), userAgent: _req.headers.get('user-agent') ?? '', sessionUser }
    const rk = getRespondentKey(meta)

    // stable anonymous respondent key (httpOnly, no personal data inside)
    const store = await cookies()
    if (!store.get('af_rk')) {
      store.set('af_rk', rk, {
        httpOnly: true, sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/', maxAge: 60 * 60 * 24 * 365,
      })
    }

    return jsonOk({
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        formType: form.formType,
        status: form.status,
        settings: form.settings,
      },
      questions: form.questions,
      serverNow: Date.now(),
      requiresLogin: !form.settings.allowAnonymous && !sessionUser,
    })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'خطا در دریافت فرم', 500)
  }
}
