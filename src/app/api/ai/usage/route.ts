import { getCurrentUser } from '@/lib/auth/service'
import { jsonError, jsonOk } from '@/lib/api-helpers'
import { getAiUsage } from '@/lib/ai/usage'

/**
 * Daily AI quota snapshot for the signed-in user.
 * GET → { ok, plan, generate: { used, limit }, analyze: { used, limit } }
 * limit=null means unlimited (pro plan). Shared with the UI so the free-plan
 * quota ("۲ ساخت و ۲ تحلیل در روز") is always visible before the user acts.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  try {
    const snapshot = await getAiUsage(user.id)
    return jsonOk({
      plan: snapshot.plan,
      dateKey: snapshot.dateKey,
      generate: snapshot.generate,
      analyze: snapshot.analyze,
    })
  } catch {
    return jsonError('خطا در دریافت سهمیه', 500)
  }
}
