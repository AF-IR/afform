import { z } from 'zod'
import {
  ALL_QUESTION_TYPES,
  OTHER_CHOICE_ID,
  type AnswerValue,
  type ChoiceAnswerValue,
  type Question,
  type QuestionConfig,
  type QuestionScoring,
  type QuestionType,
} from '@/types'

// ---------- helpers ----------

const choiceSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1, 'برچسب گزینه الزامی است').max(500),
})

const conditionalRuleSchema = z.object({
  questionId: z.string().min(1),
  operator: z.enum(['equals', 'not_equals', 'includes', 'gt', 'lt', 'answered', 'not_answered']),
  value: z.string().max(500).optional(),
})

const scoringSchema = z.object({
  points: z.number().min(0).max(1000),
  correctChoices: z.array(z.string().max(64)).max(200).optional(),
  correctBoolean: z.boolean().optional(),
  correctNumber: z.number().optional(),
  acceptRange: z.object({ min: z.number(), max: z.number() }).optional(),
}).refine((s) => s.points >= 0, { message: 'امتیاز نامعتبر است' })

const configSchema = z.object({
  minLength: z.number().int().min(0).max(10000).optional(),
  maxLength: z.number().int().min(1).max(20000).optional(),
  placeholder: z.string().max(300).optional(),
  min: z.number().min(-1e12).max(1e12).optional(),
  max: z.number().min(-1e12).max(1e12).optional(),
  integer: z.boolean().optional(),
  unit: z.string().max(30).optional(),
  choices: z.array(choiceSchema).max(200).optional(),
  allowOther: z.boolean().optional(),
  minSelects: z.number().int().min(0).max(200).optional(),
  maxSelects: z.number().int().min(1).max(200).optional(),
  likertLabels: z.array(z.string().max(80)).max(7).optional(),
  rows: z.array(z.string().min(1).max(300)).max(50).optional(),
  cols: z.array(z.string().min(1).max(300)).max(20).optional(),
  maxSizeMB: z.number().min(0.1).max(20).optional(),
  allowedTypes: z.array(z.string().max(100)).max(20).optional(),
  minDate: z.string().max(10).optional(),
  maxDate: z.string().max(10).optional(),
})

const CHOICE_TYPES: QuestionType[] = ['single_choice', 'multi_choice', 'dropdown', 'multi_choice_comment']

/** Validates a full question definition, including per-type requirements. */
export const questionDefSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(ALL_QUESTION_TYPES as [QuestionType, ...QuestionType[]]),
  title: z.string().max(1000).default(''),
  description: z.string().max(3000).default(''),
  required: z.boolean().default(false),
  position: z.number().int().min(0).max(9999),
  config: configSchema.default({}),
  scoring: scoringSchema.nullable().default(null),
  conditionalRules: z.array(conditionalRuleSchema).max(20).nullable().default(null),
  conditionalMode: z.enum(['any', 'all']).default('any'),
})

export const questionsPayloadSchema = z.object({
  questions: z.array(questionDefSchema).max(300),
}).superRefine((payload, ctx) => {
  const seen = new Set<string>()
  payload.questions.forEach((q, i) => {
    if (seen.has(q.id)) {
      ctx.addIssue({ code: 'custom', message: `شناسه سؤال تکراری است: ${q.id}`, path: ['questions', i, 'id'] })
    }
    seen.add(q.id)
    if (CHOICE_TYPES.includes(q.type)) {
      const choices = q.config.choices ?? []
      if (choices.length < 2) {
        ctx.addIssue({ code: 'custom', message: `سؤال «${q.title || q.type}» حداقل به ۲ گزینه نیاز دارد`, path: ['questions', i, 'config', 'choices'] })
      }
      if (q.config.allowOther && !choices.some((c) => c.id === OTHER_CHOICE_ID)) {
        // other choice is implicit — ok
      }
    }
    if (q.type === 'matrix') {
      if (!q.config.rows?.length || q.config.rows.length < 1) {
        ctx.addIssue({ code: 'custom', message: 'ماتریس حداقل به یک سطر نیاز دارد', path: ['questions', i, 'config', 'rows'] })
      }
      if (!q.config.cols?.length || q.config.cols.length < 2) {
        ctx.addIssue({ code: 'custom', message: 'ماتریس حداقل به دو ستون نیاز دارد', path: ['questions', i, 'config', 'cols'] })
      }
    }
    if (q.conditionalRules?.length) {
      const ids = new Set(payload.questions.map((x) => x.id))
      q.conditionalRules.forEach((r, ri) => {
        if (!ids.has(r.questionId) || r.questionId === q.id) {
          ctx.addIssue({ code: 'custom', message: 'قاعده شرطی به سؤال نامعتبر اشاره می‌کند', path: ['questions', i, 'conditionalRules', ri] })
        }
      })
    }
  })
})

// ---------- settings ----------

export const formSettingsSchema = z.object({
  thankYouMessage: z.string().max(2000).default('پاسخ شما با موفقیت ثبت شد. سپاس از همکاری شما.'),
  showProgressBar: z.boolean().default(true),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  allowAnonymous: z.boolean().default(true),
  allowResponseEdit: z.boolean().default(false),
  showResultsToRespondent: z.boolean().default(false),
  allowIndexing: z.boolean().default(false),
  startAt: z.string().datetime({ offset: true }).nullable().default(null),
  endAt: z.string().datetime({ offset: true }).nullable().default(null),
  responseLimit: z.number().int().min(1).max(1_000_000).nullable().default(null),
  timeLimitMinutes: z.number().int().min(1).max(600).nullable().default(null),
  maxAttempts: z.number().int().min(1).max(100).nullable().default(null),
  passingScorePercent: z.number().min(0).max(100).nullable().default(null),
  showResultImmediately: z.boolean().default(false),
})

export const formCreateSchema = z.object({
  title: z.string().min(1, 'عنوان الزامی است').max(300),
  description: z.string().max(5000).default(''),
  formType: z.enum(['form', 'survey', 'quiz']).default('form'),
  templateId: z.string().max(64).optional(),
})

export const formUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  formType: z.enum(['form', 'survey', 'quiz']).optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
  settings: formSettingsSchema.optional(),
})

// ---------- answers ----------

const fileAnswerSchema = z.object({
  fileId: z.string().min(1).max(128),
  name: z.string().min(1).max(300),
  size: z.number().int().min(0).max(20 * 1024 * 1024),
  mime: z.string().max(200),
})

/** Raw answer value coming from the client before deep validation. */
export const answerValueSchema: z.ZodType<AnswerValue> = z.any()

export const submitSchema = z.object({
  attemptToken: z.string().max(2048).optional(),
  answers: z.record(z.string().max(64), z.any()).default({}),
})

// ---------- auth ----------

export const registerSchema = z.object({
  displayName: z.string().min(2, 'نام نمایشی حداقل ۲ نویسه است').max(80),
  email: z.string().email('ایمیل معتبر نیست').max(200),
  password: z.string().min(8, 'رمز عبور حداقل ۸ نویسه است').max(200),
  confirmPassword: z.string().min(8).max(200),
  acceptTerms: z.boolean().refine((v) => v === true, { message: 'پذیرش شرایط استفاده الزامی است' }),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'رمز عبور و تکرار آن یکسان نیستند',
  path: ['confirmPassword'],
})

export const loginSchema = z.object({
  email: z.string().email('ایمیل معتبر نیست').max(200),
  password: z.string().min(1, 'رمز عبور الزامی است').max(200),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('ایمیل معتبر نیست').max(200),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'رمز عبور حداقل ۸ نویسه است').max(200),
  confirmPassword: z.string().min(8).max(200),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'رمز عبور و تکرار آن یکسان نیستند',
  path: ['confirmPassword'],
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, 'رمز عبور حداقل ۸ نویسه است').max(200),
})

export const profileSchema = z.object({
  displayName: z.string().min(2, 'نام نمایشی حداقل ۲ نویسه است').max(80),
})

// ---------- helpers used by validation of answers ----------

export function isChoiceType(t: QuestionType): boolean {
  return CHOICE_TYPES.includes(t)
}

export function getChoiceIds(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (value && typeof value === 'object' && 'value' in value) {
    return getChoiceIds((value as ChoiceAnswerValue).value)
  }
  return []
}

export function getChoiceComment(value: unknown): string | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'comment' in value) {
    const c = (value as ChoiceAnswerValue).comment
    return typeof c === 'string' ? c : undefined
  }
  return undefined
}

export function getOtherText(value: unknown): string | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'text' in value) {
    const t = (value as ChoiceAnswerValue).text
    return typeof t === 'string' ? t : undefined
  }
  return undefined
}

/** Validate one answer against its question definition (server-side truth). */
export function validateAnswer(q: Question, value: unknown): { ok: true; normalized: AnswerValue } | { ok: false; error: string } {
  const empty = value === null || value === undefined || value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) &&
      (('value' in (value as object)) && (value as ChoiceAnswerValue).value !== undefined ? false : Object.keys(value as object).length === 0))

  if (!isAnswerable(q.type)) {
    return { ok: true, normalized: null }
  }

  if (empty) {
    if (q.required) return { ok: false, error: `پاسخ به سؤال «${q.title}» الزامی است` }
    return { ok: true, normalized: null }
  }

  switch (q.type) {
    case 'short_text':
    case 'long_text': {
      if (typeof value !== 'string') return { ok: false, error: `پاسخ «${q.title}» باید متن باشد` }
      const t = value.trim()
      if (q.config.minLength && t.length < q.config.minLength) return { ok: false, error: `«${q.title}» حداقل ${q.config.minLength} نویسه لازم دارد` }
      if (q.config.maxLength && t.length > q.config.maxLength) return { ok: false, error: `«${q.title}» حداکثر ${q.config.maxLength} نویسه مجاز است` }
      return { ok: true, normalized: t }
    }
    case 'email': {
      if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) return { ok: false, error: 'ایمیل معتبر نیست' }
      return { ok: true, normalized: value.trim().toLowerCase() }
    }
    case 'phone': {
      if (typeof value !== 'string' || !/^[+0-9\s-]{7,20}$/.test(value.trim())) return { ok: false, error: 'شماره تلفن معتبر نیست' }
      return { ok: true, normalized: value.trim() }
    }
    case 'url': {
      if (typeof value !== 'string') return { ok: false, error: 'لینک معتبر نیست' }
      try {
        const u = new URL(value.trim())
        if (!['http:', 'https:'].includes(u.protocol)) throw new Error()
        return { ok: true, normalized: u.toString() }
      } catch {
        return { ok: false, error: 'لینک معتبر نیست (با http یا https شروع شود)' }
      }
    }
    case 'number':
    case 'rating_number': {
      const num = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
      if (Number.isNaN(num)) return { ok: false, error: `پاسخ «${q.title}» باید عدد باشد` }
      if (q.config.integer && !Number.isInteger(num)) return { ok: false, error: `«${q.title}» باید عدد صحیح باشد` }
      if (q.config.min !== undefined && num < q.config.min) return { ok: false, error: `«${q.title}» نمی‌تواند کمتر از ${q.config.min} باشد` }
      if (q.config.max !== undefined && num > q.config.max) return { ok: false, error: `«${q.title}» نمی‌تواند بیشتر از ${q.config.max} باشد` }
      return { ok: true, normalized: num }
    }
    case 'single_choice':
    case 'dropdown': {
      let selected: string | undefined
      let otherText: string | undefined
      if (typeof value === 'string') selected = value
      else if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in (value as object)) {
        const cv = value as ChoiceAnswerValue
        if (typeof cv.value === 'string') selected = cv.value
        otherText = typeof cv.text === 'string' ? cv.text : undefined
      }
      const choices = q.config.choices ?? []
      const ids = new Set(choices.map((c) => c.id))
      if (!selected || (!ids.has(selected) && selected !== OTHER_CHOICE_ID)) return { ok: false, error: `گزینه انتخابی برای «${q.title}» معتبر نیست` }
      if (selected === OTHER_CHOICE_ID) {
        if (!q.config.allowOther) return { ok: false, error: `گزینه «سایر» برای «${q.title}» فعال نیست` }
        if (!otherText || !otherText.trim()) return { ok: false, error: `متن گزینه «سایر» برای «${q.title}» الزامی است` }
        return { ok: true, normalized: { value: OTHER_CHOICE_ID, text: otherText.trim().slice(0, 500) } }
      }
      return { ok: true, normalized: selected }
    }
    case 'multi_choice':
    case 'multi_choice_comment': {
      const ids = getChoiceIds(value)
      const comment = getChoiceComment(value)
      const choices = q.config.choices ?? []
      const valid = new Set([...choices.map((c) => c.id), OTHER_CHOICE_ID])
      if (!ids.length || ids.some((id) => !valid.has(id))) return { ok: false, error: `گزینه‌های انتخابی «${q.title}» معتبر نیستند` }
      const otherPicked = ids.includes(OTHER_CHOICE_ID)
      if (otherPicked && !q.config.allowOther) return { ok: false, error: `گزینه «سایر» برای «${q.title}» فعال نیست` }
      if (otherPicked && !getOtherText(value)?.trim()) return { ok: false, error: `متن گزینه «سایر» برای «${q.title}» الزامی است` }
      if (q.config.minSelects !== undefined && ids.length < q.config.minSelects) return { ok: false, error: `در «${q.title}» حداقل ${q.config.minSelects} گزینه انتخاب کنید` }
      if (q.config.maxSelects !== undefined && ids.length > q.config.maxSelects) return { ok: false, error: `در «${q.title}» حداکثر ${q.config.maxSelects} گزینه مجاز است` }
      const normalized: ChoiceAnswerValue = { value: ids }
      const ot = getOtherText(value)
      if (ot?.trim()) normalized.text = ot.trim().slice(0, 500)
      if (q.type === 'multi_choice_comment') {
        if (!comment || !comment.trim()) return { ok: false, error: `توضیح مربوط به «${q.title}» الزامی است` }
        normalized.comment = comment.trim().slice(0, 2000)
      }
      return { ok: true, normalized }
    }
    case 'boolean': {
      if (typeof value !== 'boolean') return { ok: false, error: `پاسخ «${q.title}» باید بله یا خیر باشد` }
      return { ok: true, normalized: value }
    }
    case 'likert':
    case 'rating_5':
    case 'rating_10':
    case 'stars': {
      const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
      const maxRating = q.type === 'rating_5' ? 5 : q.type === 'rating_10' ? 10 : q.type === 'stars' ? 5 : 5
      if (Number.isNaN(num) || !Number.isInteger(num) || num < 1 || num > maxRating) return { ok: false, error: `امتیاز «${q.title}» باید عددی بین ۱ تا ${maxRating} باشد` }
      return { ok: true, normalized: num }
    }
    case 'date': {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, error: 'تاریخ معتبر نیست' }
      const d = new Date(value + 'T00:00:00Z')
      if (Number.isNaN(d.getTime())) return { ok: false, error: 'تاریخ معتبر نیست' }
      if (q.config.minDate && value < q.config.minDate) return { ok: false, error: `تاریخ نمی‌تواند قبل از ${q.config.minDate} باشد` }
      if (q.config.maxDate && value > q.config.maxDate) return { ok: false, error: `تاریخ نمی‌تواند بعد از ${q.config.maxDate} باشد` }
      return { ok: true, normalized: value }
    }
    case 'time': {
      if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return { ok: false, error: 'ساعت معتبر نیست' }
      return { ok: true, normalized: value }
    }
    case 'file': {
      if (!value || typeof value !== 'object' || Array.isArray(value) || !('fileId' in (value as object))) return { ok: false, error: `فایل «${q.title}» ارسال نشده است` }
      const parsed = fileAnswerSchema.safeParse(value)
      if (!parsed.success) return { ok: false, error: 'اطلاعات فایل معتبر نیست' }
      return { ok: true, normalized: parsed.data }
    }
    case 'matrix': {
      const rows = q.config.rows ?? []
      const cols = q.config.cols ?? []
      if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: `پاسخ «${q.title}» نامعتبر است` }
      const mv = value as Record<string, unknown>
      const normalized: Record<string, string> = {}
      const validCols = new Set(cols)
      let filled = 0
      for (let r = 0; r < rows.length; r++) {
        const col = mv[String(r)]
        if (col === undefined || col === null || col === '') continue
        if (typeof col !== 'string' || !validCols.has(col)) return { ok: false, error: `پاسخ ماتریس «${q.title}» نامعتبر است` }
        normalized[String(r)] = col
        filled++
      }
      if (q.required && filled < rows.length) return { ok: false, error: `پاسخ به همه سطرهای «${q.title}» الزامی است` }
      if (!filled && !q.required) return { ok: true, normalized: null }
      return { ok: true, normalized }
    }
    default:
      return { ok: false, error: 'این نوع سؤال پاسخ نمی‌پذیرد' }
  }
}

export function isAnswerable(t: QuestionType): boolean {
  return t !== 'info' && t !== 'separator'
}
