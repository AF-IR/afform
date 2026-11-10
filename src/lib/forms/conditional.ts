import type { AnswerValue, ChoiceAnswerValue, ConditionalRule, Question } from '@/types'
import { OTHER_CHOICE_ID } from '@/types'

/**
 * Declarative conditional logic evaluation — no user code is ever executed.
 * Rules are evaluated against answers collected so far, in question order.
 */

function numericOf(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isNaN(n) ? null : n
  }
  return null
}

function evalRule(rule: ConditionalRule, answers: Record<string, unknown>): boolean {
  const raw = answers[rule.questionId]
  const answered = !(raw === undefined || raw === null || raw === '' ||
    (Array.isArray(raw) && raw.length === 0))

  switch (rule.operator) {
    case 'answered':
      return answered
    case 'not_answered':
      return !answered
    case 'equals': {
      const target = rule.value ?? ''
      if (typeof raw === 'boolean') return String(raw) === target
      if (typeof raw === 'number') return String(raw) === target
      if (typeof raw === 'string') return raw === target
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'value' in (raw as object)) {
        const cv = raw as ChoiceAnswerValue
        if (typeof cv.value === 'string') {
          if (cv.value === target) return true
          if (target === OTHER_CHOICE_ID) return cv.value === OTHER_CHOICE_ID
        }
      }
      return false
    }
    case 'not_equals': {
      const target = rule.value ?? ''
      if (!answered) return false
      if (typeof raw === 'boolean' || typeof raw === 'number' || typeof raw === 'string') {
        return String(raw) !== target
      }
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'value' in (raw as object)) {
        const cv = raw as ChoiceAnswerValue
        return typeof cv.value === 'string' ? cv.value !== target : true
      }
      return true
    }
    case 'includes': {
      const target = rule.value ?? ''
      const ids: string[] = []
      if (Array.isArray(raw)) ids.push(...raw.filter((x): x is string => typeof x === 'string'))
      else if (typeof raw === 'string') ids.push(raw)
      else if (raw && typeof raw === 'object' && 'value' in (raw as object)) {
        const cv = (raw as ChoiceAnswerValue).value
        if (typeof cv === 'string') ids.push(cv)
        else if (Array.isArray(cv)) ids.push(...cv.filter((x): x is string => typeof x === 'string'))
      }
      return ids.includes(target)
    }
    case 'gt':
    case 'lt': {
      const a = numericOf(raw)
      const b = numericOf(rule.value)
      if (a === null || b === null) return false
      return rule.operator === 'gt' ? a > b : a < b
    }
  }
}

export function evalCondition(q: Question, answers: Record<string, unknown>): boolean {
  const rules = q.conditionalRules
  if (!rules || rules.length === 0) return true
  if (q.conditionalMode === 'all') return rules.every((r) => evalRule(r, answers))
  return rules.some((r) => evalRule(r, answers))
}

/**
 * Compute the set of visible question ids given collected answers.
 * Iterates questions in position order (conditions may only reference
 * earlier questions — enforced at save time in the builder UI and API).
 */
export function computeVisibleQuestions(
  questions: Question[],
  answers: Record<string, unknown>,
): Set<string> {
  const visible = new Set<string>()
  for (const q of questions) {
    if (evalCondition(q, answers)) {
      visible.add(q.id)
    }
  }
  return visible
}

/** Check that a rule's source question appears earlier than the target question. */
export function ruleReferencesEarlierQuestion(
  questions: Question[],
  targetId: string,
  rules: ConditionalRule[] | null,
): boolean {
  if (!rules?.length) return true
  const idx = new Map(questions.map((q, i) => [q.id, i]))
  const targetIdx = idx.get(targetId)
  if (targetIdx === undefined) return false
  return rules.every((r) => {
    const srcIdx = idx.get(r.questionId)
    return srcIdx !== undefined && srcIdx < targetIdx
  })
}
