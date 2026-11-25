import crypto from 'node:crypto'

/**
 * Secure-exam attempt & completion tokens (pure module — no server-only).
 *
 * Two HMAC-signed cookies drive the whole exam lifecycle:
 *
 *  1. ATTEMPT COOKIE `af_attempt_<publicId>`
 *     Issued by POST /start the moment the participant actually begins the
 *     exam. Carries { formId, startedAt, key } so the server clock — never the
 *     browser clock — decides the deadline. Reloading the page resumes the
 *     SAME attempt: the timer keeps running, it does not restart.
 *
 *  2. DONE COOKIE `af_done_<publicId>`
 *     Issued by POST /submit after a successful quiz submission. Blocks
 *     re-entering the exam afterwards (cookie-based re-entry prevention,
 *     backed by server-side attempt counting for non-cookie clients).
 *
 * The signing secret is resilient in production: LOCAL_AUTH_SECRET when set,
 * otherwise a server-only hash of the Supabase service-role key. A missing
 * LOCAL_AUTH_SECRET on Vercel must never 500 the exam start endpoint.
 */

export interface AttemptPayload {
  formId: string
  startedAt: number // epoch ms, server clock
  key: string // respondent key (hash of ip+ua or user:<id>)
}

export interface DonePayload {
  formId: string
  key: string
  at: number // epoch ms, server clock
}

export function attemptCookieName(publicId: string): string {
  return `af_attempt_${publicId}`
}

export function doneCookieName(publicId: string): string {
  return `af_done_${publicId}`
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url')
}

function sha256hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

/** Exam signing secret — server-only material, resilient in production. */
function getExamSecret(): string {
  const local = process.env.LOCAL_AUTH_SECRET
  if (local && local.length >= 16) return `exam:${local}`
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey && serviceKey.length >= 16) return `exam:${sha256hex(`af-exam:${serviceKey}`)}`
  throw new Error('no exam signing secret available (set LOCAL_AUTH_SECRET or SUPABASE_SERVICE_ROLE_KEY)')
}

function hmac(value: string, scope: string): string {
  return crypto.createHmac('sha256', getExamSecret()).update(`${scope}:${value}`).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)
}

// ---------- attempt token ----------

export function signAttemptToken(payload: AttemptPayload): string {
  const body = b64url(JSON.stringify(payload))
  const sig = hmac(body, 'attempt')
  return `${body}.${sig}`
}

export function verifyAttemptToken(token: string | undefined | null): AttemptPayload | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  if (!safeEqual(sig, hmac(body, 'attempt'))) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as AttemptPayload
    if (typeof payload.formId !== 'string' || typeof payload.startedAt !== 'number' || typeof payload.key !== 'string') return null
    return payload
  } catch {
    return null
  }
}

// ---------- completion (done) token ----------

export function signDoneToken(formId: string, key: string): string {
  const payload: DonePayload = { formId, key, at: Date.now() }
  const body = b64url(JSON.stringify(payload))
  const sig = hmac(body, 'done')
  return `${body}.${sig}`
}

/** Verify a done cookie belongs to this form (and optionally this respondent). */
export function verifyDoneToken(token: string | undefined | null, formId: string, key?: string): DonePayload | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  if (!safeEqual(sig, hmac(body, 'done'))) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as DonePayload
    if (payload.formId !== formId) return null
    if (key !== undefined && payload.key !== key) return null
    if (typeof payload.at !== 'number') return null
    return payload
  } catch {
    return null
  }
}

// ---------- deadline helpers ----------

/** Server-authoritative deadline (epoch ms) for a timed exam. */
export function examDeadline(startedAt: number, timeLimitMinutes: number): number {
  return startedAt + timeLimitMinutes * 60_000
}

/** Grace period (seconds) tolerating slow networks on in-flight submissions. */
export const EXAM_GRACE_SEC = 90

/** Remaining seconds of a timed attempt (never negative). */
export function remainingSeconds(deadline: number, now: number): number {
  return Math.max(0, Math.floor((deadline - now) / 1000))
}

/** True when the attempt has overran its limit (beyond the grace window). */
export function isAttemptExpired(startedAt: number, timeLimitMinutes: number, now: number): boolean {
  const limit = examDeadline(startedAt, timeLimitMinutes) + EXAM_GRACE_SEC * 1000
  return now > limit
}
