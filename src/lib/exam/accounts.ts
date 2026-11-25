import crypto from 'node:crypto'
import type { ExamAccount } from '@/types'

/**
 * Exam access accounts — the professional replacement for the legacy
 * national-ID gate. The exam creator defines one account per participant
 * (e.g. a teacher defines student accounts). The participant:
 *   1. enters the exam with username + password,
 *   2. takes the exam exactly once (server-side attempt counting keyed on
 *      the ACCOUNT — stronger than a per-browser cookie),
 *   3. views their score later on the result page with the SAME credentials.
 *
 * This module is intentionally dependency-free so it can run on the server
 * (the only authority) and in the browser (fast feedback).
 */

const USERNAME_RE = /^[a-zA-Z0-9._@-]{2,64}$/

/** Normalize a username: trim + lowercase. Returns null when invalid. */
export function normalizeUsername(raw: string | null | undefined): string | null {
  if (!raw) return null
  const u = String(raw).trim().toLowerCase()
  if (!USERNAME_RE.test(u)) return null
  return u
}

/**
 * Stable respondent key for an exam account. Because it is derived from the
 * username alone, the server-side "one attempt per account" rule works on
 * every device — not just the browser that submitted.
 */
export function examAccountKey(username: string): string {
  const u = normalizeUsername(username)
  if (!u) throw new Error('invalid exam username')
  return `acct:${crypto.createHash('sha256').update(`af-exam-account:${u}`).digest('hex').slice(0, 32)}`
}

/**
 * Verify credentials against the exam's account list (server-side authority).
 * Comparison is exact for the password; username matching is normalized.
 */
export function verifyAccountCredentials(
  accounts: ExamAccount[] | null | undefined,
  usernameRaw: string | null | undefined,
  passwordRaw: string | null | undefined,
): { ok: true; account: ExamAccount; username: string } | { ok: false; reason: 'invalid' | 'format' } {
  const username = normalizeUsername(usernameRaw)
  const password = typeof passwordRaw === 'string' ? passwordRaw : ''
  if (!username || !password) return { ok: false, reason: 'format' }
  if (!accounts || accounts.length === 0) return { ok: false, reason: 'invalid' }
  const account = accounts.find((a) => normalizeUsername(a.username) === username)
  if (!account || account.password !== password) return { ok: false, reason: 'invalid' }
  return { ok: true, account, username }
}

/**
 * Parse the bulk-import textarea. One account per line:
 *   username,password[,نام و نام خانوادگی]
 * Lines without a comma use the username as a password-less entry and are
 * rejected (every account must have a password). Duplicates (same username)
 * keep the first occurrence.
 */
export function parseExamAccountsText(text: string | null | undefined): { accounts: ExamAccount[]; invalidLines: number } {
  if (!text) return { accounts: [], invalidLines: 0 }
  const seen = new Set<string>()
  const accounts: ExamAccount[] = []
  let invalidLines = 0
  for (const line of String(text).split(/\r?\n/)) {
    const raw = line.trim()
    if (!raw) continue
    const parts = raw.split(/[,،;]/).map((p) => p.trim())
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      invalidLines++
      continue
    }
    const username = normalizeUsername(parts[0])
    const password = parts[1]
    if (!username || !password || password.length < 1 || password.length > 64) {
      invalidLines++
      continue
    }
    if (seen.has(username)) continue
    seen.add(username)
    const name = parts[2] ? parts.slice(2).join(' ').slice(0, 120) : undefined
    accounts.push({ username, password, ...(name ? { name } : {}) })
  }
  return { accounts, invalidLines }
}

/** Serialize accounts back to the bulk textarea (for editing round-trips). */
export function serializeExamAccountsText(accounts: ExamAccount[] | null | undefined): string {
  if (!accounts?.length) return ''
  return accounts.map((a) => [a.username, a.password, a.name ?? ''].filter((x, i) => i < 2 || x).join(',')).join('\n')
}

const PW_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

/** Generate a pronounceable-enough random password (no ambiguous chars). */
function randomPassword(length = 6): string {
  const bytes = crypto.randomBytes(length)
  let s = ''
  for (const b of bytes) s += PW_ALPHABET[b % PW_ALPHABET.length]
  return s
}

/**
 * Auto-generate student accounts: prefix01..prefixN with random passwords.
 * Used by the «تولید خودکار اکانت‌ها» button in the builder.
 */
export function generateExamAccounts(count: number, prefix: string, startIndex = 1): ExamAccount[] {
  const n = Math.max(1, Math.min(2000, Math.floor(count)))
  const p = (prefix || 'student').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'student'
  const accounts: ExamAccount[] = []
  for (let i = 0; i < n; i++) {
    const num = startIndex + i
    accounts.push({
      username: `${p}${String(num).padStart(2, '0')}`,
      password: randomPassword(6),
    })
  }
  return accounts
}
