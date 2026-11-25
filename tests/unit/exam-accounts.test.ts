import { describe, expect, test } from 'bun:test'
import {
  normalizeUsername,
  examAccountKey,
  verifyAccountCredentials,
  parseExamAccountsText,
  serializeExamAccountsText,
  generateExamAccounts,
} from '../../src/lib/exam/accounts'
import type { ExamAccount } from '../../src/types'

describe('exam accounts — username/password gate', () => {
  test('normalizeUsername trims and lowercases', () => {
    expect(normalizeUsername('  Student01 ')).toBe('student01')
    expect(normalizeUsername('ALI.Rezaei@school')).toBe('ali.rezaei@school')
  })

  test('normalizeUsername rejects invalid formats', () => {
    expect(normalizeUsername('')).toBeNull()
    expect(normalizeUsername('a')).toBeNull() // too short
    expect(normalizeUsername('has space')).toBeNull()
    expect(normalizeUsername('فارسی')).toBeNull()
    expect(normalizeUsername(null)).toBeNull()
  })

  test('examAccountKey is stable per username and independent of case', () => {
    const a = examAccountKey('student01')
    const b = examAccountKey('  STUDENT01  ')
    expect(a).toBe(b)
    expect(a.startsWith('acct:')).toBe(true)
    expect(examAccountKey('student02')).not.toBe(a)
  })

  test('verifyAccountCredentials accepts a valid account (case-insensitive username)', () => {
    const accounts: ExamAccount[] = [
      { username: 'student01', password: 'ab3x9f', name: 'علی رضایی' },
      { username: 'student02', password: 'k7p2mn' },
    ]
    const ok = verifyAccountCredentials(accounts, ' Student01 ', 'ab3x9f')
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.username).toBe('student01')
      expect(ok.account.name).toBe('علی رضایی')
    }
  })

  test('verifyAccountCredentials rejects wrong password / unknown user / empty input', () => {
    const accounts: ExamAccount[] = [{ username: 'student01', password: 'ab3x9f' }]
    expect(verifyAccountCredentials(accounts, 'student01', 'wrong').ok).toBe(false)
    expect(verifyAccountCredentials(accounts, 'nobody', 'ab3x9f').ok).toBe(false)
    expect(verifyAccountCredentials(accounts, 'student01', '').ok).toBe(false)
    expect(verifyAccountCredentials(accounts, '', 'ab3x9f').ok).toBe(false)
    expect(verifyAccountCredentials([], 'student01', 'ab3x9f').ok).toBe(false)
    expect(verifyAccountCredentials(null, 'student01', 'ab3x9f').ok).toBe(false)
  })

  test('parseExamAccountsText parses lines, dedupes, counts invalids', () => {
    const { accounts, invalidLines } = parseExamAccountsText(
      'student01,ab3x9f,علی رضایی\nstudent02,k7p2mn\nstudent01,zzzzzz,تکراری\nbadline\nصfa,pass\n\n',
    )
    expect(accounts.length).toBe(2)
    expect(accounts[0]).toEqual({ username: 'student01', password: 'ab3x9f', name: 'علی رضایی' })
    expect(accounts[1]).toEqual({ username: 'student02', password: 'k7p2mn' })
    expect(invalidLines).toBe(2) // badline + persian-only username
  })

  test('serializeExamAccountsText round-trips through the parser', () => {
    const accounts: ExamAccount[] = [
      { username: 'student01', password: 'ab3x9f', name: 'علی' },
      { username: 'student02', password: 'k7p2mn' },
    ]
    const text = serializeExamAccountsText(accounts)
    expect(text.split('\n').length).toBe(2)
    const back = parseExamAccountsText(text)
    expect(back.accounts).toEqual(accounts)
  })

  test('generateExamAccounts produces unique usernames + random passwords', () => {
    const gen = generateExamAccounts(30, 'Student', 1)
    expect(gen.length).toBe(30)
    expect(gen[0].username).toBe('student01')
    expect(gen[29].username).toBe('student30')
    const pwds = new Set(gen.map((a) => a.password))
    expect(pwds.size).toBeGreaterThan(20) // random, not all equal
    gen.forEach((a) => {
      expect(a.password.length).toBe(6)
      expect(normalizeUsername(a.username)).not.toBeNull()
    })
  })
})
