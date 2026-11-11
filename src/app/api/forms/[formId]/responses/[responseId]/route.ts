import { getCurrentUser } from '@/lib/auth/service'
import { backend } from '@/lib/forms/service'
import { jsonError, jsonOk } from '@/lib/api-helpers'

type Params = { params: Promise<{ formId: string; responseId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  const { formId, responseId } = await params
  try {
    const detail = await backend().getResponseDetail(formId, responseId)
    if (!detail) return jsonError('پاسخ یافت نشد', 404)
    return jsonOk({ response: detail })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'خطا در دریافت پاسخ', 500)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  const { formId, responseId } = await params
  try {
    const deleted = await backend().deleteResponse(formId, responseId)
    if (!deleted) return jsonError('پاسخ یافت نشد', 404)
    return jsonOk()
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'حذف ناموفق بود', 500)
  }
}
