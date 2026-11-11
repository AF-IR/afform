/**
 * Z.AI chat client with automatic key rotation.
 *
 * Two operating modes:
 * 1. Production — `ZAI_API_KEYS` holds several comma-separated API keys
 *    (https://z.ai/manage-apikey/apikey-list). Every call starts with a RANDOM
 *    key and, on any error (401/429/5xx/network/timeout/empty answer), falls
 *    back to the NEXT key until one succeeds or the pool is exhausted.
 *    Keys are sent only from the server (`Authorization: Bearer …`) and are
 *    never logged in clear text.
 * 2. Preview fallback — when no keys are configured, the platform SDK
 *    (`z-ai-web-dev-sdk`, backend-only) is used so the feature works in the
 *    sandbox preview too. If neither is available, a clear Persian error is
 *    raised telling the operator to configure `ZAI_API_KEYS`.
 *
 * API reference: POST {base}/chat/completions  (OpenAI-compatible, GLM models)
 */

import { getKeyPool, maskKey, pickRandomStart, rotatedOrder } from './key-pool'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class ZaiNotConfiguredError extends Error {
  constructor() {
    super(
      'سرویس تحلیل هوش مصنوعی هنوز تنظیم نشده است. کلیدهای API رایگان Z.AI را در متغیر محیطی ZAI_API_KEYS (چند کلید، با کاما جدا شده) وارد کنید.',
    )
    this.name = 'ZaiNotConfiguredError'
  }
}

export class ZaiUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZaiUnavailableError'
  }
}

export interface ZaiChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
  /** Injectable for unit tests. */
  sdkLoader?: () => Promise<SdkLike | null>
  /** Injectable fetch for unit tests. */
  fetchImpl?: typeof fetch
}

export interface ZaiChatResult {
  content: string
  model: string
  provider: 'zai-api' | 'zai-sdk'
  /** Masked fingerprints of the keys tried, in order (success included). */
  triedKeys: string[]
  /** How many keys failed before the successful one. */
  failedKeys: number
}

interface SdkCompletion {
  choices?: { message?: { content?: string } }[]
}

interface SdkLike {
  chat: { completions: { create: (args: Record<string, unknown>) => Promise<SdkCompletion> } }
}

const DEFAULT_MODEL = 'glm-4.5-flash' // free tier model of the Z.AI open platform
const DEFAULT_TIMEOUT_MS = 55_000

function zaiBaseUrl(): string {
  return (process.env.ZAI_BASE_URL ?? 'https://api.z.ai/api/paas/v4').replace(/\/+$/, '')
}

async function defaultSdkLoader(): Promise<SdkLike | null> {
  try {
    const mod = (await import('z-ai-web-dev-sdk')) as unknown as {
      default?: { create: () => Promise<SdkLike> }
      create?: () => Promise<SdkLike>
    }
    const ZAI = mod.default ?? mod
    if (typeof ZAI?.create !== 'function') return null
    return await ZAI.create()
  } catch {
    return null
  }
}

async function callZaiHttp(
  fetchImpl: typeof fetch,
  apiKey: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<string> {
  const res = await fetchImpl(`${zaiBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${detail ? ` — ${detail.slice(0, 180)}` : ''}`)
  }
  const data = (await res.json()) as SdkCompletion
  const content = data.choices?.[0]?.message?.content
  if (!content || !content.trim()) throw new Error('پاسخ خالی از مدل')
  return content
}

/** One logical chat request with random-key start + sequential fallback. */
export async function zaiChat(messages: ChatMessage[], opts: ZaiChatOptions = {}): Promise<ZaiChatResult> {
  const model = opts.model ?? process.env.ZAI_MODEL ?? DEFAULT_MODEL
  const temperature = opts.temperature ?? 0.3
  const maxTokens = opts.maxTokens ?? 2048
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const doFetch = opts.fetchImpl ?? fetch
  const pool = getKeyPool()

  // ---- Mode 2: no explicit keys → platform SDK fallback (preview/dev) ----
  if (pool.length === 0) {
    const sdk = await (opts.sdkLoader ?? defaultSdkLoader)()
    if (!sdk) throw new ZaiNotConfiguredError()
    const completion = await sdk.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    })
    const content = completion.choices?.[0]?.message?.content
    if (!content || !content.trim()) throw new ZaiUnavailableError('پاسخ خالی از سرویس هوش مصنوعی')
    return { content, model: 'zai-sdk', provider: 'zai-sdk', triedKeys: [], failedKeys: 0 }
  }

  // ---- Mode 1: real key pool with random start + next-key fallback ----
  const order = rotatedOrder(pool, pickRandomStart(pool.length))
  const tried: string[] = []
  let lastError: unknown = null

  for (const key of order) {
    tried.push(maskKey(key))
    try {
      const content = await callZaiHttp(
        doFetch,
        key,
        {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
          thinking: { type: 'disabled' },
        },
        timeoutMs,
      )
      return { content, model, provider: 'zai-api', triedKeys: tried, failedKeys: tried.length - 1 }
    } catch (err) {
      lastError = err
      // Never log the raw key — masked fingerprint only.
      console.warn(
        `[zai-client] کلید ${maskKey(key)} ناموفق بود؛ تلاش با کلید بعدی (${err instanceof Error ? err.message : 'خطای ناشناخته'})`,
      )
    }
  }

  throw new ZaiUnavailableError(
    `همهٔ ${String(order.length).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])} کلید API ناموفق بودند؛ آخرین خطا: ${lastError instanceof Error ? lastError.message : 'ناشناخته'}`,
  )
}

/**
 * Extract the first balanced JSON object from model output (tolerates code
 * fences and surrounding prose). Returns null when nothing parseable exists.
 */
export function extractJsonObject(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}
