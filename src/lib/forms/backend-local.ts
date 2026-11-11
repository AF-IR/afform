import 'server-only'
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import type {
  AiAnalysisData,
  AnswerValue,
  FormSettings,
  FormStatus,
  FormSummary,
  FormType,
  Question,
  SavedAiAnalysis,
} from '@/types'
import { DEFAULT_FORM_SETTINGS } from '@/types'
import type { ExportRow, FormsBackend, InsertResponseInput, ListResponsesOpts } from './backend-types'

function parseJson<T>(v: unknown, fallback: T): T {
  if (v === null || v === undefined) return fallback
  if (typeof v === 'object') return v as T
  try {
    return JSON.parse(String(v)) as T
  } catch {
    return fallback
  }
}

function toFormSummary(f: {
  id: string; title: string; description: string; formType: string; status: string;
  publicId: string; settings: unknown; createdAt: Date; updatedAt: Date; publishedAt: Date | null;
  _count?: { questions?: number; responses?: number }
}): FormSummary {
  return {
    id: f.id,
    title: f.title,
    description: f.description,
    formType: f.formType as FormType,
    status: f.status as FormStatus,
    publicId: f.publicId,
    settings: { ...DEFAULT_FORM_SETTINGS, ...parseJson<Partial<FormSettings>>(f.settings, {}) },
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    publishedAt: f.publishedAt?.toISOString() ?? null,
    questionCount: f._count?.questions,
    responseCount: f._count?.responses,
  }
}

function toQuestion(row: {
  id: string; type: string; title: string; description: string; required: boolean; position: number;
  choices: unknown; config: unknown; scoringRules: unknown; conditionalRules: unknown;
}): Question {
  return {
    id: row.id,
    type: row.type as Question['type'],
    title: row.title,
    description: row.description,
    required: row.required,
    position: row.position,
    config: parseJson(row.config, {}),
    scoring: parseJson(row.scoringRules, null),
    conditionalRules: parseJson(row.conditionalRules, null),
    conditionalMode: 'any',
  }
}

/** Merge legacy `choices` column into config for choice questions. */
function normalizeQuestion(q: Question): Question {
  if (['single_choice', 'multi_choice', 'dropdown', 'multi_choice_comment'].includes(q.type)) {
    const legacy = parseJson<{ choices?: { id: string; label: string }[] }>(null, {})
    const cfgChoices = q.config.choices ?? legacy.choices
    if (cfgChoices) q.config.choices = cfgChoices
  }
  return q
}

export const localBackend: FormsBackend = {
  async listForms(ownerId) {
    const rows = await db.form.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { questions: true, responses: true } } },
    })
    return rows.map(toFormSummary)
  },

  async getForm(formId, ownerId) {
    const f = await db.form.findFirst({
      where: { id: formId, ownerId },
      include: { questions: { orderBy: { position: 'asc' } }, _count: { select: { responses: true } } },
    })
    if (!f) return null
    return { ...toFormSummary(f), responseCount: f._count.responses, questions: f.questions.map(toQuestion).map(normalizeQuestion) }
  },

  async getFormByPublicId(publicId) {
    const f = await db.form.findUnique({
      where: { publicId },
      include: { questions: { orderBy: { position: 'asc' } } },
    })
    if (!f) return null
    return { ...toFormSummary(f), questions: f.questions.map(toQuestion).map(normalizeQuestion) }
  },

  async createForm(ownerId, input) {
    const f = await db.form.create({
      data: {
        ownerId,
        title: input.title,
        description: input.description ?? '',
        formType: input.formType ?? 'form',
        status: 'draft',
        publicId: input.publicId,
        settings: JSON.stringify(input.settings ?? DEFAULT_FORM_SETTINGS),
      },
    })
    return toFormSummary(f)
  },

  async updateForm(formId, ownerId, patch) {
    const existing = await db.form.findFirst({ where: { id: formId, ownerId } })
    if (!existing) return null
    const f = await db.form.update({
      where: { id: formId },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.formType !== undefined ? { formType: patch.formType } : {}),
        ...(patch.status !== undefined
          ? { status: patch.status, publishedAt: patch.status === 'published' && !existing.publishedAt ? new Date() : existing.publishedAt }
          : {}),
        ...(patch.settings !== undefined ? { settings: JSON.stringify(patch.settings) } : {}),
      },
    })
    return toFormSummary(f)
  },

  async deleteForm(formId, ownerId) {
    const existing = await db.form.findFirst({ where: { id: formId, ownerId } })
    if (!existing) return false
    await db.form.delete({ where: { id: formId } }) // cascades to questions/responses/answers
    return true
  },

  async duplicateForm(formId, ownerId) {
    const src = await db.form.findFirst({
      where: { id: formId, ownerId },
      include: { questions: { orderBy: { position: 'asc' } } },
    })
    if (!src) return null
    const copy = await db.form.create({
      data: {
        ownerId,
        title: `${src.title} (کپی)`,
        description: src.description,
        formType: src.formType,
        status: 'draft',
        publicId: generatePublicId(),
        settings: src.settings,
      },
    })
    if (src.questions.length) {
      await db.question.createMany({
        data: src.questions.map((q) => ({
          formId: copy.id, type: q.type, title: q.title, description: q.description,
          required: q.required, position: q.position, choices: q.choices, config: q.config,
          scoringRules: q.scoringRules, conditionalRules: q.conditionalRules,
        })),
      })
    }
    return toFormSummary(copy)
  },

  async findForeignQuestionIds(formId, questionIds) {
    if (!questionIds.length) return []
    const rows = await db.question.findMany({
      where: { id: { in: questionIds }, formId: { not: formId } },
      select: { id: true },
    })
    return rows.map((r) => r.id)
  },

  async saveQuestions(formId, ownerId, questions) {
    const f = await db.form.findFirst({ where: { id: formId, ownerId } })
    if (!f) return false
    await db.$transaction(async (tx) => {
      const existing = await tx.question.findMany({ where: { formId }, select: { id: true } })
      const payloadIds = new Set(questions.map((q) => q.id))
      // only removed questions are deleted (their answers cascade with them)
      const removedIds = existing.map((e) => e.id).filter((id) => !payloadIds.has(id))
      if (removedIds.length) {
        await tx.question.deleteMany({ where: { formId, id: { in: removedIds } } })
      }
      for (const q of questions) {
        const data = {
          formId,
          type: q.type,
          title: q.title,
          description: q.description ?? '',
          required: q.required ?? false,
          position: q.position ?? 0,
          choices: 'null',
          config: JSON.stringify(q.config ?? {}),
          scoringRules: JSON.stringify(q.scoring ?? null),
          conditionalRules: JSON.stringify(q.conditionalRules ?? null),
        }
        await tx.question.upsert({ where: { id: q.id }, update: data, create: { id: q.id, ...data } })
      }
    })
    return true
  },

  async insertResponse(input: InsertResponseInput): Promise<string> {
    const r = await db.response.create({
      data: {
        formId: input.formId,
        respondentId: input.respondentId ?? null,
        respondentKey: input.respondentKey,
        status: input.status ?? 'submitted',
        totalScore: input.totalScore ?? null,
        maxScore: input.maxScore ?? null,
        passed: input.passed ?? null,
        attemptNumber: input.attemptNumber ?? 1,
        startedAt: input.startedAt ? new Date(input.startedAt) : null,
        respondentName: input.respondentName ?? null,
        respondentNationalId: input.respondentNationalId ?? null,
      },
    })
    const entries = Object.entries(input.answers)
    if (entries.length) {
      await db.answer.createMany({
        data: entries.map(([questionId, value]) => ({
          responseId: r.id,
          questionId,
          answerValue: JSON.stringify(value ?? null),
        })),
      })
    }
    return r.id
  },

  async updateResponseAnswers(responseId, formId, respondentKey, answers) {
    const r = await db.response.findFirst({ where: { id: responseId, formId, respondentKey } })
    if (!r) return false
    await db.$transaction(async (tx) => {
      await tx.answer.deleteMany({ where: { responseId } })
      const entries = Object.entries(answers)
      if (entries.length) {
        await tx.answer.createMany({
          data: entries.map(([questionId, value]) => ({
            responseId, questionId, answerValue: JSON.stringify(value ?? null),
          })),
        })
      }
      await tx.response.update({ where: { id: responseId }, data: { submittedAt: new Date(), updatedAt: new Date() } })
    })
    return true
  },

  async countResponses(formId) {
    return db.response.count({ where: { formId } })
  },

  async countAttempts(formId, respondentKey) {
    return db.response.count({ where: { formId, respondentKey } })
  },

  async countByNationalId(formId, nationalId) {
    return db.response.count({ where: { formId, respondentNationalId: nationalId } })
  },

  async listResponses(formId, opts: ListResponsesOpts) {
    const where: Record<string, unknown> = { formId }
    if (opts.from || opts.to) {
      const submittedAt: Record<string, Date> = {}
      if (opts.from) submittedAt.gte = new Date(opts.from)
      if (opts.to) submittedAt.lte = new Date(opts.to)
      where.submittedAt = submittedAt
    }
    if (opts.status) where.status = opts.status
    if (opts.ids && opts.ids.length) where.id = { in: opts.ids }

    const [total, rows] = await Promise.all([
      db.response.count({ where }),
      db.response.findMany({
        where,
        orderBy: { submittedAt: opts.order ?? 'desc' },
        skip: opts.offset ?? 0,
        take: opts.limit ?? 25,
        include: { answers: true },
      }),
    ])

    const exportRows: ExportRow[] = rows.map((r) => ({
      responseId: r.id,
      submittedAt: r.submittedAt.toISOString(),
      status: r.status,
      totalScore: r.totalScore,
      maxScore: r.maxScore,
      passed: r.passed,
      respondentName: r.respondentName,
      respondentNationalId: r.respondentNationalId,
      answers: Object.fromEntries(r.answers.map((a) => [a.questionId, parseJson<AnswerValue>(a.answerValue, null)])),
    }))
    return { rows: exportRows, total }
  },

  async searchResponseIds(formId, term) {
    const answers = await db.answer.findMany({
      where: {
        answerValue: { contains: term },
        response: { formId },
      },
      select: { responseId: true },
      take: 1000,
    })
    return [...new Set(answers.map((a) => a.responseId))]
  },

  async getResponseDetail(formId, responseId) {
    const r = await db.response.findFirst({
      where: { id: responseId, formId },
      include: { answers: true },
    })
    if (!r) return null
    return {
      responseId: r.id,
      submittedAt: r.submittedAt.toISOString(),
      status: r.status,
      totalScore: r.totalScore,
      maxScore: r.maxScore,
      passed: r.passed,
      respondentName: r.respondentName,
      respondentNationalId: r.respondentNationalId,
      answers: Object.fromEntries(r.answers.map((a) => [a.questionId, parseJson<AnswerValue>(a.answerValue, null)])),
    }
  },

  async deleteResponse(formId, responseId) {
    const r = await db.response.findFirst({ where: { id: responseId, formId } })
    if (!r) return false
    await db.response.delete({ where: { id: responseId } })
    return true
  },

  async getAnswerValues(formId) {
    const answers = await db.answer.findMany({
      where: { question: { formId }, response: { status: 'submitted' } },
      select: { questionId: true, answerValue: true },
      take: 50_000,
    })
    const map: Record<string, AnswerValue[]> = {}
    for (const a of answers) {
      ;(map[a.questionId] ??= []).push(parseJson<AnswerValue>(a.answerValue, null))
    }
    return map
  },

  async overviewStats(ownerId) {
    const forms = await db.form.findMany({
      where: { ownerId },
      select: { id: true, status: true, createdAt: true },
    })
    const formIds = forms.map((f) => f.id)
    const totalResponses = formIds.length
      ? await db.response.count({ where: { formId: { in: formIds } } })
      : 0
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
    const recentResponses = formIds.length
      ? await db.response.count({ where: { formId: { in: formIds }, submittedAt: { gte: weekAgo } } })
      : 0

    // per-day counts (last 7 days)
    const daily: { date: string; count: number }[] = []
    const recent = formIds.length
      ? await db.response.findMany({
          where: { formId: { in: formIds }, submittedAt: { gte: weekAgo } },
          select: { submittedAt: true },
        })
      : []
    for (let i = 6; i >= 0; i--) {
      const day = new Date(Date.now() - i * 24 * 3600 * 1000)
      const key = day.toISOString().slice(0, 10)
      daily.push({ date: key, count: recent.filter((r) => r.submittedAt.toISOString().slice(0, 10) === key).length })
    }

    return {
      totalForms: forms.length,
      publishedForms: forms.filter((f) => f.status === 'published').length,
      totalResponses,
      recentResponses,
      daily,
    }
  },

  async saveUploadedFile(input) {
    const rec = await db.uploadedFile.create({
      data: { formId: input.formId, path: input.path, name: input.name, mime: input.mime, size: input.size },
    })
    return rec.id
  },

  async getUploadedFile(fileId) {
    const rec = await db.uploadedFile.findUnique({ where: { id: fileId } })
    if (!rec) return null
    return { id: rec.id, formId: rec.formId, path: rec.path, name: rec.name, mime: rec.mime, size: rec.size }
  },

  async saveAiAnalysis(formId, ownerId, input) {
    const form = await db.form.findFirst({ where: { id: formId, ownerId }, select: { id: true } })
    if (!form) throw new Error('فرم یافت نشد')
    const rec = await db.aiAnalysis.create({
      data: {
        formId,
        analysis: JSON.stringify(input.analysis),
        model: input.model,
        provider: input.provider,
        responsesCount: input.responsesCount,
      },
    })
    return toSavedAiAnalysis(rec)
  },

  async getLatestAiAnalysis(formId, ownerId) {
    const form = await db.form.findFirst({ where: { id: formId, ownerId }, select: { id: true } })
    if (!form) return null
    const rec = await db.aiAnalysis.findFirst({ where: { formId }, orderBy: { createdAt: 'desc' } })
    return rec ? toSavedAiAnalysis(rec) : null
  },
}

function toSavedAiAnalysis(rec: {
  id: string
  formId: string
  analysis: unknown
  model: string
  provider: string
  responsesCount: number
  createdAt: Date
}): SavedAiAnalysis {
  const a = parseJson<Partial<AiAnalysisData>>(rec.analysis, {})
  return {
    id: rec.id,
    formId: rec.formId,
    analysis: {
      summary: typeof a.summary === 'string' ? a.summary : '',
      insights: Array.isArray(a.insights) ? a.insights : [],
      anomalies: Array.isArray(a.anomalies) ? a.anomalies : [],
      suggestions: Array.isArray(a.suggestions) ? a.suggestions : [],
    },
    model: rec.model,
    provider: rec.provider,
    responsesCount: rec.responsesCount,
    createdAt: rec.createdAt.toISOString(),
  }
}

function generatePublicId(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  const bytes = crypto.randomBytes(8)
  for (const b of bytes) s += alphabet[b % alphabet.length]
  return s
}
