import { describe, expect, test, beforeAll } from 'bun:test'
import {
  attemptCookieName,
  doneCookieName,
  signAttemptToken,
  verifyAttemptToken,
  signDoneToken,
  verifyDoneToken,
  examDeadline,
  isAttemptExpired,
  remainingSeconds,
  EXAM_GRACE_SEC,
} from '../../src/lib/exam/attempt'

describe('exam attempt tokens (امضای توکن جلسهٔ آزمون)', () => {
  beforeAll(() => {
    // resilient secret: works with LOCAL_AUTH_SECRET *or* falls back to the
    // service-role key — Vercel deployments without LOCAL_AUTH_SECRET must
    // never 500 the exam start endpoint
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key-0123456789abcdef'
    delete process.env.LOCAL_AUTH_SECRET
  })

  test('cookie names are stable and namespaced per form', () => {
    expect(attemptCookieName('ab12cd34')).toBe('af_attempt_ab12cd34')
    expect(doneCookieName('ab12cd34')).toBe('af_done_ab12cd34')
  })

  test('sign → verify roundtrip preserves server clock data', () => {
    const token = signAttemptToken({ formId: 'f-1', startedAt: 1700000000000, key: 'rk-abc' })
    const payload = verifyAttemptToken(token)
    expect(payload).not.toBeNull()
    expect(payload!.formId).toBe('f-1')
    expect(payload!.startedAt).toBe(1700000000000)
    expect(payload!.key).toBe('rk-abc')
  })

  test('tampered token is rejected', () => {
    const token = signAttemptToken({ formId: 'f-1', startedAt: 1700000000000, key: 'rk-abc' })
    const forged = token.replace(/.$/, token.endsWith('A') ? 'B' : 'A')
    expect(verifyAttemptToken(forged)).toBeNull()
    expect(verifyAttemptToken('garbage')).toBeNull()
    expect(verifyAttemptToken(null)).toBeNull()
  })

  test('resetting startedAt (timer restart attack) requires the signing key', () => {
    // an attacker cannot re-sign an older startedAt to reset the countdown
    const token = signAttemptToken({ formId: 'f-1', startedAt: Date.now(), key: 'rk-abc' })
    const [body] = token.split('.')
    const reSigned = `${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`
    expect(verifyAttemptToken(reSigned)).toBeNull()
  })

  test('done cookie verifies only for the same form and respondent', () => {
    const token = signDoneToken('f-1', 'rk-abc')
    expect(verifyDoneToken(token, 'f-1', 'rk-abc')).not.toBeNull()
    expect(verifyDoneToken(token, 'f-2', 'rk-abc')).toBeNull() // other form
    expect(verifyDoneToken(token, 'f-1', 'rk-other')).toBeNull() // other respondent
    expect(verifyDoneToken(null, 'f-1')).toBeNull()
  })
})

describe('exam deadline math (محدودیت زمان سمت سرور)', () => {
  const MIN = 60_000

  test('deadline = startedAt + timeLimit', () => {
    expect(examDeadline(1_000_000, 15)).toBe(1_000_000 + 15 * MIN)
  })

  test('attempt is not expired right at the limit (grace window)', () => {
    const startedAt = 1_000_000
    const limit = examDeadline(startedAt, 10)
    expect(isAttemptExpired(startedAt, 10, limit)).toBe(false) // exactly at limit
    expect(isAttemptExpired(startedAt, 10, limit + EXAM_GRACE_SEC * 1000)).toBe(false) // within grace
    expect(isAttemptExpired(startedAt, 10, limit + EXAM_GRACE_SEC * 1000 + 1)).toBe(true) // beyond grace
  })

  test('remaining seconds never go negative', () => {
    expect(remainingSeconds(2_000_000, 1_999_000)).toBe(1)
    expect(remainingSeconds(1_000_000, 5_000_000)).toBe(0)
  })

  test('submission far beyond the limit is expired', () => {
    const startedAt = Date.now() - 60 * MIN // started 60 min ago
    expect(isAttemptExpired(startedAt, 30, Date.now())).toBe(true)
  })
})
