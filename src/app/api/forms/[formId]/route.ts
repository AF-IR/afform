import { getCurrentUser } from '@/lib/auth/service'
import { backend } from '@/lib/forms/service'
import { formUpdateSchema } from '@/lib/validation/schemas'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'

type Params = { params: Promise<{ formId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  const { formId } = await params
  try {
    const form = await backend().getForm(formId, user.id)
    if (!form) return jsonError('فرم یافت نشد', 404)
    return jsonOk({ form })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'خطا در دریافت فرم', 500)
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  const { formId } = await params

  const body = await readJson<unknown>(req)
  if (!body) return jsonError('درخواست نامعتبر است')

  const parsed = formUpdateSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'ورودی نامعتبر', 422)

  try {
    const form = await backend().updateForm(formId, user.id, parsed.data)
    if (!form) return jsonError('فرم یافت نشد', 404)
    return jsonOk({ form })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'به‌روزرسانی ناموفق بود', 500)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  const { formId } = await params
  try {
    const deleted = await backend().deleteForm(formId, user.id)
    if (!deleted) return jsonError('فرم یافت نشد', 404)
    return jsonOk()
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'حذف ناموفق بود', 500)
  }
}
