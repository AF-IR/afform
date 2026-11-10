import { getCurrentUser } from '@/lib/auth/service'
import { backend, newPublicId } from '@/lib/forms/service'
import { formCreateSchema } from '@/lib/validation/schemas'
import { instantiateTemplate, templateById } from '@/lib/templates/data'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'
import type { Question } from '@/types'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  try {
    const forms = await backend().listForms(user.id)
    return jsonOk({ forms })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'خطا در دریافت فرم‌ها', 500)
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)

  const body = await readJson<unknown>(req)
  if (!body) return jsonError('درخواست نامعتبر است')

  const parsed = formCreateSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'ورودی نامعتبر', 422)

  try {
    let questions: Question[] | undefined
    let { title, description, formType } = parsed.data

    if (parsed.data.templateId) {
      const tpl = templateById(parsed.data.templateId)
      if (!tpl) return jsonError('قالب یافت نشد', 404)
      title = title || tpl.title
      description = description || tpl.description
      formType = tpl.formType
      questions = instantiateTemplate(tpl)
    }

    const form = await backend().createForm(user.id, {
      title,
      description,
      formType,
      publicId: newPublicId(),
    })
    if (questions?.length) {
      await backend().saveQuestions(form.id, user.id, questions)
    }
    return jsonOk({ form })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'ایجاد فرم ناموفق بود', 500)
  }
}
