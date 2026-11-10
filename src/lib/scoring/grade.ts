import type { Question, QuestionScoringResult, QuizResult } from '@/types'

/**
 * Automatic scoring — server-side only.
 * Essay/text questions are never auto-scored (per product spec).
 */

function normalizeChoiceIds(v: unknown): string[] {
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string')
  if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as object)) {
    const cv = (v as { value: unknown }).value
    if (typeof cv === 'string') return [cv]
    if (Array.isArray(cv)) return cv.filter((x): x is string => typeof x === 'string')
  }
  return []
}

function isCorrect(q: Question, answer: unknown): boolean | null {
  const s = q.scoring
  if (!s || s.points <= 0) return null
  switch (q.type) {
    case 'single_choice':
    case 'dropdown': {
      const correct = s.correctChoices ?? []
      if (!correct.length) return null
      const picked = normalizeChoiceIds(answer)
      return picked.length === 1 && correct.includes(picked[0])
    }
    case 'multi_choice':
    case 'multi_choice_comment': {
      const correct = s.correctChoices ?? []
      if (!correct.length) return null
      const picked = normalizeChoiceIds(answer)
      const a = [...picked].sort().join(',')
      const b = [...correct].sort().join(',')
      return a === b
    }
    case 'boolean': {
      if (typeof s.correctBoolean !== 'boolean') return null
      return answer === s.correctBoolean
    }
    case 'number':
    case 'rating_number': {
      const num = typeof answer === 'number' ? answer : typeof answer === 'string' ? Number(answer) : NaN
      if (Number.isNaN(num)) return false
      if (s.acceptRange) return num >= s.acceptRange.min && num <= s.acceptRange.max
      if (typeof s.correctNumber === 'number') return num === s.correctNumber
      return null
    }
    default:
      // text, date, time, file, matrix, ratings → not auto-scored
      return null
  }
}

export function maxAchievableScore(questions: Question[]): number {
  return questions.reduce((sum, q) => sum + (q.scoring?.points ?? 0), 0)
}

export function gradeSubmission(
  questions: Question[],
  answers: Record<string, unknown>,
): QuizResult {
  const perQuestion: QuestionScoringResult[] = []
  let total = 0
  let max = 0

  for (const q of questions) {
    const points = q.scoring?.points ?? 0
    if (points <= 0) continue
    max += points
    const answer = answers[q.id]
    const answered = !(answer === undefined || answer === null || answer === '' ||
      (Array.isArray(answer) && answer.length === 0))
    if (!answered) {
      perQuestion.push({ questionId: q.id, earned: 0, max: points, correct: false })
      continue
    }
    const correct = isCorrect(q, answer)
    if (correct === null) {
      // not auto-scoreable → excluded from automatic total
      continue
    }
    const earned = correct ? points : 0
    total += earned
    perQuestion.push({ questionId: q.id, earned, max: points, correct })
  }

  return { totalScore: round2(total), maxScore: round2(max), passed: null, perQuestion }
}

export function isPassed(result: QuizResult, passingScorePercent: number | null): boolean | null {
  if (passingScorePercent === null || result.maxScore <= 0) return null
  return (result.totalScore / result.maxScore) * 100 >= passingScorePercent
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
