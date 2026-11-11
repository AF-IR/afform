import { getCurrentUser } from '@/lib/auth/service'
import { backend, buildFormReport } from '@/lib/forms/service'
import { jsonError, jsonOk } from '@/lib/api-helpers'
import { rateLimit } from '@/lib/rate-limit'
import { runAiAnalysis } from '@/lib/ai/analysis'
import { ZaiNotConfiguredError } from '@/lib/ai/zai-client'

type Params = { params: Promise<{ formId: string }> }

/**
 * AI analysis of a form's real results.
 * GET  → latest stored analysis (owner-only).
 * POST → generate a fresh analysis via Z.AI (random key start, sequential
 *        key fallback), persist it, and return it. Owner-only, rate-limited.
 */

// Key rotation across several API keys can take a while — stay within the
// Vercel Hobby function limit (60s).
export const maxDuration = 60

export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  const { formId } = await params
  try {
    const saved = await backend().getLatestAiAnalysis(formId, user.id)
    return jsonOk({ analysis: saved })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'خطا در دریافت تحلیل', 500)
  }
}

export async function POST(_req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  const { formId } = await params

  // AI generation is expensive — 8 analyses per 10 minutes per user.
  const rl = rateLimit(`ai-analysis:${user.id}`, 8, 10 * 60 * 1000)
  if (!rl.allowed) {
    return jsonError(
      `تعداد درخواست‌های تحلیل زیاد است؛ حدود ${Math.max(1, Math.ceil(rl.retryAfterSec / 60))} دقیقه دیگر دوباره تلاش کنید`,
      429,
    )
  }

  try {
    const form = await backend().getForm(formId, user.id)
    if (!form) return jsonError('فرم یافت نشد', 404)

    const report = await buildFormReport(form)
    if (report.totalResponses === 0) {
      return jsonError('هنوز پاسخی ثبت نشده است؛ تحلیل هوش مصنوعی پس از دریافت اولین پاسخ در دسترس قرار می‌گیرد.', 400)
    }

    const { analysis, model, provider } = await runAiAnalysis({ form, report })
    const saved = await backend().saveAiAnalysis(formId, user.id, {
      analysis,
      model,
      provider,
      responsesCount: report.totalResponses,
    })
    return jsonOk({ analysis: saved })
  } catch (e) {
    if (e instanceof ZaiNotConfiguredError) return jsonError(e.message, 503)
    return jsonError(e instanceof Error ? e.message : 'خطا در تولید تحلیل هوش مصنوعی', 500)
  }
}
