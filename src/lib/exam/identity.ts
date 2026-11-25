/**
 * Secure-exam identity helpers — Iranian national ID (کد ملی) normalization,
 * checksum validation and whitelist matching.
 *
 * This module is intentionally free of server-only imports: the same rules run
 * in the browser (fast feedback) and on the server (the only authority).
 */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** Convert Persian/Arabic digits to Latin digits. */
export function normalizeDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (d) => {
    const fi = FA_DIGITS.indexOf(d)
    if (fi >= 0) return String(fi)
    return String(AR_DIGITS.indexOf(d))
  })
}

/**
 * Normalize a national ID: Persian digits → Latin, strip separators/spaces.
 * Returns the 10-digit string, or null when it cannot be 10 digits.
 */
export function normalizeNationalId(raw: string | null | undefined): string | null {
  if (!raw) return null
  // strip spaces, hyphens/en/em dashes, dots, underscores and ZWNJ
  const code = normalizeDigits(String(raw)).replace(/[\s\-_.\u2010-\u2015\u200c]/g, '')
  if (!/^\d{10}$/.test(code)) return null
  return code
}

/**
 * Validate an Iranian national ID (کد ملی) with the official checksum:
 *   sum(digit[i] × (10 − i)) mod 11 →
 *     remainder < 2  → check digit must equal remainder
 *     remainder ≥ 2  → check digit must equal 11 − remainder
 * All-same-digit codes (0000000000 … 9999999999) are rejected.
 */
export function isValidNationalId(raw: string | null | undefined): boolean {
  const code = normalizeNationalId(raw)
  if (!code) return false
  if (/^(\d)\1{9}$/.test(code)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(code[i]) * (10 - i)
  const rem = sum % 11
  const expected = rem < 2 ? rem : 11 - rem
  return Number(code[9]) === expected
}

/** Normalize a full name: collapse whitespace, trim. */
export function normalizeFullName(raw: string | null | undefined): string {
  if (!raw) return ''
  return String(raw).replace(/\s+/g, ' ').trim()
}

/**
 * Parse the whitelist textarea (one national ID per line, any digits) into a
 * normalized, deduplicated list. Invalid entries are dropped silently — the
 * builder shows the accepted count so the owner can verify.
 */
export function parseAllowedNationalIds(text: string | null | undefined): string[] {
  if (!text) return []
  const seen = new Set<string>()
  for (const line of String(text).split(/[\n,،;]+/)) {
    const nid = normalizeNationalId(line)
    if (nid && isValidNationalId(nid)) seen.add(nid)
  }
  return [...seen]
}

/** Whitelist match — exact 10-digit equality after normalization. */
export function isNationalIdAllowed(nid: string, allowed: string[] | null | undefined): boolean {
  if (!allowed || allowed.length === 0) return true
  return allowed.includes(nid)
}
