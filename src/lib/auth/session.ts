import 'server-only'
import crypto from 'node:crypto'

/**
 * Local preview-mode sessions: HMAC-signed cookie (no DB round-trip).
 * In Supabase mode Supabase Auth manages sessions instead.
 */

export const SESSION_COOKIE = 'af_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface LocalSessionPayload {
  uid: string
  email: string
  name: string
  iat: number
  exp: number
}

function getSecret(): string {
  const secret = process.env.LOCAL_AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('LOCAL_AUTH_SECRET is not configured (local preview mode)')
  }
  return secret
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url')
}

export function signSession(payload: Omit<LocalSessionPayload, 'iat' | 'exp'>): { token: string; maxAge: number } {
  const now = Math.floor(Date.now() / 1000)
  const full: LocalSessionPayload = { ...payload, iat: now, exp: now + SESSION_MAX_AGE }
  const body = b64url(JSON.stringify(full))
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url')
  return { token: `${body}.${sig}`, maxAge: SESSION_MAX_AGE }
}

export function verifySessionToken(token: string | undefined | null): LocalSessionPayload | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as LocalSessionPayload
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

/** Stable anonymous respondent key derived from ip+ua (privacy-preserving hash). */
export function respondentKey(ip: string, userAgent: string): string {
  return sha256(`rk:${ip}:${userAgent}`).slice(0, 40)
}

/** HMAC-signed attempt token for timed quizzes (server validates elapsed time). */
export interface AttemptPayload {
  formId: string
  startedAt: number // epoch ms
  key: string // respondent key
}

export function signAttemptToken(payload: AttemptPayload): string {
  const body = b64url(JSON.stringify(payload))
  const sig = crypto.createHmac('sha256', getSecret()).update(`attempt:${body}`).digest('base64url')
  return `${body}.${sig}`
}

export function verifyAttemptToken(token: string | undefined | null): AttemptPayload | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', getSecret()).update(`attempt:${body}`).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString()) as AttemptPayload
  } catch {
    return null
  }
}
