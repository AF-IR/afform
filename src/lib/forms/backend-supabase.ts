import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
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
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { FormsBackend, InsertResponseInput, ListResponsesOpts } from './backend-types'

/**
 * Supabase backend (production mode).
 *
 * - Owner (dashboard) operations use the cookie-bound, user-scoped client so
 *   Row Level Security is genuinely enforced by PostgreSQL.
 * - Public form pipeline (read/start/submit) runs server-side with the
 *   service-role key — the key never reaches the browser (env var only).
 */

let cachedAdmin: SupabaseClient | null = null

export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY تنظیم نشده است (برای خط عمومی فرم‌ها لازم است)')
  }
  if (!cachedAdmin) cachedAdmin = createClient(url, serviceKey, { auth: { persistSession: false } })
  return cachedAdmin
}

type Row = Record<string, unknown>

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function toFormSummary(f: Row): FormSummary {
  const settings = (f.settings && typeof f.settings === 'object' ? f.settings : {}) as Partial<FormSettings>
  return {
    id: str(f.id),
    title: str(f.title),
    description: str(f.description),
    formType: (str(f.formType, 'form') as FormType),
    status: (str(f.status, 'draft') as FormStatus),
    publicId: str(f.public_id),
    settings: { ...DEFAULT_FORM_SETTINGS, ...settings },
    createdAt: str(f.created_at, new Date().toISOString()),
    updatedAt: str(f.updated_at, new Date().toISOString()),
    publishedAt: f.published_at ? String(f.published_at) : null,
  }
}

function toQuestion(r: Row): Question {
  return {
    id: str(r.id),
    type: str(r.type) as Question['type'],
    title: str(r.title),
    description: str(r.description),
    required: Boolean(r.required),
    position: typeof r.position === 'number' ? r.position : 0,
    config: (r.options && typeof r.options === 'object' ? r.options : {}) as Question['config'],
    scoring: (r.scoring_rules ?? null) as Question['scoring'],
    conditionalRules: (r.conditional_rules ?? null) as Question['conditionalRules'],
    conditionalMode: 'any',
  }
}

async function userClient() {
  return createSupabaseServerClient()
}

function mapError(err: { message?: string } | null): string | null {
  if (!err) return null
  return err.message ?? 'خطای ناشناخته'
}

export const supabaseBackend: FormsBackend = {
  async listForms(ownerId) {
    const sb = await userClient()
    const { data, error } = await sb
      .from('forms')
      .select('*, questions(count), responses(count)')
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false })
    if (error) throw new Error(mapError(error) ?? '')
    return (data ?? []).map((row: Row) => {
      const s = toFormSummary(row)
      const qc = (row.questions as { count?: number }[] | null)?.[0]?.count
      const rc = (row.responses as { count?: number }[] | null)?.[0]?.count
      s.questionCount = qc ?? 0
      s.responseCount = rc ?? 0
      return s
    })
  },

  async getForm(formId, ownerId) {
    const sb = await userClient()
    const { data: f, error } = await sb
      .from('forms')
      .select('*')
      .eq('id', formId)
      .eq('owner_id', ownerId)
      .maybeSingle()
    if (error) throw new Error(mapError(error) ?? '')
    if (!f) return null
    const { data: qs } = await sb
      .from('questions')
      .select('*')
      .eq('form_id', formId)
      .order('position', { ascending: true })
    return { ...toFormSummary(f as Row), questions: (qs ?? []).map((q) => toQuestion(q as Row)) }
  },

  async getFormByPublicId(publicId) {
    const admin = adminClient()
    const { data: f, error } = await admin
      .from('forms')
      .select('*')
      .eq('public_id', publicId)
      .maybeSingle()
    if (error) throw new Error(mapError(error) ?? '')
    if (!f) return null
    const { data: qs } = await admin
      .from('questions')
      .select('*')
      .eq('form_id', (f as Row).id)
      .order('position', { ascending: true })
    return { ...toFormSummary(f as Row), questions: (qs ?? []).map((q) => toQuestion(q as Row)) }
  },

  async createForm(ownerId, input) {
    const sb = await userClient()
    const { data, error } = await sb
      .from('forms')
      .insert({
        owner_id: ownerId,
        title: input.title,
        description: input.description ?? '',
        form_type: input.formType ?? 'form',
        status: 'draft',
        public_id: input.publicId,
        settings: input.settings ?? DEFAULT_FORM_SETTINGS,
      })
      .select('*')
      .single()
    if (error) throw new Error(mapError(error) ?? '')
    return toFormSummary(data as Row)
  },

  async updateForm(formId, ownerId, patch) {
    const sb = await userClient()
    const data: Row = {}
    if (patch.title !== undefined) data.title = patch.title
    if (patch.description !== undefined) data.description = patch.description
    if (patch.formType !== undefined) data.form_type = patch.formType
    if (patch.status !== undefined) {
      data.status = patch.status
      if (patch.status === 'published') data.published_at = new Date().toISOString()
    }
    if (patch.settings !== undefined) data.settings = patch.settings
    const { data: updated, error } = await sb
      .from('forms')
      .update(data)
      .eq('id', formId)
      .eq('owner_id', ownerId)
      .select('*')
      .maybeSingle()
    if (error) throw new Error(mapError(error) ?? '')
    return updated ? toFormSummary(updated as Row) : null
  },

  async deleteForm(formId, ownerId) {
    const sb = await userClient()
    const { error } = await sb.from('forms').delete().eq('id', formId).eq('owner_id', ownerId)
    return !error
  },

  async duplicateForm(formId, ownerId) {
    const src = await this.getForm(formId, ownerId)
    if (!src) return null
    const copy = await this.createForm(ownerId, {
      title: `${src.title} (کپی)`,
      description: src.description,
      formType: src.formType,
      publicId: genPublicId(),
      settings: src.settings,
    })
    if (src.questions.length) {
      const sb = await userClient()
      await sb.from('questions').insert(
        src.questions.map((q) => ({
          form_id: copy.id, type: q.type, title: q.title, description: q.description,
          required: q.required, position: q.position, options: q.config,
          scoring_rules: q.scoring, conditional_rules: q.conditionalRules,
        })),
      )
    }
    return copy
  },

  async saveQuestions(formId, ownerId, questions) {
    const sb = await userClient()
    // verify ownership (RLS also enforces this)
    const { data: owned } = await sb.from('forms').select('id').eq('id', formId).eq('owner_id', ownerId).maybeSingle()
    if (!owned) return false

    const { data: existingRows } = await sb.from('questions').select('id').eq('form_id', formId)
    const existingIds = new Set((existingRows ?? []).map((r: Row) => str(r.id)))
    const payloadIds = new Set(questions.map((q) => q.id))
    const removedIds = [...existingIds].filter((id) => !payloadIds.has(id))

    // only removed questions are deleted (their answers cascade with them)
    if (removedIds.length) {
      const { error: delError } = await sb.from('questions').delete().in('id', removedIds).eq('form_id', formId)
      if (delError) throw new Error(mapError(delError) ?? '')
    }
    if (!questions.length) return true
    const rows = questions.map((q) => ({
      id: q.id,
      form_id: formId,
      type: q.type,
      title: q.title,
      description: q.description ?? '',
      required: q.required ?? false,
      position: q.position ?? 0,
      options: q.config ?? {},
      scoring_rules: q.scoring ?? null,
      conditional_rules: q.conditionalRules ?? null,
    }))
    // upsert keeps existing rows (and their answers) alive
    const { error } = await sb.from('questions').upsert(rows, { onConflict: 'id' })
    if (error) throw new Error(mapError(error) ?? '')
    return true
  },

  async insertResponse(input: InsertResponseInput): Promise<string> {
    const admin = adminClient()
    const { data, error } = await admin
      .from('responses')
      .insert({
        form_id: input.formId,
        respondent_id: input.respondentId ?? null,
        respondent_key: input.respondentKey,
        status: input.status ?? 'submitted',
        total_score: input.totalScore ?? null,
        max_score: input.maxScore ?? null,
        passed: input.passed ?? null,
        attempt_number: input.attemptNumber ?? 1,
        started_at: input.startedAt ?? null,
      })
      .select('id')
      .single()
    if (error) throw new Error(mapError(error) ?? '')
    const responseId = str((data as Row).id)
    const entries = Object.entries(input.answers)
    if (entries.length) {
      const { error: aError } = await admin.from('answers').insert(
        entries.map(([questionId, value]) => ({
          response_id: responseId,
          question_id: questionId,
          answer_value: value ?? null,
        })),
      )
      if (aError) throw new Error(mapError(aError) ?? '')
    }
    return responseId
  },

  async updateResponseAnswers(responseId, formId, respondentKey, answers) {
    const admin = adminClient()
    const { data } = await admin
      .from('responses')
      .select('id')
      .eq('id', responseId)
      .eq('form_id', formId)
      .eq('respondent_key', respondentKey)
      .maybeSingle()
    if (!data) return false
    await admin.from('answers').delete().eq('response_id', responseId)
    const entries = Object.entries(answers)
    if (entries.length) {
      await admin.from('answers').insert(
        entries.map(([questionId, value]) => ({ response_id: responseId, question_id: questionId, answer_value: value ?? null })),
      )
    }
    await admin.from('responses').update({ submitted_at: new Date().toISOString() }).eq('id', responseId)
    return true
  },

  async countResponses(formId) {
    const admin = adminClient()
    const { count } = await admin.from('responses').select('id', { count: 'exact', head: true }).eq('form_id', formId)
    return count ?? 0
  },

  async countAttempts(formId, respondentKey) {
    const admin = adminClient()
    const { count } = await admin
      .from('responses')
      .select('id', { count: 'exact', head: true })
      .eq('form_id', formId)
      .eq('respondent_key', respondentKey)
    return count ?? 0
  },

  async listResponses(formId, opts: ListResponsesOpts) {
    const sb = await userClient()
    let query = sb
      .from('responses')
      .select('*, answers(answer_value, question_id)', { count: 'exact' })
      .eq('form_id', formId)
    if (opts.from) query = query.gte('submitted_at', opts.from)
    if (opts.to) query = query.lte('submitted_at', opts.to)
    if (opts.status) query = query.eq('status', opts.status)
    if (opts.ids && opts.ids.length) query = query.in('id', opts.ids)
    query = query.order('submitted_at', { ascending: opts.order === 'asc' })
      .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 25) - 1)

    const { data, count, error } = await query
    if (error) throw new Error(mapError(error) ?? '')
    const rows = (data ?? []).map((r: Row) => ({
      responseId: str(r.id),
      submittedAt: str(r.submitted_at),
      status: str(r.status, 'submitted'),
      totalScore: (r.total_score as number | null) ?? null,
      maxScore: (r.max_score as number | null) ?? null,
      passed: (r.passed as boolean | null) ?? null,
      answers: Object.fromEntries(
        ((r.answers as { question_id: string; answer_value: AnswerValue }[] | null) ?? []).map((a) => [a.question_id, a.answer_value]),
      ) as Record<string, AnswerValue>,
    }))
    return { rows, total: count ?? rows.length }
  },

  async searchResponseIds(formId, term) {
    const sb = await userClient()
    const { data } = await sb
      .from('answers')
      .select('response_id')
      .ilike('answer_value', `%${term}%`)
      .limit(1000)
    const ids = new Set((data ?? []).map((d: Row) => str(d.response_id)))
    // keep only responses of this form (RLS filters ownership, but not form scope)
    if (ids.size) {
      const { data: own } = await sb.from('responses').select('id').eq('form_id', formId).in('id', [...ids])
      return (own ?? []).map((r: Row) => str(r.id))
    }
    return []
  },

  async getResponseDetail(formId, responseId) {
    const sb = await userClient()
    const { data } = await sb
      .from('responses')
      .select('*, answers(question_id, answer_value)')
      .eq('id', responseId)
      .eq('form_id', formId)
      .maybeSingle()
    if (!data) return null
    const r = data as Row
    return {
      responseId: str(r.id),
      submittedAt: str(r.submitted_at),
      status: str(r.status, 'submitted'),
      totalScore: (r.total_score as number | null) ?? null,
      maxScore: (r.max_score as number | null) ?? null,
      passed: (r.passed as boolean | null) ?? null,
      answers: Object.fromEntries(
        ((r.answers as { question_id: string; answer_value: AnswerValue }[] | null) ?? []).map((a) => [a.question_id, a.answer_value]),
      ),
    }
  },

  async deleteResponse(formId, responseId) {
    const sb = await userClient()
    const { error } = await sb.from('responses').delete().eq('id', responseId).eq('form_id', formId)
    return !error
  },

  async getAnswerValues(formId) {
    const sb = await userClient()
    const { data: answers, error } = await sb
      .from('answers')
      .select('question_id, answer_value')
      .eq('responses.form_id', formId)
      .limit(50_000)
    if (error || !answers) return {}
    const map: Record<string, AnswerValue[]> = {}
    for (const a of answers as { question_id: string; answer_value: AnswerValue }[]) {
      ;(map[a.question_id] ??= []).push(a.answer_value)
    }
    return map
  },

  async overviewStats(ownerId) {
    const sb = await userClient()
    const { data: forms } = await sb
      .from('forms')
      .select('id, status')
      .eq('owner_id', ownerId)
    const list = (forms ?? []) as Row[]
    const ids = list.map((f) => str(f.id))
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

    let totalResponses = 0
    let recentResponses = 0
    const dailyMap = new Map<string, number>()
    for (let i = 6; i >= 0; i--) {
      dailyMap.set(new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10), 0)
    }
    if (ids.length) {
      const admin = adminClient()
      const { count } = await admin.from('responses').select('id', { count: 'exact', head: true }).in('form_id', ids)
      totalResponses = count ?? 0
      const { data: recent } = await admin
        .from('responses')
        .select('submitted_at')
        .in('form_id', ids)
        .gte('submitted_at', weekAgo)
      recentResponses = recent?.length ?? 0
      for (const r of recent ?? []) {
        const key = String((r as Row).submitted_at).slice(0, 10)
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1)
      }
    }

    return {
      totalForms: list.length,
      publishedForms: list.filter((f) => f.status === 'published').length,
      totalResponses,
      recentResponses,
      daily: [...dailyMap.entries()].map(([date, count]) => ({ date, count })),
    }
  },

  async saveUploadedFile(input) {
    const admin = adminClient()
    const { data, error } = await admin
      .from('uploaded_files')
      .insert({ form_id: input.formId, path: input.path, name: input.name, mime: input.mime, size: input.size })
      .select('id')
      .single()
    if (error) throw new Error(mapError(error) ?? '')
    return str((data as Row).id)
  },

  async getUploadedFile(fileId) {
    const admin = adminClient()
    const { data } = await admin.from('uploaded_files').select('*').eq('id', fileId).maybeSingle()
    if (!data) return null
    const r = data as Row
    return { id: str(r.id), formId: str(r.form_id), path: str(r.path), name: str(r.name), mime: str(r.mime), size: Number(r.size) }
  },

  async saveAiAnalysis(formId, ownerId, input) {
    // User-scoped client → RLS verifies ownership on INSERT (with check).
    const sb = await userClient()
    const { data, error } = await sb
      .from('ai_analyses')
      .insert({
        form_id: formId,
        analysis: input.analysis,
        model: input.model,
        provider: input.provider,
        responses_count: input.responsesCount,
      })
      .select('id, form_id, analysis, model, provider, responses_count, created_at')
      .single()
    if (error) throw new Error(mapError(error) ?? '')
    return toSavedAiAnalysis(data as Row)
  },

  async getLatestAiAnalysis(formId, ownerId) {
    const sb = await userClient()
    // Explicit ownership check keeps parity with the local backend; RLS
    // enforces the same rule again inside PostgreSQL.
    const { data: owned } = await sb
      .from('forms')
      .select('id')
      .eq('id', formId)
      .eq('owner_id', ownerId)
      .maybeSingle()
    if (!owned) return null
    const { data, error } = await sb
      .from('ai_analyses')
      .select('id, form_id, analysis, model, provider, responses_count, created_at')
      .eq('form_id', formId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(mapError(error) ?? '')
    if (!data) return null
    return toSavedAiAnalysis(data as Row)
  },
}

function toSavedAiAnalysis(r: Row): SavedAiAnalysis {
  const a = (r.analysis && typeof r.analysis === 'object' ? r.analysis : {}) as Partial<AiAnalysisData>
  return {
    id: str(r.id),
    formId: str(r.form_id),
    analysis: {
      summary: typeof a.summary === 'string' ? a.summary : '',
      insights: Array.isArray(a.insights) ? (a.insights as string[]) : [],
      anomalies: Array.isArray(a.anomalies) ? (a.anomalies as string[]) : [],
      suggestions: Array.isArray(a.suggestions) ? (a.suggestions as string[]) : [],
    },
    model: str(r.model),
    provider: str(r.provider, 'zai'),
    responsesCount: typeof r.responses_count === 'number' ? r.responses_count : 0,
    createdAt: str(r.created_at, new Date().toISOString()),
  }
}

function genPublicId(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  for (const b of bytes) s += alphabet[b % alphabet.length]
  return s
}
