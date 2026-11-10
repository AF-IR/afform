import { getCurrentUser } from '@/lib/auth/service'
import { backend } from '@/lib/forms/service'
import { questionsPayloadSchema } from '@/lib/validation/schemas'
import { ruleReferencesEarlierQuestion } from '@/lib/forms/conditional'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'

type Params = { params: Promise<{ formId: string }> }

/** Bulk-save the full question list of a form (single source of truth). */
export async function PUT(req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  const { formId } = await params

  const body = await readJson<unknown>(req)
  if (!body) return jsonError('حجم یا ساختار درخواست نامعتبر است')

  const parsed = questionsPayloadSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'ساختار سؤال‌ها نامعتبر است'
    return jsonError(msg, 422)
  }

  // conditional rules may only reference earlier questions
  const sorted = [...parsed.data.questions].sort((a, b) => a.position - b.position)
  for (const q of sorted) {
    if (!ruleReferencesEarlierQuestion(sorted, q.id, q.conditionalRules)) {
      return jsonError(`قاعده شرطی سؤال «${q.title || q.type}» فقط می‌تواند به سؤال‌های قبلی اشاره کند`, 422)
    }
  }

  try {
    const ok = await backend().saveQuestions(formId, user.id, sorted)
    if (!ok) return jsonError('فرم یافت نشد', 404)
    return jsonOk({ saved: true, count: sorted.length })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'ذخیره سؤال‌ها ناموفق بود', 500)
  }
}
