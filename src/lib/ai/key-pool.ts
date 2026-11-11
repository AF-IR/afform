/**
 * Z.AI API key pool — pure helpers.
 *
 * Keys are provided through a single environment variable (ZAI_API_KEYS) that
 * holds several comma-separated keys, e.g.:
 *
 *   ZAI_API_KEYS="key-one,key-two,key-three"
 *
 * On every call a RANDOM key from the pool is chosen first; if the call with
 * that key fails (invalid key, rate limit, network error, empty response, …)
 * the next key of the pool is tried until the pool is exhausted.
 *
 * This module intentionally has NO `server-only` import so the rotation logic
 * stays unit-testable. Secrets are never logged — only masked fingerprints.
 */

const KEY_SPLIT_RE = /[,;\n\r]+/

/** Parse a raw env value into a de-duplicated list of non-empty keys. */
export function parseKeyPool(raw: string | undefined | null): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  for (const part of raw.split(KEY_SPLIT_RE)) {
    const key = part.trim()
    if (key && !seen.has(key)) seen.add(key)
  }
  return [...seen]
}

/** Read the configured key pool from the environment. */
export function getKeyPool(): string[] {
  return parseKeyPool(process.env.ZAI_API_KEYS ?? process.env.ZAI_API_KEY)
}

/** Rotate the pool so iteration starts at `startIndex` (wraps around). */
export function rotatedOrder(keys: string[], startIndex: number): string[] {
  if (keys.length === 0) return []
  const n = keys.length
  const start = ((startIndex % n) + n) % n
  return [...keys.slice(start), ...keys.slice(0, start)]
}

/** Random start index so every call begins with a different key. */
export function pickRandomStart(length: number): number {
  if (length <= 0) return 0
  return Math.floor(Math.random() * length)
}

/** Safe fingerprint for logs/errors — never expose the full key. */
export function maskKey(key: string): string {
  if (key.length <= 8) return '****'
  return `${key.slice(0, 4)}…${key.slice(-4)}`
}
