import { getCurrentUser } from '@/lib/auth/service'
import { backend, newPublicId } from '@/lib/forms/service'
import { instantiateTemplate, templateById } from '@/lib/templates/data'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'

/** Create an independent, editable copy of a public template. */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)

  const body = await readJson<{ templateId?: string }>(req)
  if (!body?.templateId) return jsonError('شناسه قالب الزامی است', 422)

  const tpl = templateById(body.templateId)
  if (!tpl) return jsonError('قالب یافت نشد', 404)

  try {
    const form = await backend().createForm(user.id, {
      title: tpl.title,
      description: tpl.description,
      formType: tpl.formType,
      publicId: newPublicId(),
    })
    await backend().saveQuestions(form.id, user.id, instantiateTemplate(tpl))
    return jsonOk({ form })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'ایجاد فرم از قالب ناموفق بود', 500)
  }
}
