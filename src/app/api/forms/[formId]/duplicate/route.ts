import { getCurrentUser } from '@/lib/auth/service'
import { backend } from '@/lib/forms/service'
import { jsonError, jsonOk } from '@/lib/api-helpers'

type Params = { params: Promise<{ formId: string }> }

export async function POST(_req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  const { formId } = await params
  try {
    const form = await backend().duplicateForm(formId, user.id)
    if (!form) return jsonError('فرم یافت نشد', 404)
    return jsonOk({ form })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'کپی ناموفق بود', 500)
  }
}
