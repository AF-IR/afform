import 'server-only'
import crypto from 'node:crypto'
import { isSupabaseConfigured } from '@/lib/env'
import { localBackend } from './backend-local'
import { supabaseBackend } from './backend-supabase'
import type { FormsBackend } from './backend-types'
import { computeVisibleQuestions } from '@/lib/forms/conditional'
import { validateAnswer, isAnswerable, getChoiceComment, getOtherText } from '@/lib/validation/schemas'
import { gradeSubmission, isPassed, isAnswerCorrect } from '@/lib/scoring/grade'
import { respondentKey, verifyAttemptToken, signAttemptToken } from '@/lib/auth/session'
import { normalizeNationalId, isValidNationalId, normalizeFullName, isNationalIdAllowed } from '@/lib/exam/identity'
import type { AnswerValue, FormSummary, FormType, FormSettings, Question, SessionUser } from '@/types'

export function backend(): FormsBackend {
  return isSupabaseConfigured() ? supabaseBackend : localBackend
}

export type SubmitError =
  | 'not_found'
  | 'not_published'
  | 'not_started'
  | 'closed'
  | 'limit_reached'
  | 'max_attempts'
  | 'time_expired'
  | 'login_required'
  | 'identity_not_allowed'
  | 'identity_already_used'
  | 'validation'
  | 'server'

export interface SubmitIdentity {
  fullName?: string
  nationalId?: string
}

export interface SubmitOutcome {
  ok: boolean
  code?: SubmitError
  message?: string
  fieldErrors?: Record<string, string>
  responseId?: string
  thankYouMessage?: string
  result?: { totalScore: number; maxScore: number; passed: boolean | null } | null
  edited?: boolean
}

export interface SubmitMeta {
  ip: string
  userAgent: string
  sessionUser: SessionUser | null
}

export function getRespondentKey(meta: SubmitMeta): string {
  return meta.sessionUser ? `user:${meta.sessionUser.id}` : respondentKey(meta.ip, meta.userAgent)
}

/** Issue a signed quiz attempt token (server clock — browser clock is never trusted). */
export function startAttempt(form: FormSummary & { questions: Question[] }, meta: SubmitMeta): { token: string; serverNow: number } {
  return {
    token: signAttemptToken({ formId: form.id, startedAt: Date.now(), key: getRespondentKey(meta) }),
    serverNow: Date.now(),
  }
}

const GRACE_SEC = 90 // network tolerance for in-flight submissions

/**
 * Validate the secure-exam identity gate (server-side authority):
 * required fields → format/ checksum → whitelist membership → one entry per
 * national ID. Returns the normalized identity, or a failure outcome.
 * Exported for the start route (pre-exam check) — submit always re-validates.
 */
export async function checkIdentityGate(
  formId: string,
  gate: NonNullable<FormSettings['identityGate']>,
  identity: SubmitIdentity | undefined,
  isEdit: boolean,
): Promise<{ ok: true; fullName: string | null; nationalId: string | null } | { ok: false; code: SubmitError; message: string; fieldErrors?: Record<string, string> }> {
  const fullName = normalizeFullName(identity?.fullName).slice(0, 120)
  const nid = normalizeNationalId(identity?.nationalId ?? '')

  if (gate.requireNationalId) {
    if (!nid) {
      return { ok: false, code: 'validation', message: 'وارد کردن کد ملی الزامی است', fieldErrors: { __identity: 'کد ملی را به‌صورت ۱۰ رقمی وارد کنید' } }
    }
    if (!isValidNationalId(nid)) {
      return { ok: false, code: 'validation', message: 'کد ملی واردشده معتبر نیست', fieldErrors: { __identity: 'کد ملی معتبر نیست' } }
    }
    if (!isNationalIdAllowed(nid, gate.allowedNationalIds)) {
      return { ok: false, code: 'identity_not_allowed', message: 'این کد ملی در لیست مجاز این آزمون ثبت نشده است؛ در صورت نیاز با برگزارکننده تماس بگیرید' }
    }
    // one entry per national ID (server-side, independent of browser/device)
    if (!isEdit) {
      const used = await backend().countByNationalId(formId, nid)
      if (used > 0) {
        return { ok: false, code: 'identity_already_used', message: 'با این کد ملی قبلاً در آزمون شرکت شده است و ورود دوباره مجاز نیست' }
      }
    }
  }

  if (gate.requireFullName && !fullName) {
    return { ok: false, code: 'validation', message: 'وارد کردن نام و نام خانوادگی الزامی است', fieldErrors: { __identity: 'نام و نام خانوادگی الزامی است' } }
  }

  return { ok: true, fullName: fullName || null, nationalId: nid }
}

export async function submitResponse(
  form: FormSummary & { questions: Question[] },
  payload: { attemptToken?: string; answers: Record<string, unknown>; identity?: SubmitIdentity; editResponseId?: string },
  meta: SubmitMeta,
): Promise<SubmitOutcome> {
  try {
    const s = form.settings

    if (form.status !== 'published') {
      return { ok: false, code: form.status === 'closed' ? 'closed' : 'not_published' }
    }
    const now = Date.now()
    if (s.startAt && now < new Date(s.startAt).getTime()) return { ok: false, code: 'not_started' }
    if (s.endAt && now > new Date(s.endAt).getTime()) return { ok: false, code: 'closed' }

    const respondentKeyValue = getRespondentKey(meta)

    if (!s.allowAnonymous && !meta.sessionUser) {
      return { ok: false, code: 'login_required' }
    }

    // secure-exam identity gate (whitelist + one entry per national ID)
    let respondentName: string | null = null
    let respondentNationalId: string | null = null
    if (s.identityGate?.enabled) {
      const gate = await checkIdentityGate(form.id, s.identityGate, payload.identity, Boolean(payload.editResponseId))
      if (!gate.ok) {
        return { ok: false, code: gate.code, message: gate.message, fieldErrors: gate.fieldErrors }
      }
      respondentName = gate.fullName
      respondentNationalId = gate.nationalId
    }

    // response limit
    if (s.responseLimit !== null) {
      const count = await backend().countResponses(form.id)
      if (count >= s.responseLimit && !payload.editResponseId) return { ok: false, code: 'limit_reached' }
    }

    // attempt limit (quiz)
    const isQuiz = form.formType === 'quiz'
    const maxAttempts = s.maxAttempts ?? (isQuiz ? 1 : null)
    if (!payload.editResponseId && maxAttempts !== null) {
      const attempts = await backend().countAttempts(form.id, respondentKeyValue)
      if (attempts >= maxAttempts) return { ok: false, code: 'max_attempts' }
    }

    // timed quiz — validate elapsed time with the signed server-issued token
    let startedAtIso: string | null = null
    if (isQuiz && s.timeLimitMinutes !== null) {
      const attempt = verifyAttemptToken(payload.attemptToken)
      if (!attempt || attempt.formId !== form.id || attempt.key !== respondentKeyValue) {
        return { ok: false, code: 'validation', message: 'شروع آزمون ثبت نشده است؛ صفحه را دوباره باز کنید' }
      }
      const elapsedSec = (now - attempt.startedAt) / 1000
      if (elapsedSec > s.timeLimitMinutes * 60 + GRACE_SEC) {
        return { ok: false, code: 'time_expired' }
      }
      startedAtIso = new Date(attempt.startedAt).toISOString()
    }

    // ---- answer validation (server-side truth) ----
    const questions = [...form.questions].sort((a, b) => a.position - b.position)
    const visible = computeVisibleQuestions(questions, payload.answers)
    const fieldErrors: Record<string, string> = {}
    const normalized: Record<string, AnswerValue> = {}

    // reject answers to hidden / unknown questions
    for (const qid of Object.keys(payload.answers)) {
      const q = questions.find((x) => x.id === qid)
      if (!q || !visible.has(qid)) {
        fieldErrors[qid] = 'این سؤال در مسیر فعلی فرم نیست'
      }
    }

    for (const q of questions) {
      if (!visible.has(q.id) || !isAnswerable(q.type)) continue
      const raw = payload.answers[q.id]
      const res = validateAnswer(q, raw)
      if (!res.ok) fieldErrors[q.id] = res.error
      else if (res.normalized !== null && res.normalized !== undefined) normalized[q.id] = res.normalized
    }

    if (Object.keys(fieldErrors).length > 0) {
      return { ok: false, code: 'validation', fieldErrors, message: 'برخی پاسخ‌ها معتبر نیستند' }
    }

    // ---- scoring (quiz) ----
    let result: SubmitOutcome['result'] = null
    let totalScore: number | null = null
    let maxScore: number | null = null
    let passed: boolean | null = null
    if (isQuiz) {
      const visibleQuestions = questions.filter((q) => visible.has(q.id))
      const graded = gradeSubmission(visibleQuestions, normalized)
      maxScore = graded.maxScore
      totalScore = graded.totalScore
      passed = isPassed(graded, s.passingScorePercent)
      result = { totalScore, maxScore, passed }
    }

    const b = backend()

    // ---- edit existing response ----
    if (payload.editResponseId) {
      if (!s.allowResponseEdit) return { ok: false, code: 'validation', message: 'ویرایش پاسخ مجاز نیست' }
      const updated = await b.updateResponseAnswers(payload.editResponseId, form.id, respondentKeyValue, normalized)
      if (!updated) return { ok: false, code: 'validation', message: 'پاسخ قابل ویرایش یافت نشد' }
      if (isQuiz && totalScore !== null) {
        // scores of edited responses are recalculated and stored
        await supabaseOrLocalUpdateScore(payload.editResponseId, form.id, totalScore, maxScore, passed)
      }
      return { ok: true, responseId: payload.editResponseId, thankYouMessage: s.thankYouMessage, result, edited: true }
    }

    const responseId = await b.insertResponse({
      formId: form.id,
      respondentId: meta.sessionUser?.id ?? null,
      respondentKey: respondentKeyValue,
      status: 'submitted',
      totalScore,
      maxScore,
      passed,
      attemptNumber: 1,
      startedAt: startedAtIso,
      respondentName,
      respondentNationalId,
      answers: normalized,
    })

    return {
      ok: true,
      responseId,
      thankYouMessage: s.thankYouMessage,
      result: s.showResultsToRespondent ? result : null,
    }
  } catch (e) {
    console.error('submitResponse failed:', e instanceof Error ? e.message : e)
    return { ok: false, code: 'server', message: 'خطای سرور در ثبت پاسخ' }
  }
}

async function supabaseOrLocalUpdateScore(responseId: string, formId: string, total: number, max: number | null, passed: boolean | null) {
  if (isSupabaseConfigured()) {
    const { adminClient } = await import('./backend-supabase')
    await adminClient().from('responses').update({ total_score: total, max_score: max, passed }).eq('id', responseId).eq('form_id', formId)
  } else {
    await localUpdateScore(responseId, formId, total, max, passed)
  }
}

async function localUpdateScore(responseId: string, formId: string, total: number, max: number | null, passed: boolean | null) {
  const { db } = await import('@/lib/db')
  await db.response.updateMany({ where: { id: responseId, formId }, data: { totalScore: total, maxScore: max, passed } })
}

export function newPublicId(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(8)
  let s = ''
  for (const b of bytes) s += alphabet[b % alphabet.length]
  return s
}

// ---------- reports aggregation ----------

export interface QuestionReport {
  questionId: string
  title: string
  type: Question['type']
  answeredCount: number
  choiceCounts?: { label: string; count: number }[]
  average?: number | null
  distribution?: { value: number; count: number }[]
  /** quiz-only: share of CORRECT answers among graded answers */
  correctCount?: number
  gradedCount?: number
  samples?: string[]
}

export interface FormReport {
  totalResponses: number
  quiz: {
    isQuiz: boolean
    averageScore: number | null
    averagePercent: number | null
    passRate: number | null
    histogram: { bucket: string; count: number }[]
  }
  timeline: { date: string; count: number }[]
  questions: QuestionReport[]
}

export async function buildFormReport(form: FormSummary & { questions: Question[] }): Promise<FormReport> {
  const b = backend()
  const [{ rows: allResponses }, answerValues] = await Promise.all([
    b.listResponses(form.id, { limit: 5000, order: 'asc' }),
    b.getAnswerValues(form.id),
  ])

  const total = allResponses.length

  // timeline — last 30 days
  const timelineMap = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    timelineMap.set(new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10), 0)
  }
  for (const r of allResponses) {
    const key = r.submittedAt.slice(0, 10)
    if (timelineMap.has(key)) timelineMap.set(key, (timelineMap.get(key) ?? 0) + 1)
  }

  // quiz stats
  let quiz: FormReport['quiz'] = { isQuiz: form.formType === 'quiz', averageScore: null, averagePercent: null, passRate: null, histogram: [] }
  if (form.formType === 'quiz') {
    const scores = allResponses.map((r) => r.totalScore).filter((v): v is number => v !== null)
    const percents = allResponses
      .map((r) => (r.totalScore !== null && r.maxScore && r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : null))
      .filter((v): v is number => v !== null)
    const passedCount = allResponses.filter((r) => r.passed === true).length
    const failedCount = allResponses.filter((r) => r.passed === false).length
    const avgPct = percents.length ? percents.reduce((a, b) => a + b, 0) / percents.length : null
    quiz = {
      isQuiz: true,
      averageScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      averagePercent: avgPct,
      passRate: passedCount + failedCount > 0 ? (passedCount / (passedCount + failedCount)) * 100 : null,
      histogram: buildScoreHistogram(percents),
    }
  }

  // per-question aggregation
  const questions: QuestionReport[] = form.questions
    .filter((q) => isAnswerable(q.type))
    .map((q) => {
      const values = (answerValues[q.id] ?? []).filter((v) => v !== null && v !== undefined && v !== '')
      const base: QuestionReport = { questionId: q.id, title: q.title, type: q.type, answeredCount: values.length }
      if (['single_choice', 'dropdown'].includes(q.type)) {
        base.choiceCounts = countChoices(q, values, false)
      } else if (['multi_choice', 'multi_choice_comment'].includes(q.type)) {
        base.choiceCounts = countChoices(q, values, true)
      } else if (q.type === 'boolean') {
        const yes = values.filter((v) => v === true).length
        base.choiceCounts = [{ label: 'بله', count: yes }, { label: 'خیر', count: values.length - yes }]
      } else if (['rating_5', 'rating_10', 'stars', 'likert', 'rating_number'].includes(q.type)) {
        const nums = values.map((v) => (typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN)).filter((n) => !Number.isNaN(n))
        const dist = new Map<number, number>()
        for (const n of nums) dist.set(n, (dist.get(n) ?? 0) + 1)
        base.average = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
        base.distribution = [...dist.entries()].sort((a, b) => a[0] - b[0]).map(([value, count]) => ({ value, count }))
      } else {
        base.samples = values.slice(-20).map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
      }

      // every question type can carry free text (سایر / توضیح) — surface it for the AI
      const texts = values
        .map((v) => getOtherText(v) ?? getChoiceComment(v))
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim())
      if (texts.length) {
        base.samples = [...(base.samples ?? []), ...texts].slice(-20)
      }

      // matrix answers → readable «سطر: ستون» samples
      if (q.type === 'matrix') {
        const rows = q.config.rows ?? []
        const cols = q.config.cols ?? []
        base.samples = values.slice(-20).map((v) =>
          typeof v === 'object' && v !== null && !Array.isArray(v)
            ? Object.entries(v as Record<string, string>).map(([r, c]) => `${rows[Number(r)] ?? r}: ${c}`).join('، ')
            : JSON.stringify(v),
        )
      }

      // quiz: how many answered CORRECTLY (auto-scored types only)
      if (form.formType === 'quiz' && q.scoring && q.scoring.points > 0) {
        let graded = 0
        let correct = 0
        for (const v of values) {
          const c = isAnswerCorrect(q, v)
          if (c !== null) {
            graded++
            if (c) correct++
          }
        }
        if (graded > 0) {
          base.gradedCount = graded
          base.correctCount = correct
        }
      }

      return base
    })

  return {
    totalResponses: total,
    quiz,
    timeline: [...timelineMap.entries()].map(([date, count]) => ({ date, count })),
    questions,
  }
}

function countChoices(q: Question, values: AnswerValue[], multi: boolean) {
  const counts = new Map<string, number>()
  const labels = new Map((q.config.choices ?? []).map((c) => [c.id, c.label]))
  for (const v of values) {
    const ids: string[] = []
    if (!multi && typeof v === 'string') ids.push(v)
    else if (Array.isArray(v)) ids.push(...(v as string[]))
    else if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as object)) {
      const cv = (v as { value: unknown }).value
      if (typeof cv === 'string') ids.push(cv)
      else if (Array.isArray(cv)) ids.push(...(cv as string[]))
    }
    for (const id of ids) {
      const label = id === '__other__' ? 'سایر' : labels.get(id) ?? id
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

function buildScoreHistogram(percents: number[]) {
  const buckets = ['0-۱۰٪', '۱۰-۲۰٪', '۲۰-۳۰٪', '۳۰-۴۰٪', '۴۰-۵۰٪', '۵۰-۶۰٪', '۶۰-۷۰٪', '۷۰-۸۰٪', '۸۰-۹۰٪', '۹۰-۱۰۰٪']
  const counts = new Array(10).fill(0) as number[]
  for (const p of percents) {
    const idx = Math.min(9, Math.max(0, Math.floor(p / 10)))
    counts[idx]++
  }
  return buckets.map((bucket, i) => ({ bucket, count: counts[i] }))
}
