import { getCurrentUser } from '@/lib/auth/service'
import { backend } from '@/lib/forms/service'
import { jsonError, jsonOk } from '@/lib/api-helpers'

type Params = { params: Promise<{ formId: string }> }

export async function GET(req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  const { formId } = await params

  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '25') || 25))
  const order = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc'
  const from = url.searchParams.get('from') ?? undefined
  const to = url.searchParams.get('to') ?? undefined
  const q = (url.searchParams.get('q') ?? '').trim()

  try {
    const form = await backend().getForm(formId, user.id)
    if (!form) return jsonError('فرم یافت نشد', 404)

    let ids: string[] | undefined
    if (q) {
      const matched = await backend().searchResponseIds(formId, q)
      if (!matched.length) return jsonOk({ rows: [], total: 0, page, limit, questions: form.questions })
      ids = matched
    }

    const { rows, total } = await backend().listResponses(formId, {
      from, to, ids, order,
      offset: (page - 1) * limit,
      limit,
    })
    return jsonOk({ rows, total, page, limit, questions: form.questions })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'خطا در دریافت پاسخ‌ها', 500)
  }
}
