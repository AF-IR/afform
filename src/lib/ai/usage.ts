import 'server-only'
import { isSupabaseConfigured } from '@/lib/env'
import {
  type AiUsageKind,
  type AiUsageSnapshot,
  isWithinQuota,
  limitsForPlan,
  tehranDayKey,
} from './usage-rules'

export {
  type AiUsageKind,
  type AiUsageSnapshot,
  type UsageWindow,
  FREE_DAILY_LIMITS,
  limitsForPlan,
  remaining,
  quotaMessage,
  tehranDayKey,
} from './usage-rules'

/**
 * Daily AI usage tracking — stored in Supabase (`ai_usage` + `profiles.plan`),
 * enforced server-side so quotas cannot be bypassed from the browser.
 *
 * Free plan:   2 AI questionnaire generations / day + 2 AI analyses / day
 * Pro plan:    unlimited (usage is still recorded)
 * Day boundary: Asia/Tehran (the product's primary timezone).
 */

/** Local preview mode (no Supabase) — per-process fallback storage. */
const localStore = new Map<string, { generate: number; analyze: number }>()

interface UsageRow {
  generated_count: number
  analysis_count: number
}

async function readRow(userKey: string, dateKey: string): Promise<{ generate: number; analyze: number }> {
  const { adminClient } = await import('@/lib/forms/backend-supabase')
  const { data } = await adminClient()
    .from('ai_usage')
    .select('generated_count, analysis_count')
    .eq('user_id', userKey)
    .eq('usage_date', dateKey)
    .maybeSingle<UsageRow>()
  return { generate: data?.generated_count ?? 0, analyze: data?.analysis_count ?? 0 }
}

async function readPlan(userId: string): Promise<'free' | 'pro'> {
  const { adminClient } = await import('@/lib/forms/backend-supabase')
  const { data } = await adminClient()
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .maybeSingle<{ plan: string | null }>()
  return data?.plan === 'pro' ? 'pro' : 'free'
}

/** Current usage snapshot for a user (read-only; never throws for missing rows). */
export async function getAiUsage(userId: string): Promise<AiUsageSnapshot> {
  const dateKey = tehranDayKey()
  let plan: 'free' | 'pro' = 'free'
  let counts = { generate: 0, analyze: 0 }

  if (isSupabaseConfigured()) {
    try {
      plan = await readPlan(userId)
      counts = await readRow(userId, dateKey)
    } catch {
      // table/plan column may not exist yet (migration pending) — treat as free with zero usage
    }
  } else {
    counts = localStore.get(`${userId}:${dateKey}`) ?? counts
  }

  const limits = limitsForPlan(plan)
  return {
    dateKey,
    plan,
    generate: { used: counts.generate, limit: limits.generate },
    analyze: { used: counts.analyze, limit: limits.analyze },
  }
}

/**
 * Check the daily quota for a kind. Returns `{ allowed, snapshot }` —
 * when not allowed, `snapshot` carries the full state for the UI message.
 */
export async function checkAiQuota(
  userId: string,
  kind: AiUsageKind,
): Promise<{ allowed: boolean; snapshot: AiUsageSnapshot }> {
  const snapshot = await getAiUsage(userId)
  const allowed = isWithinQuota(snapshot[kind].limit, snapshot[kind].used)
  return { allowed, snapshot }
}

/** Record one successful AI operation (called AFTER the operation succeeded). */
export async function recordAiUsage(userId: string, kind: AiUsageKind): Promise<void> {
  const dateKey = tehranDayKey()

  if (isSupabaseConfigured()) {
    try {
      const { adminClient } = await import('@/lib/forms/backend-supabase')
      const current = await readRow(userId, dateKey)
      const next = {
        generated_count: kind === 'generate' ? current.generate + 1 : current.generate,
        analysis_count: kind === 'analyze' ? current.analyze + 1 : current.analyze,
      }
      await adminClient()
        .from('ai_usage')
        .upsert(
          { user_id: userId, usage_date: dateKey, ...next, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,usage_date' },
        )
    } catch {
      // usage bookkeeping must never break the actual AI operation
    }
    return
  }

  const key = `${userId}:${dateKey}`
  const current = localStore.get(key) ?? { generate: 0, analyze: 0 }
  localStore.set(key, { ...current, [kind]: current[kind] + 1 })
}
