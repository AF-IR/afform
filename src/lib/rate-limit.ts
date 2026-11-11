import 'server-only'

/**
 * Simple in-memory sliding-window rate limiter.
 *
 * LIMITATION (documented per product spec §17): in serverless environments
 * (Vercel functions) memory is per-instance, so this protects a single warm
 * instance only. For distributed rate limiting use a shared store such as
 * Upstash Redis (free tier available) — see README "محدودسازی نرخ".
 * The in-memory limiter is still effective in the local/standalone deployment.
 */

type Bucket = { hits: number[] }

const buckets = new Map<string, Bucket>()

const MAX_KEYS = 10_000

export interface RateLimitResult {
  allowed: boolean
  retryAfterSec: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()

  // periodic cleanup to avoid unbounded growth
  if (buckets.size > MAX_KEYS) {
    for (const [k, b] of buckets) {
      if (!b.hits.length || now - b.hits[b.hits.length - 1] > windowMs * 2) buckets.delete(k)
      if (buckets.size <= MAX_KEYS * 0.8) break
    }
  }

  const bucket = buckets.get(key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs)

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0]
    buckets.set(key, bucket)
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)) }
  }

  bucket.hits.push(now)
  buckets.set(key, bucket)
  return { allowed: true, retryAfterSec: 0 }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
