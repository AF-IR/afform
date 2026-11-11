import { getCurrentUser } from '@/lib/auth/service'
import { backend } from '@/lib/forms/service'
import { toCsv, toXlsx, toJson, type ExportRow } from '@/lib/exports/exporters'
import { jsonError } from '@/lib/api-helpers'
import type { AnswerValue } from '@/types'

type Params = { params: Promise<{ formId: string }> }

/**
 * CSV / Excel / JSON export — ownership is verified server-side before any
 * data leaves the system. Values are sanitized against CSV injection.
 */
export async function GET(req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  const { formId } = await params

  const url = new URL(req.url)
  const format = (url.searchParams.get('format') ?? 'csv').toLowerCase()
  if (!['csv', 'xlsx', 'json'].includes(format)) return jsonError('قالب خروجی نامعتبر است', 422)

  try {
    const form = await backend().getForm(formId, user.id)
    if (!form) return jsonError('فرم یافت نشد', 404)

    const { rows } = await backend().listResponses(formId, { limit: 10_000, order: 'asc' })
    const questions = form.questions
    const exportRows: ExportRow[] = rows.map((r) => ({
      responseId: r.responseId,
      submittedAt: r.submittedAt,
      status: r.status,
      totalScore: r.totalScore,
      maxScore: r.maxScore,
      passed: r.passed,
      respondentName: r.respondentName,
      respondentNationalId: r.respondentNationalId,
      answers: r.answers as Record<string, AnswerValue>,
    }))

    const stamp = new Date().toISOString().slice(0, 10)
    const base = `arsham-form-${form.publicId}-${stamp}`

    if (format === 'csv') {
      const csv = toCsv(form, questions, exportRows)
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${base}.csv"`,
        },
      })
    }
    if (format === 'xlsx') {
      const buf = toXlsx(form, questions, exportRows)
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${base}.xlsx"`,
        },
      })
    }
    const json = toJson(form, questions, exportRows)
    return new Response(json, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${base}.json"`,
      },
    })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'خطا در تولید خروجی', 500)
  }
}
