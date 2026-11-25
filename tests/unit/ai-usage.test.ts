import { describe, expect, test } from 'bun:test'
import { tehranDayKey, limitsForPlan, remaining, quotaMessage, isWithinQuota, FREE_DAILY_LIMITS } from '../../src/lib/ai/usage-rules'

describe('AI daily usage (سهمیه روزانه هوش مصنوعی)', () => {
  test('tehranDayKey returns ISO-like YYYY-MM-DD in Asia/Tehran', () => {
    // 2026-01-01 20:30 UTC is already 2026-01-02 in Tehran (+03:30)
    const lateEveningUtc = new Date('2026-01-01T20:30:00Z')
    expect(tehranDayKey(lateEveningUtc)).toBe('2026-01-02')
    // midday UTC is same calendar day in Tehran
    const noonUtc = new Date('2026-05-10T09:00:00Z')
    expect(tehranDayKey(noonUtc)).toBe('2026-05-10')
    // 2026-03-21 00:30 Tehran = 20:00 previous day UTC — daylight boundary
    const newYear = new Date('2026-03-20T20:30:00Z')
    expect(tehranDayKey(newYear)).toBe('2026-03-21')
  })

  test('free plan limits are exactly 2 generate + 2 analyze per day', () => {
    const limits = limitsForPlan('free')
    expect(limits.generate).toBe(2)
    expect(limits.analyze).toBe(2)
    expect(FREE_DAILY_LIMITS.generate).toBe(2)
    expect(FREE_DAILY_LIMITS.analyze).toBe(2)
  })

  test('pro plan has no daily limits (null = unlimited)', () => {
    const limits = limitsForPlan('pro')
    expect(limits.generate).toBeNull()
    expect(limits.analyze).toBeNull()
  })

  test('remaining counts never go negative', () => {
    expect(remaining(2, 0)).toBe(2)
    expect(remaining(2, 1)).toBe(1)
    expect(remaining(2, 2)).toBe(0)
    expect(remaining(2, 5)).toBe(0) // over-quota clamps to 0
    expect(remaining(null, 999)).toBeNull() // unlimited stays null
  })

  test('quota exhausted blocks free user at the limit', () => {
    expect(isWithinQuota(2, 2)).toBe(false)
    expect(isWithinQuota(2, 1)).toBe(true)
    expect(isWithinQuota(2, 0)).toBe(true)
    expect(isWithinQuota(null, 999)).toBe(true) // unlimited
  })

  test('quota message is Persian and mentions the limit and next reset day', () => {
    const msg = quotaMessage('generate', 'free', '2026-06-10')
    expect(msg).toContain('ساخت پرسش‌نامه')
    expect(msg).toContain('۲')
    expect(msg).toContain('پلن رایگان')
    expect(msg).toContain('خرداد') // tomorrow 2026-06-11 = ۲۱ خرداد in the Iranian calendar
    const analyzeMsg = quotaMessage('analyze', 'free', '2026-06-10')
    expect(analyzeMsg).toContain('تحلیل')
  })
})
