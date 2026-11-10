/**
 * Unit tests for the Z.AI key pool rotation + client fallback logic.
 * Run: bun tests/unit/ai-key-rotation.test.ts
 *
 * Uses a mocked fetch and a stubbed Math.random so the "random start +
 * sequential fallback" behavior is deterministic and fully covered.
 */

import assert from 'node:assert/strict'
import {
  parseKeyPool,
  rotatedOrder,
  pickRandomStart,
  maskKey,
} from '../../src/lib/ai/key-pool'
import {
  zaiChat,
  extractJsonObject,
  ZaiNotConfiguredError,
  ZaiUnavailableError,
  type ChatMessage,
} from '../../src/lib/ai/zai-client'

let passed = 0
function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    await fn()
    passed++
    console.log(`  ✔ ${name}`)
  })()
}

// ---------- key-pool ----------

await test('parseKeyPool splits on comma/semicolon/newline and trims', () => {
  assert.deepEqual(parseKeyPool(' k1 ,k2;k3\nk4\r;,,; k2 '), ['k1', 'k2', 'k3', 'k4'])
})

await test('parseKeyPool handles empty/undefined input', () => {
  assert.deepEqual(parseKeyPool(''), [])
  assert.deepEqual(parseKeyPool(undefined), [])
  assert.deepEqual(parseKeyPool(null), [])
  assert.deepEqual(parseKeyPool('   ,  ; '), [])
})

await test('rotatedOrder rotates and wraps', () => {
  assert.deepEqual(rotatedOrder(['a', 'b', 'c'], 1), ['b', 'c', 'a'])
  assert.deepEqual(rotatedOrder(['a', 'b', 'c'], 0), ['a', 'b', 'c'])
  assert.deepEqual(rotatedOrder(['a', 'b', 'c'], 3), ['a', 'b', 'c']) // wrap
  assert.deepEqual(rotatedOrder(['a', 'b', 'c'], -1), ['c', 'a', 'b']) // negative wrap
  assert.deepEqual(rotatedOrder([], 2), [])
})

await test('pickRandomStart stays in range', () => {
  for (let i = 0; i < 200; i++) {
    const s = pickRandomStart(5)
    assert.ok(s >= 0 && s < 5)
  }
  assert.equal(pickRandomStart(0), 0)
})

await test('maskKey never exposes the full key', () => {
  const key = 'sk-abcdef1234567890secret'
  const masked = maskKey(key)
  assert.ok(!masked.includes('secret'))
  assert.ok(masked.startsWith('sk-a'))
  assert.equal(maskKey('short'), '****')
})

// ---------- zai-client (mocked fetch) ----------

const messages: ChatMessage[] = [
  { role: 'system', content: 'sys' },
  { role: 'user', content: 'hello' },
]

const OK_BODY = { choices: [{ message: { content: '{"summary":"ok"}' } }] }

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const originalFetch = globalThis.fetch
const originalRandom = Math.random

function restore() {
  globalThis.fetch = originalFetch
  Math.random = originalRandom
}

await test('random start + sequential fallback: first two keys fail, third succeeds', async () => {
  Math.random = () => 0 // deterministic start → first key
  const seenAuth: string[] = []
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const auth = String((init?.headers as Record<string, string>)?.Authorization ?? '')
    seenAuth.push(auth)
    if (auth.endsWith('keyA')) return jsonResponse(429, { error: 'rate limited' })
    if (auth.endsWith('keyB')) return jsonResponse(500, { error: 'boom' })
    return jsonResponse(200, OK_BODY)
  }) as typeof fetch

  process.env.ZAI_API_KEYS = 'keyA,keyB,keyC'
  try {
    const res = await zaiChat(messages)
    assert.equal(res.content, '{"summary":"ok"}')
    assert.equal(res.provider, 'zai-api')
    assert.equal(res.failedKeys, 2)
    assert.equal(seenAuth.length, 3)
    assert.ok(seenAuth[0].endsWith('keyA'))
    assert.ok(seenAuth[1].endsWith('keyB'))
    assert.ok(seenAuth[2].endsWith('keyC'))
  } finally {
    restore()
  }
})

await test('a different random start is honored (rotation start index)', async () => {
  Math.random = () => 0.999 // start = floor(0.999*3) = 2 → keyC first
  const order: string[] = []
  globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
    const auth = String((init?.headers as Record<string, string>)?.Authorization ?? '')
    order.push(auth)
    if (auth.endsWith('keyC')) return jsonResponse(401, { error: 'bad key' })
    return jsonResponse(200, OK_BODY)
  }) as typeof fetch

  process.env.ZAI_API_KEYS = 'keyA,keyB,keyC'
  try {
    const res = await zaiChat(messages)
    assert.equal(res.content, '{"summary":"ok"}')
    assert.ok(order[0].endsWith('keyC'), 'must start with keyC')
    assert.equal(res.failedKeys, 1)
  } finally {
    restore()
  }
})

await test('network errors also trigger fallback to the next key', async () => {
  Math.random = () => 0
  let calls = 0
  globalThis.fetch = (async () => {
    calls++
    if (calls === 1) throw new TypeError('network down')
    return jsonResponse(200, OK_BODY)
  }) as typeof fetch

  process.env.ZAI_API_KEYS = 'keyA,keyB'
  try {
    const res = await zaiChat(messages)
    assert.equal(res.content, '{"summary":"ok"}')
    assert.equal(calls, 2)
    assert.equal(res.failedKeys, 1)
  } finally {
    restore()
  }
})

await test('empty model answer counts as failure and moves to the next key', async () => {
  Math.random = () => 0
  globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
    const auth = String((init?.headers as Record<string, string>)?.Authorization ?? '')
    if (auth.endsWith('keyA')) return jsonResponse(200, { choices: [{ message: { content: '   ' } }] })
    return jsonResponse(200, OK_BODY)
  }) as typeof fetch

  process.env.ZAI_API_KEYS = 'keyA,keyB'
  try {
    const res = await zaiChat(messages)
    assert.equal(res.content, '{"summary":"ok"}')
    assert.equal(res.failedKeys, 1)
  } finally {
    restore()
  }
})

await test('all keys failing raises a Persian aggregated error', async () => {
  Math.random = () => 0
  globalThis.fetch = (async () => jsonResponse(401, { error: 'bad' })) as typeof fetch
  process.env.ZAI_API_KEYS = 'keyA,keyB'
  try {
    await assert.rejects(
      () => zaiChat(messages),
      (err: unknown) => {
        assert.ok(err instanceof ZaiUnavailableError)
        assert.ok((err as Error).message.includes('همهٔ ۲ کلید'))
        return true
      },
    )
  } finally {
    restore()
  }
})

await test('no keys + unavailable SDK → ZaiNotConfiguredError with Persian guidance', async () => {
  Math.random = () => 0
  delete process.env.ZAI_API_KEYS
  delete process.env.ZAI_API_KEY
  try {
    await assert.rejects(
      () => zaiChat(messages, { sdkLoader: async () => null }),
      (err: unknown) => {
        assert.ok(err instanceof ZaiNotConfiguredError)
        assert.ok((err as Error).message.includes('ZAI_API_KEYS'))
        return true
      },
    )
  } finally {
    restore()
  }
})

await test('no keys + working SDK → SDK fallback path succeeds', async () => {
  Math.random = () => 0
  delete process.env.ZAI_API_KEYS
  try {
    const res = await zaiChat(messages, {
      sdkLoader: async () => ({
        chat: { completions: { create: async () => ({ choices: [{ message: { content: 'پاسخ از SDK' } }] }) } },
      }),
    })
    assert.equal(res.content, 'پاسخ از SDK')
    assert.equal(res.provider, 'zai-sdk')
  } finally {
    restore()
  }
})

await test('SDK error surfaces as a clear Persian failure', async () => {
  Math.random = () => 0
  delete process.env.ZAI_API_KEYS
  try {
    await assert.rejects(
      () =>
        zaiChat(messages, {
          sdkLoader: async () => {
            throw new Error('sdk exploded')
          },
        }),
      (err: unknown) => {
        assert.ok(err instanceof ZaiUnavailableError || err instanceof ZaiNotConfiguredError || err instanceof Error)
        return true
      },
    )
  } finally {
    restore()
  }
})

// ---------- extractJsonObject ----------

await test('extractJsonObject parses fenced JSON', () => {
  assert.deepEqual(extractJsonObject('```json\n{"a": 1}\n```'), { a: 1 })
})

await test('extractJsonObject tolerates surrounding prose', () => {
  assert.deepEqual(extractJsonObject('این تحلیل است: {"summary":"x","insights":["y"]} — پایان'), {
    summary: 'x',
    insights: ['y'],
  })
})

await test('extractJsonObject handles braces inside strings', () => {
  assert.deepEqual(extractJsonObject('{"t":"این { شامل براکت است}"}'), { t: 'این { شامل براکت است}' })
})

await test('extractJsonObject returns null on garbage', () => {
  assert.equal(extractJsonObject('no json here'), null)
  assert.equal(extractJsonObject('{"broken": '), null)
})

console.log(`\n${passed} tests passed ✓`)
