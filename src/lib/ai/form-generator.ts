/**
 * AI questionnaire/exam generation — builds the Persian prompt, then converts
 * the model's JSON into real, validated Question objects that the rest of the
 * platform (builder, renderer, scoring, reports) already understands.
 *
 * Rules:
 * - Only well-supported question types are generated (no file/matrix/time).
 * - For exams (quiz) the model also defines the CORRECT answers and points —
 *   so generated exams are gradeable out of the box.
 * - Normalization is defensive: unknown types map to short_text, empty
 *   questions are dropped, choices get generated ids, scores are clamped.
 */

import {
  DEFAULT_FORM_SETTINGS,
  type FormType,
  type FormSettings,
  type Question,
  type QuestionConfig,
  type QuestionScoring,
  type QuestionType,
} from '@/types'
import type { ChatMessage } from './zai-client'

export interface GenerateFormInput {
  topic: string
  formType: FormType
  count: number
  audience?: string
}

export interface GeneratedForm {
  title: string
  description: string
  settings: FormSettings
  questions: Question[]
}

/** Types the generator is allowed to produce. */
const GENERATABLE_TYPES: QuestionType[] = [
  'short_text', 'long_text', 'email', 'phone', 'number', 'url',
  'single_choice', 'multi_choice', 'dropdown', 'boolean',
  'rating_5', 'rating_10', 'likert', 'date', 'info',
]

const CHOICE_TYPES: QuestionType[] = ['single_choice', 'multi_choice', 'dropdown']

export function clampQuestionCount(n: number | null | undefined, formType: FormType): number {
  const fallback = formType === 'quiz' ? 10 : 8
  if (!n || Number.isNaN(n)) return fallback
  return Math.min(20, Math.max(3, Math.round(n)))
}

export function buildGeneratorMessages(input: GenerateFormInput): ChatMessage[] {
  const count = clampQuestionCount(input.count, input.formType)
  const kind =
    input.formType === 'quiz'
      ? 'آزمون (کوییز) با پاسخ صحیح، امتیاز هر سؤال و نمره خودکار'
      : input.formType === 'survey'
        ? 'پرسشنامه / نظرسنجی'
        : 'فرم جمع‌آوری اطلاعات'

  const system = `تو یک طراح حرفه‌ای پرسش‌نامه فارسی‌زبان در پلتفرم «آرشام فرم» هستی.
وظیفهٔ تو: طراحی یک ${kind} با کیفیت، دقیق و کاربردی بر اساس موضوع کاربر.

قواعد الزامی:
۱. فقط و فقط یک شیء JSON معتبر برگردان؛ بدون هیچ متن اضافه، بدون بلوک کد مارک‌داون.
۲. همهٔ متن‌ها فارسی روان و حرفه‌ای باشد؛ سؤال‌ها شفاف، بی‌ابهام و بدون سوگیری باشند.
۳. ساختار دقیق JSON:
{
  "title": "عنوان فرم (حداکثر ۸۰ نویسه)",
  "description": "توضیح کوتاه ۱ تا ۲ جمله‌ای برای پاسخ‌دهنده",
  "questions": [
    { "type": "single_choice", "title": "متن سؤال", "description": "توضیح اختیاری", "required": true,
      "choices": ["گزینه ۱", "گزینه ۲", "گزینه ۳"] },
    { "type": "multi_choice", "title": "...", "required": false, "choices": ["...", "..."] },
    { "type": "boolean", "title": "...", "required": true },
    { "type": "short_text" | "long_text" | "email" | "phone" | "number" | "url" | "date", "title": "...", "required": true },
    { "type": "rating_5" | "rating_10" | "likert", "title": "..." },
    { "type": "info", "title": "متن راهنمای کوتاه" }
  ]
}
۴. نوع سؤال فقط یکی از این‌ها باشد: single_choice، multi_choice، dropdown، boolean، short_text، long_text، email، phone، number، url، date، rating_5، rating_10، likert، info.
۵. سؤال‌های انتخابی حداقل ۲ و حداکثر ۶ گزینه داشته باشند (choices آرایه‌ای از رشته).
${input.formType === 'quiz' ? `۶. چون این یک آزمون است، برای هر سؤالی که پاسخ صحیح دارد این فیلدها را هم بده:
  - برای single_choice و dropdown: "correct": متنِ گزینهٔ صحیح (دقیقاً برابر یکی از گزینه‌ها)، "points": امتیاز (عدد مثبت، معمولاً ۱)
  - برای multi_choice: "correct": آرایه‌ای از متن گزینه‌های صحیح، "points": امتیاز
  - برای boolean: "correct": true یا false، "points": امتیاز
  - برای number: "correctNumber": عدد صحیح (یا "acceptRange": {"min": x, "max": y})، "points": امتیاز
  - سؤال‌های تشریحی (short_text/long_text) بدون پاسخ صحیح و بدون points باشند؛ حداکثر ۲ سؤال تشریحی.
  - مجموع امتیازها منطقی باشد (مثلاً هر سؤال ۱ امتیاز).` : '۶. هیچ فیلد correct یا points قرار نده.'}
۷. تعداد سؤال‌ها دقیقاً ${count} عدد باشد.`

  const user: string[] = [`موضوع: ${input.topic.slice(0, 800)}`]
  if (input.audience?.trim()) user.push(`مخاطب هدف: ${input.audience.trim().slice(0, 300)}`)
  user.push('پرسش‌نامه را طراحی کن و فقط JSON برگردان.')

  return [
    { role: 'system', content: system },
    { role: 'user', content: user.join('\n') },
  ]
}

interface RawQuestion {
  type?: unknown
  title?: unknown
  description?: unknown
  required?: unknown
  choices?: unknown
  correct?: unknown
  correctNumber?: unknown
  acceptRange?: unknown
  points?: unknown
}

/** Defensive mapping of the model JSON → real Question objects with stable ids. */
export function normalizeGeneratedForm(raw: unknown, input: GenerateFormInput): GeneratedForm | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>

  const title = typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim().slice(0, 200) : ''
  const description = typeof obj.description === 'string' ? obj.description.trim().slice(0, 3000) : ''
  const rawQuestions = Array.isArray(obj.questions) ? (obj.questions as RawQuestion[]) : []
  if (rawQuestions.length === 0) return null

  const count = clampQuestionCount(input.count, input.formType)
  const questions: Question[] = []

  rawQuestions.slice(0, count).forEach((rq, index) => {
    const qTitle = typeof rq.title === 'string' ? rq.title.trim().slice(0, 1000) : ''
    const qTypeRaw = typeof rq.type === 'string' ? (rq.type as QuestionType) : 'short_text'
    const isInfo = qTypeRaw === 'info' || qTypeRaw === 'separator'
    if (!qTitle && !isInfo) return // skip empty questions

    const type: QuestionType = GENERATABLE_TYPES.includes(qTypeRaw) ? qTypeRaw : 'short_text'
    const qId = `ai${String(index + 1).padStart(2, '0')}${Math.random().toString(36).slice(2, 6)}`
    const description = typeof rq.description === 'string' ? rq.description.trim().slice(0, 1000) : ''
    const required = rq.required === true

    const config: QuestionConfig = {}
    let scoring: QuestionScoring | null = null

    if (CHOICE_TYPES.includes(type)) {
      const labels = (Array.isArray(rq.choices) ? rq.choices : [])
        .map((c) => (typeof c === 'string' ? c.trim() : ''))
        .filter((c) => c.length > 0)
        .slice(0, 12)
      if (labels.length < 2) return // skip malformed choice questions
      const ids = labels.map((_, i) => `c${i + 1}`)
      config.choices = labels.map((label, i) => ({ id: ids[i], label }))
      if (type === 'multi_choice') config.minSelects = 1

      if (input.formType === 'quiz') {
        const correctLabels = Array.isArray(rq.correct)
          ? rq.correct.map((c) => (typeof c === 'string' ? c.trim() : ''))
          : typeof rq.correct === 'string' ? [rq.correct.trim()] : []
        const correctIds = correctLabels
          .map((l) => ids[labels.indexOf(l)])
          .filter((id): id is string => Boolean(id))
        if (correctIds.length > 0) {
          scoring = {
            points: normalizePoints(rq.points, type === 'multi_choice' ? 2 : 1),
            correctChoices: correctIds,
          }
        }
      }
    } else if (type === 'boolean' && input.formType === 'quiz' && typeof rq.correct === 'boolean') {
      scoring = { points: normalizePoints(rq.points, 1), correctBoolean: rq.correct }
    } else if (type === 'number' && input.formType === 'quiz') {
      const range = (rq.acceptRange && typeof rq.acceptRange === 'object' && !Array.isArray(rq.acceptRange)
        ? rq.acceptRange as { min?: unknown; max?: unknown } : null)
      const min = range && typeof range.min === 'number' ? range.min : undefined
      const max = range && typeof range.max === 'number' ? range.max : undefined
      if (typeof rq.correctNumber === 'number') {
        scoring = { points: normalizePoints(rq.points, 1), correctNumber: rq.correctNumber }
        config.integer = true
      } else if (min !== undefined && max !== undefined && min <= max) {
        scoring = { points: normalizePoints(rq.points, 1), acceptRange: { min, max } }
      }
    } else if (type === 'likert') {
      config.likertLabels = ['خیلی کم', 'کم', 'متوسط', 'زیاد', 'خیلی زیاد']
    } else if (type === 'long_text') {
      config.minLength = 5
    }

    questions.push({
      id: qId,
      type,
      title: qTitle,
      description,
      required: isInfo ? false : required,
      position: questions.length,
      config,
      scoring,
      conditionalRules: null,
      conditionalMode: 'any',
    })
  })

  if (questions.length === 0) return null

  const settings: FormSettings = {
    ...DEFAULT_FORM_SETTINGS,
    ...(input.formType === 'quiz'
      ? { maxAttempts: 1, showResultsToRespondent: true, showResultImmediately: true }
      : {}),
  }

  return {
    title: title || input.topic.slice(0, 80),
    description,
    settings,
    questions,
  }
}

function normalizePoints(v: unknown, fallback: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback
  return Math.min(100, Math.max(1, n || fallback))
}
