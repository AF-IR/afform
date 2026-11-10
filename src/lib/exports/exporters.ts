import 'server-only'
import * as XLSX from 'xlsx'
import type { AnswerValue, ChoiceAnswerValue, FileAnswer, FormSummary, Question } from '@/types'

/**
 * Response export utilities (CSV / Excel / JSON) — generated from stored data.
 * All values are sanitized against CSV/formula injection (=, +, -, @ prefixes).
 */

const DANGEROUS_PREFIX = /^[=+\-@\t\r]/

function sanitizeCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  if (DANGEROUS_PREFIX.test(s)) return `'${s}`
  return s
}

function stringifyAnswer(q: Question, value: AnswerValue): string {
  if (value === null || value === undefined) return ''
  switch (q.type) {
    case 'multi_choice':
    case 'multi_choice_comment': {
      const ids: string[] = []
      if (Array.isArray(value)) ids.push(...value as string[])
      else if (typeof value === 'object' && 'value' in (value as object)) {
        const cv = (value as ChoiceAnswerValue).value
        if (Array.isArray(cv)) ids.push(...cv as string[])
      }
      const map = new Map((q.config.choices ?? []).map((c) => [c.id, c.label]))
      const labels = ids.map((id) => (id === '__other__' ? `سایر: ${((value as ChoiceAnswerValue).text ?? '')}` : map.get(id) ?? id))
      if (q.type === 'multi_choice_comment') {
        const comment = (value as ChoiceAnswerValue).comment ?? ''
        return `${labels.join(' | ')}${comment ? ` — توضیح: ${comment}` : ''}`
      }
      return labels.join(' | ')
    }
    case 'single_choice':
    case 'dropdown': {
      if (typeof value === 'string') {
        const map = new Map((q.config.choices ?? []).map((c) => [c.id, c.label]))
        return map.get(value) ?? value
      }
      const cv = value as ChoiceAnswerValue
      if (cv.value === '__other__') return `سایر: ${cv.text ?? ''}`
      const map = new Map((q.config.choices ?? []).map((c) => [c.id, c.label]))
      return map.get(String(cv.value)) ?? String(cv.value)
    }
    case 'boolean':
      return value === true ? 'بله' : 'خیر'
    case 'file': {
      const f = value as FileAnswer
      return `${f.name} (${Math.round(f.size / 1024)}KB)`
    }
    case 'matrix': {
      const rows = q.config.rows ?? []
      const cols = q.config.cols ?? []
      const entries = Object.entries(value as Record<string, string>)
      return entries.map(([r, c]) => `${rows[Number(r)] ?? r}: ${cols.includes(c) ? c : c}`).join(' | ')
    }
    default:
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
  }
}

export interface ExportRow {
  responseId: string
  submittedAt: string
  status: string
  totalScore: number | null
  answers: Record<string, AnswerValue>
}

function buildRows(form: FormSummary, questions: Question[], rows: ExportRow[]): string[][] {
  const header = ['شناسه پاسخ', 'زمان ثبت', 'وضعیت', 'نمره', ...questions.map((q) => q.title || q.type)]
  const body = rows.map((r) => [
    r.responseId,
    r.submittedAt,
    r.status,
    r.totalScore === null ? '' : String(r.totalScore),
    ...questions.map((q) => sanitizeCell(stringifyAnswer(q, r.answers[q.id] ?? null))),
  ])
  return [header, ...body]
}

export function toCsv(form: FormSummary, questions: Question[], rows: ExportRow[]): string {
  const table = buildRows(form, questions, rows).map((row) => row.map(sanitizeCell))
  const csv = table.map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n')
  // UTF-8 BOM so Excel renders Persian correctly
  return '\uFEFF' + csv
}

export function toXlsx(form: FormSummary, questions: Question[], rows: ExportRow[]): Buffer {
  const table = buildRows(form, questions, rows)
  const ws = XLSX.utils.aoa_to_sheet(table)
  ws['!cols'] = table[0].map(() => ({ wch: 22 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'پاسخ‌ها')
  const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return out
}

export function toJson(form: FormSummary, questions: Question[], rows: ExportRow[]): string {
  return JSON.stringify(
    {
      form: { id: form.id, title: form.title, formType: form.formType, publicId: form.publicId },
      exportedAt: new Date().toISOString(),
      count: rows.length,
      responses: rows.map((r) => ({
        responseId: r.responseId,
        submittedAt: r.submittedAt,
        status: r.status,
        totalScore: r.totalScore,
        answers: Object.fromEntries(
          questions.map((q) => [q.id, { type: q.type, title: q.title, value: r.answers[q.id] ?? null }]),
        ),
      })),
    },
    null,
    2,
  )
}
