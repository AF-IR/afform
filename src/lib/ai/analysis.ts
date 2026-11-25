/**
 * AI analysis of real form results.
 *
 * Input is the already-aggregated `FormReport` (built from real database rows
 * by `buildFormReport`) — the model never receives raw personal answers beyond
 * short truncated text samples, and it is explicitly instructed to rely only
 * on the provided numbers (no invented statistics).
 *
 * Output is a validated Persian JSON object: summary / insights / anomalies /
 * suggestions. Parsing is tolerant (code fences, prose) and retried once with
 * a stricter instruction before failing.
 */

import { QUESTION_TYPE_META, FORM_TYPE_LABEL, type FormSummary, type Question } from '@/types'
import type { FormReport } from '@/lib/forms/service'
import { extractJsonObject, zaiChat, type ChatMessage } from './zai-client'

export interface AiAnalysisData {
  summary: string
  insights: string[]
  anomalies: string[]
  suggestions: string[]
}

export interface AiAnalysisRun {
  analysis: AiAnalysisData
  model: string
  provider: string
}

const MAX_QUESTIONS = 40
const MAX_SAMPLES_PER_QUESTION = 12
const MAX_CHOICE_ROWS = 10
const MAX_PROMPT_CHARS = 30_000

const SYSTEM_PROMPT = `تو یک تحلیلگر داده و پرسش‌نامه‌شناس حرفه‌ای فارسی‌زبان در پلتفرم «آرشام فرم» هستی.
وظیفهٔ تو: تحلیل نتایج واقعی یک فرم، پرسشنامه یا آزمون و تولید بینش عملی و قابل اجرا.

قواعد الزامی:
۱. فقط و فقط یک شیء JSON معتبر برگردان؛ هیچ متن اضافه، هیچ بلوک کد (مارک‌داون) و هیچ توضیحی قبل یا بعد از JSON ننویس.
۲. همهٔ متن‌ها فارسی روان و حرفه‌ای باشد و اعداد را با ارقام فارسی بنویس.
۳. فقط به داده‌های داده‌شده تکیه کن؛ هیچ عدد، درصد یا آماری از خودت نساز.
۴. «answeredCount» (تعداد پاسخ) عدد واقعی است: اگر بزرگ‌تر از صفر باشد یعنی به آن سؤال واقعاً پاسخ داده شده و تو باید محتوای همان پاسخ‌ها را تحلیل کنی (توزیع گزینه‌ها، میانگین، نمونه متن‌ها). فقط وقتی answeredCount صفر است اجازه داری بگویی پاسخی داده نشده است.
۵. «نمونه پاسخ»‌ها متن واقعی و خام پاسخ‌دهندگان است؛ حتماً آن‌ها را بخوان، موضوعات پرتکرار را استخراج کن و در تحلیل به آن‌ها ارجاع بده (نقل‌قول کوتاه یا دسته‌بندی موضوعی).
۶. ساختار دقیق JSON:
{
  "summary": "خلاصهٔ تحلیلی ۲ تا ۴ جمله‌ای از وضعیت کلی نتایج",
  "insights": ["یافتهٔ کلیدی و مشخص ۱", "..."],
  "anomalies": ["نکتهٔ قابل توجه یا هشدار ۱", "..."],
  "suggestions": ["پیشنهاد عملی و اجرایی ۱", "..."]
}
۷. insights بین ۲ تا ۶ مورد؛ هر یافته باید به دادهٔ مشخصی (گزینه، میانگین، نمونهٔ متنی، نرخ پاسخ صحیح یا روند) ارجاع دهد.
۸. anomalies بین ۰ تا ۴ مورد (مثلاً سؤال بی‌پاسخ واقعی، افت روند، نرخ قبولی پایین، توزیع غیرعادی)؛ اگر موردی نیست آرایهٔ خالی بده.
۹. suggestions بین ۲ تا ۵ مورد؛ هر پیشنهاد کوتاه، مشخص و قابل اجرا باشد.`

interface AnalysisInput {
  form: FormSummary & { questions: Question[] }
  report: FormReport
}

/** Build the compact Persian prompt from the real aggregated report. */
export function buildAnalysisMessages({ form, report }: AnalysisInput): ChatMessage[] {
  const meta: string[] = []
  meta.push(`عنوان فرم: ${form.title.slice(0, 160)}`)
  if (form.description) meta.push(`توضیحات فرم: ${form.description.slice(0, 300)}`)
  meta.push(`نوع: ${FORM_TYPE_LABEL[form.formType]}`)
  meta.push(`وضعیت: ${form.status === 'published' ? 'منتشرشده' : form.status === 'closed' ? 'بسته‌شده' : 'پیش‌نویس'}`)
  meta.push(`تعداد کل پاسخ‌ها: ${report.totalResponses}`)

  const lines: string[] = ['# دادهٔ تجمیعی نتایج (از پایگاه دادهٔ واقعی)', ...meta, '']

  // 30-day trend — real timeline
  const last7 = report.timeline.slice(-7).reduce((s, d) => s + d.count, 0)
  const prev7 = report.timeline.slice(-14, -7).reduce((s, d) => s + d.count, 0)
  lines.push(`## روند دریافت پاسخ`)
  lines.push(`- ۷ روز اخیر: ${last7} پاسخ؛ ۷ روز قبل از آن: ${prev7} پاسخ`)
  lines.push(`- سری ۳۰ روزه (تاریخ:تعداد): ${report.timeline.map((d) => `${d.date}:${d.count}`).join('، ')}`)
  lines.push('')

  if (report.quiz.isQuiz) {
    lines.push('## آمار آزمون')
    if (report.quiz.averagePercent !== null) {
      lines.push(`- میانگین درصد نمرات: ${Math.round(report.quiz.averagePercent)}٪`)
    }
    if (report.quiz.passRate !== null) {
      lines.push(`- نرخ قبولی: ${Math.round(report.quiz.passRate)}٪`)
    }
    const hist = report.quiz.histogram.filter((h) => h.count > 0)
    if (hist.length) lines.push(`- توزیع نمرات: ${hist.map((h) => `${h.bucket}: ${h.count} نفر`).join('، ')}`)
    lines.push('')
  }

  lines.push('## نتایج سؤال‌به‌سؤال (دادهٔ واقعی هر سؤال)')
  const questions = report.questions.slice(0, MAX_QUESTIONS)
  for (const q of questions) {
    const typeLabel = QUESTION_TYPE_META[q.type]?.label ?? q.type
    const answeredLabel = q.answeredCount > 0 ? `${q.answeredCount} پاسخ واقعی` : 'بدون هیچ پاسخ'
    let line = `- سؤال «${q.title.slice(0, 140) || typeLabel}» (${typeLabel}) — ${answeredLabel}`
    if (q.choiceCounts?.length) {
      const total = q.choiceCounts.reduce((s, c) => s + c.count, 0) || 1
      const rows = q.choiceCounts
        .slice(0, MAX_CHOICE_ROWS)
        .map((c) => `${c.label.slice(0, 60)}: ${c.count} (${Math.round((c.count / total) * 100)}٪)`)
      line += `؛ توزیع گزینه‌ها: ${rows.join('، ')}`
    }
    if (q.average !== undefined && q.average !== null) {
      const dist = q.distribution?.map((d) => `${d.value}:${d.count}`).join('، ')
      line += `؛ میانگین امتیاز: ${Math.round(q.average * 100) / 100}${dist ? `؛ توزیع: ${dist}` : ''}`
    }
    if (q.gradedCount !== undefined && q.correctCount !== undefined) {
      const rate = Math.round((q.correctCount / q.gradedCount) * 100)
      line += `؛ نرخ پاسخ صحیح: ${rate}٪ (${q.correctCount} صحیح از ${q.gradedCount} پاسخ نمره‌دار)`
    }
    if (q.samples?.length) {
      const samples = q.samples.slice(-MAX_SAMPLES_PER_QUESTION).map((s) => `"${s.slice(0, 180)}"`)
      line += `؛ نمونهٔ متن واقعی پاسخ‌دهندگان: ${samples.join(' | ')}`
    }
    lines.push(line)
  }
  if (report.questions.length > MAX_QUESTIONS) {
    lines.push(`(فقط ${MAX_QUESTIONS} سؤال نخست از ${report.questions.length} سؤال نمایش داده شده است)`)
  }
  lines.push('')
  lines.push('بر اساس این دادهٔ واقعی، تحلیل را در قالب JSON خواسته‌شده تولید کن. به محتوای واقعی پاسخ‌ها (توزیع گزینه‌ها، نرخ پاسخ صحیح و نمونهٔ متن‌ها) استناد کن.')

  const userContent = lines.join('\n').slice(0, MAX_PROMPT_CHARS)
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ]
}

/** Tolerant normalization/validation of the model's JSON output. */
export function normalizeAnalysis(raw: unknown): AiAnalysisData | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  const asTextList = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.map((s) => (typeof s === 'string' ? s.trim() : '')).filter((s) => s.length > 1)
      : []

  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : ''
  const insights = asTextList(obj.insights)
  const anomalies = asTextList(obj.anomalies)
  const suggestions = asTextList(obj.suggestions)

  if (summary.length < 10) return null
  if (insights.length === 0 && suggestions.length === 0) return null

  return {
    summary: summary.slice(0, 1500),
    insights: insights.slice(0, 8),
    anomalies: anomalies.slice(0, 8),
    suggestions: suggestions.slice(0, 8),
  }
}

/**
 * Run the AI analysis end-to-end: prompt → (key-rotated) chat → JSON parse →
 * validate. One retry with a stricter JSON reminder when parsing fails.
 */
export async function runAiAnalysis(input: AnalysisInput): Promise<AiAnalysisRun> {
  if (input.report.totalResponses === 0) {
    throw new Error('هنوز پاسخی ثبت نشده است؛ تحلیل هوش مصنوعی پس از دریافت اولین پاسخ در دسترس قرار می‌گیرد.')
  }

  const messages = buildAnalysisMessages(input)
  let lastResult: { content: string; model: string; provider: string } | null = null

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await zaiChat(
      attempt === 0
        ? messages
        : [...messages, { role: 'system', content: 'یادآوری نهایی: فقط یک شیء JSON معتبر برگردان؛ بدون هیچ متن یا بلوک کد اضافه.' }],
    )
    lastResult = res
    const parsed = normalizeAnalysis(extractJsonObject(res.content))
    if (parsed) return { analysis: parsed, model: res.model, provider: res.provider }
  }

  throw new Error('خروجی هوش مصنوعی قابل پردازش نبود؛ لطفاً دوباره تلاش کنید.')
}
