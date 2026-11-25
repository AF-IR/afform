import { backend, checkExamAccountGate, isResultReleased } from '@/lib/forms/service'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { gradeSubmission } from '@/lib/scoring/grade'
import { computeVisibleQuestions } from '@/lib/forms/conditional'

type Params = { params: Promise<{ publicId: string }> }

/**
 * Exam result lookup — the participant logs in with the SAME username/password
 * the creator defined for them and sees their score (when the release policy
 * allows it). The browser is never trusted: credentials are re-verified and
 * the score is recomputed from the stored answers on the server.
 */
export async function POST(req: Request, { params }: Params) {
  const rl = rateLimit(`result:${clientIp(req)}`, 12, 60_000)
  if (!rl.allowed) return jsonError('تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید', 429, { code: 'rate_limited' })

  const { publicId } = await params
  const body = await readJson<{ exam?: { username?: string; password?: string } }>(req, 8 * 1024)
  if (!body) return jsonError('ساختار درخواست نامعتبر است', 413)

  try {
    const form = await backend().getFormByPublicId(publicId)
    if (!form || form.status === 'draft') return jsonError('فرم یافت نشد', 404)

    if (form.formType !== 'quiz') {
      return jsonError('این فرم آزمون نیست و نتیجه‌ای برای نمایش ندارد', 400, { code: 'not_quiz' })
    }
    if (!form.settings.examAccounts?.enabled) {
      return jsonError('این آزمون با اکانت کاربری اجرا نمی‌شود؛ نتیجه را از برگزارکننده پیگیری کنید', 400, { code: 'no_accounts' })
    }

    // credentials are re-verified on the server — every single time
    const gate = checkExamAccountGate(form.settings, body.exam)
    if (!gate.ok) return jsonError(gate.message, 401, { code: gate.code })

    const row = await backend().getLatestResponseByKey(form.id, gate.key)
    if (!row) {
      return jsonOk({
        found: false,
        participantName: gate.name,
        released: false,
        releaseAt: null,
        result: null,
      })
    }

    const release = isResultReleased(form.settings, row.submittedAt, row.startedAt)

    // re-grade from stored answers so the shown score matches the server truth
    const questions = [...form.questions].sort((a, b) => a.position - b.position)
    const visible = computeVisibleQuestions(questions, row.answers)
    const graded = gradeSubmission(questions.filter((q) => visible.has(q.id)), row.answers)

    return jsonOk({
      found: true,
      participantName: row.respondentName ?? gate.name,
      released: release.released,
      releaseAt: release.releaseAt,
      submittedAt: row.submittedAt,
      result: release.released
        ? {
            totalScore: graded.totalScore,
            maxScore: graded.maxScore,
            passed: form.settings.passingScorePercent !== null
              ? graded.maxScore > 0 && (graded.totalScore / graded.maxScore) * 100 >= form.settings.passingScorePercent
              : row.passed,
            perQuestion: graded.perQuestion.map((p) => {
              const q = questions.find((x) => x.id === p.questionId)
              return {
                questionId: p.questionId,
                title: q?.title ?? p.questionId,
                earned: p.earned,
                max: p.max,
                correct: p.correct,
              }
            }),
          }
        : null,
    })
  } catch (e) {
    console.error('exam result failed:', e instanceof Error ? `${e.message}\n${e.stack}` : e)
    return jsonError('خطای سرور در دریافت نتیجه', 500)
  }
}
