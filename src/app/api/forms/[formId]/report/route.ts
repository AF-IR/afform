import { getCurrentUser } from '@/lib/auth/service'
import { backend, buildFormReport } from '@/lib/forms/service'
import { jsonError, jsonOk } from '@/lib/api-helpers'

type Params = { params: Promise<{ formId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  const { formId } = await params
  try {
    const form = await backend().getForm(formId, user.id)
    if (!form) return jsonError('فرم یافت نشد', 404)
    const report = await buildFormReport(form)
    return jsonOk({ report })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'خطا در تولید گزارش', 500)
  }
}
