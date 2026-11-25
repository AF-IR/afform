/**
 * Pure, testable rules for the daily AI quota — no server-only imports here
 * so unit tests (bun) and any runtime can consume them.
 */

export type AiUsageKind = 'generate' | 'analyze'

export const FREE_DAILY_LIMITS: Record<AiUsageKind, number> = {
  generate: 2,
  analyze: 2,
}

export interface UsageWindow {
  used: number
  limit: number | null // null = unlimited (pro)
}

export interface AiUsageSnapshot {
  dateKey: string
  plan: 'free' | 'pro'
  generate: UsageWindow
  analyze: UsageWindow
}

/** YYYY-MM-DD key for a moment, in Asia/Tehran — stable across the Persian day. */
export function tehranDayKey(date: Date = new Date()): string {
  // en-CA yields ISO-like YYYY-MM-DD in the requested timezone
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function limitsForPlan(plan: 'free' | 'pro'): Record<AiUsageKind, number | null> {
  if (plan === 'pro') return { generate: null, analyze: null }
  return { generate: FREE_DAILY_LIMITS.generate, analyze: FREE_DAILY_LIMITS.analyze }
}

export function remaining(limit: number | null, used: number): number | null {
  if (limit === null) return null
  return Math.max(0, limit - used)
}

/** Friendly Persian message shown when the free daily quota is exhausted. */
export function quotaMessage(kind: AiUsageKind, plan: 'free' | 'pro', dateKey: string): string {
  const label = kind === 'generate' ? 'ساخت پرسش‌نامه با هوش مصنوعی' : 'تحلیل هوش مصنوعی نتایج'
  const tomorrow = describeTomorrow(dateKey)
  return `سهمیه روزانهٔ ${label} در پلن رایگان (${FREE_DAILY_LIMITS[kind]} بار در روز) تمام شده است؛ ${tomorrow} دوباره در دسترس خواهد بود یا می‌توانید پلن حرفه‌ای را فعال کنید.`
}

function describeTomorrow(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  const fa = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', month: 'long', day: 'numeric' })
  return `از ${fa.format(next)}`
}

/** The single quota check used by both AI endpoints (pure). */
export function isWithinQuota(limit: number | null, used: number): boolean {
  return limit === null || used < limit
}
