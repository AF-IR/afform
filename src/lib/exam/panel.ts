import 'server-only'
import { backend } from '@/lib/forms/service'
import { examAccountKey } from '@/lib/exam/accounts'
import type { FormSummary, Question } from '@/types'

/**
 * Exam panel — aggregation helpers for the dedicated /dashboard/exams panel.
 *
 * Everything is computed from REAL stored responses (no demo data). The
 * respondent key of an exam that uses access accounts is derived from the
 * username (`acct:<hash>`), so results can be attributed to the exact
 * student account the creator defined.
 */

export interface ExamAttemptRow {
  responseId: string
  submittedAt: string
  startedAt: string | null
  /** minutes between start and submit (server clocks) */
  durationSec: number | null
  totalScore: number | null
  maxScore: number | null
  percent: number | null
  passed: boolean | null
  /** matched student account (when the exam uses username/password accounts) */
  username: string | null
  displayName: string | null
  respondentName: string | null
}

export interface ExamStats {
  /** accounts defined by the creator (students allowed to enter) */
  accountsDefined: number
  /** how many accounts have already submitted */
  accountsSubmitted: number
  totalAttempts: number
  averagePercent: number | null
  passRatePercent: number | null
  passedCount: number
  failedCount: number
  gradedCount: number
  /** scoreable questions (with points > 0) */
  scoreableQuestions: number
  totalQuestions: number
  maxScoreSum: number
  attempts: ExamAttemptRow[]
}

export function isExam(form: FormSummary): boolean {
  return form.formType === 'quiz'
}

/** Result-release summary line for the panel cards. */
export function resultReleaseLabel(form: FormSummary): string {
  const s = form.settings
  if (!s.showResultsToRespondent) return 'عدم نمایش نتیجه به شرکت‌کننده'
  switch (s.resultRelease) {
    case 'afterEnd':
      return 'نمایش نتیجه پس از پایان آزمون'
    case 'scheduled':
      return s.resultReleaseAt ? `نمایش نتیجه در زمان مقرر` : 'نمایش نتیجه در زمان مقرر'
    default:
      return 'نمایش نتیجه بلافاصله'
  }
}

export async function computeExamStats(
  form: FormSummary & { questions: Question[] },
): Promise<ExamStats> {
  const b = backend()
  const { rows } = await b.listResponses(form.id, { limit: 5000, order: 'desc' })

  const s = form.settings
  const accounts = s.examAccounts?.enabled ? s.examAccounts.accounts : null

  // key → account lookup (server-side attribution of attempts to students)
  const keyToAccount = new Map<string, { username: string; name?: string }>()
  if (accounts) {
    for (const a of accounts) {
      try {
        keyToAccount.set(examAccountKey(a.username), { username: a.username, name: a.name })
      } catch {
        // invalid username in the list — skip
      }
    }
  }

  const attempts: ExamAttemptRow[] = rows.map((r) => {
    const account = keyToAccount.get(r.respondentKey ?? '') ?? null
    const percent =
      r.totalScore !== null && r.maxScore !== null && r.maxScore > 0
        ? Math.round((r.totalScore / r.maxScore) * 1000) / 10
        : null
    const durationSec =
      r.startedAt && r.submittedAt
        ? Math.max(0, Math.round((new Date(r.submittedAt).getTime() - new Date(r.startedAt).getTime()) / 1000))
        : null
    return {
      responseId: r.responseId ?? r.submittedAt,
      submittedAt: r.submittedAt,
      startedAt: r.startedAt,
      durationSec,
      totalScore: r.totalScore,
      maxScore: r.maxScore,
      percent,
      passed: r.passed,
      username: account?.username ?? null,
      displayName: account?.name ?? null,
      respondentName: r.respondentName,
    }
  })

  const percents = attempts.map((a) => a.percent).filter((p): p is number => p !== null)
  const graded = attempts.filter((a) => a.totalScore !== null)
  const passed = graded.filter((a) => a.passed === true).length
  const failed = graded.filter((a) => a.passed === false).length

  // submitted accounts (unique by respondent key) when accounts are used
  let accountsSubmitted = 0
  if (accounts) {
    const submittedKeys = new Set(rows.map((r) => r.respondentKey ?? ''))
    for (const key of keyToAccount.keys()) if (submittedKeys.has(key)) accountsSubmitted++
  }

  const scoreableQuestions = form.questions.filter((q) => q.scoring && q.scoring.points > 0).length
  const maxScoreSum = form.questions.reduce((sum, q) => sum + (q.scoring?.points ?? 0), 0)

  return {
    accountsDefined: accounts?.length ?? 0,
    accountsSubmitted,
    totalAttempts: attempts.length,
    averagePercent: percents.length ? percents.reduce((a, b) => a + b, 0) / percents.length : null,
    passRatePercent: passed + failed > 0 ? (passed / (passed + failed)) * 100 : null,
    passedCount: passed,
    failedCount: failed,
    gradedCount: graded.length,
    scoreableQuestions,
    totalQuestions: form.questions.length,
    maxScoreSum,
    attempts,
  }
}
