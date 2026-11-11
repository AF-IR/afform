import { getCurrentUser } from '@/lib/auth/service'
import { backend, newPublicId } from '@/lib/forms/service'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'
import { rateLimit } from '@/lib/rate-limit'
import { extractJsonObject, zaiChat, ZaiNotConfiguredError } from '@/lib/ai/zai-client'
import { buildGeneratorMessages, normalizeGeneratedForm, clampQuestionCount } from '@/lib/ai/form-generator'
import type { FormType } from '@/types'

/**
 * AI questionnaire generation (Z.AI, free API keys, random-start key rotation).
 * POST { topic, formType?, count?, audience? } → creates a REAL draft form with
 * generated questions (for exams: with correct answers and points) and returns it.
 */
export const maxDuration = 60

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)

  // generation is expensive — 6 per 10 minutes per user
  const rl = rateLimit(`ai-generate:${user.id}`, 6, 10 * 60 * 1000)
  if (!rl.allowed) {
    return jsonError(
      `تعداد درخواست‌های ساخت با هوش مصنوعی زیاد است؛ حدود ${Math.max(1, Math.ceil(rl.retryAfterSec / 60))} دقیقه دیگر دوباره تلاش کنید`,
      429,
    )
  }

  const body = await readJson<Record<string, unknown>>(req, 64 * 1024)
  if (!body) return jsonError('ساختار درخواست نامعتبر است', 422)

  const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
  if (topic.length < 5) return jsonError('موضوع را با حداقل ۵ نویسه توضیح دهید', 422)
  if (topic.length > 1000) return jsonError('موضوع خیلی طولانی است', 422)

  const formType: FormType = body.formType === 'quiz' ? 'quiz' : body.formType === 'form' ? 'form' : 'survey'
  const count = clampQuestionCount(typeof body.count === 'number' ? body.count : null, formType)
  const audience = typeof body.audience === 'string' ? body.audience.slice(0, 300) : undefined

  try {
    const messages = buildGeneratorMessages({ topic, formType, count, audience })
    let generated: ReturnType<typeof normalizeGeneratedForm> = null
    let model = ''
    let provider = ''

    for (let attempt = 0; attempt < 2 && !generated; attempt++) {
      const res = await zaiChat(
        attempt === 0
          ? messages
          : [...messages, { role: 'system', content: 'یادآوری نهایی: فقط یک شیء JSON معتبر برگردان؛ بدون متن و بدون بلوک کد.' }],
      )
      model = res.model
      provider = res.provider
      generated = normalizeGeneratedForm(extractJsonObject(res.content), { topic, formType, count, audience })
    }

    if (!generated) {
      return jsonError('خروجی هوش مصنوعی قابل پردازش نبود؛ لطفاً دوباره تلاش کنید یا موضوع را ساده‌تر بنویسید.', 502)
    }

    // create a REAL draft form + questions (owner = current user)
    const form = await backend().createForm(user.id, {
      title: generated.title,
      description: generated.description,
      formType,
      publicId: newPublicId(),
      settings: generated.settings,
    })
    await backend().saveQuestions(form.id, user.id, generated.questions)

    return jsonOk({
      form,
      questionsCount: generated.questions.length,
      gradedQuestions: generated.questions.filter((q) => q.scoring).length,
      model,
      provider,
    })
  } catch (e) {
    if (e instanceof ZaiNotConfiguredError) return jsonError(e.message, 503)
    return jsonError(e instanceof Error ? e.message : 'خطا در ساخت پرسش‌نامه با هوش مصنوعی', 500)
  }
}
