/**
 * Unit tests for the secure-exam identity helpers and the AI form generator
 * normalization.
 * Run: bun tests/unit/exam-identity.test.ts
 */

import assert from 'node:assert/strict'
import {
  normalizeDigits,
  normalizeNationalId,
  isValidNationalId,
  normalizeFullName,
  parseAllowedNationalIds,
  isNationalIdAllowed,
} from '../../src/lib/exam/identity'
import {
  buildGeneratorMessages,
  normalizeGeneratedForm,
  clampQuestionCount,
} from '../../src/lib/ai/form-generator'

let passed = 0
function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    await fn()
    passed++
    console.log(`  ✔ ${name}`)
  })()
}

// ---------- national ID normalization ----------

await test('normalizeDigits converts Persian and Arabic digits', () => {
  assert.equal(normalizeDigits('۰۱۲۳۴۵۶۷۸۹'), '0123456789')
  assert.equal(normalizeDigits('٠١٢٣٤٥٦٧٨٩'), '0123456789')
  assert.equal(normalizeDigits('abc۱۲۳'), 'abc123')
})

await test('normalizeNationalId strips separators and Persian digits', () => {
  assert.equal(normalizeNationalId('۰۰۱۲۳۴۵۶۷–۹'), '0012345679')
  assert.equal(normalizeNationalId(' 001-234-5678 '), '0012345678')
  assert.equal(normalizeNationalId('۱۲۳'), null)
  assert.equal(normalizeNationalId(null), null)
})

await test('isValidNationalId accepts known-valid codes (checksum)', () => {
  // valid per the official checksum algorithm (check digit computed from base)
  assert.equal(isValidNationalId('0010532129'), true)
  assert.equal(isValidNationalId('۰۴۹۹۳۷۰۰۶۶'), true)
  assert.equal(isValidNationalId('7682170621'), true)
  assert.equal(isValidNationalId('490-1234560'), true)
})

await test('isValidNationalId rejects wrong checksum / format', () => {
  assert.equal(isValidNationalId('0010532128'), false) // wrong check digit
  assert.equal(isValidNationalId('1111111111'), false) // all same digits
  assert.equal(isValidNationalId('12345'), false) // too short
  assert.equal(isValidNationalId(''), false)
  assert.equal(isValidNationalId('abcdefghij'), false)
})

await test('normalizeFullName collapses whitespace', () => {
  assert.equal(normalizeFullName('  علی   رضایی '), 'علی رضایی')
  assert.equal(normalizeFullName(''), '')
  assert.equal(normalizeFullName(undefined), '')
})

await test('parseAllowedNationalIds dedupes and drops invalid entries', () => {
  const list = parseAllowedNationalIds('0010532129\n0010532129\n۱۲۳\n7682170621، abc')
  assert.deepEqual(list, ['0010532129', '7682170621'])
})

await test('isNationalIdAllowed: empty whitelist allows everyone', () => {
  assert.equal(isNationalIdAllowed('0010532128', []), true)
  assert.equal(isNationalIdAllowed('0010532128', null), true)
})

await test('isNationalIdAllowed: whitelist match is exact', () => {
  assert.equal(isNationalIdAllowed('0010532129', ['0010532129']), true)
  assert.equal(isNationalIdAllowed('7682170621', ['0010532129']), false)
})

// ---------- AI form generator ----------

await test('clampQuestionCount bounds the requested count', () => {
  assert.equal(clampQuestionCount(2, 'quiz'), 3)
  assert.equal(clampQuestionCount(100, 'survey'), 20)
  assert.equal(clampQuestionCount(12, 'quiz'), 12)
  assert.equal(clampQuestionCount(null, 'quiz'), 10)
  assert.equal(clampQuestionCount(null, 'survey'), 8)
})

await test('buildGeneratorMessages asks for JSON-only Persian output', () => {
  const msgs = buildGeneratorMessages({ topic: 'رضایت مشتریان', formType: 'survey', count: 8 })
  assert.equal(msgs[0].role, 'system')
  assert.match(msgs[0].content, /JSON/)
  assert.match(msgs[1].content, /رضایت مشتریان/)
  // quiz mode must request correct answers + points
  const quizMsgs = buildGeneratorMessages({ topic: 'ریاضی', formType: 'quiz', count: 10 })
  assert.match(quizMsgs[0].content, /"correct"/)
  assert.match(quizMsgs[0].content, /points/)
})

await test('normalizeGeneratedForm maps choices, correct answers and points (quiz)', () => {
  const raw = {
    title: 'آزمون ریاضی پایه هفتم',
    description: '۱۰ سؤال چهارگزینه‌ای',
    questions: [
      { type: 'single_choice', title: 'حاصل ۲+۲ چیست؟', required: true, choices: ['۳', '۴', '۵'], correct: '۴', points: 2 },
      { type: 'multi_choice', title: 'اعداد زوج کدامند؟', choices: ['۲', '۳', '۴'], correct: ['۲', '۴'], points: 3 },
      { type: 'boolean', title: 'صفر زوج است؟', correct: true, points: 1 },
      { type: 'number', title: 'حاصل ۵×۶', correctNumber: 30, points: 2 },
      { type: 'number', title: 'تقریبی π', acceptRange: { min: 3, max: 3.2 }, points: 2 },
      { type: 'long_text', title: 'یک مسئله تشریحی' },
      { type: 'likert', title: 'میزان علاقه' },
      { type: 'garbage_type', title: 'بدون نوع معتبر', choices: ['الف', 'ب'] },
    ],
  }
  const out = normalizeGeneratedForm(raw, { topic: 'ریاضی', formType: 'quiz', count: 10 })
  assert.ok(out)
  assert.equal(out.title, 'آزمون ریاضی پایه هفتم')
  assert.equal(out.questions.length, 8)
  assert.equal(out.settings.maxAttempts, 1) // quiz defaults

  const [q1, q2, q3, q4, q5, q6, q7, q8] = out.questions
  // single_choice: correct label mapped to generated choice id
  assert.equal(q1.type, 'single_choice')
  assert.ok(q1.scoring)
  assert.deepEqual(q1.scoring?.correctChoices, ['c2'])
  assert.equal(q1.scoring?.points, 2)
  assert.equal(q1.config.choices?.[1].label, '۴')
  assert.ok(q1.id.startsWith('ai'))
  assert.equal(q1.position, 0)
  // multi_choice: two correct ids
  assert.deepEqual([...(q2.scoring?.correctChoices ?? [])].sort(), ['c1', 'c3'])
  // boolean
  assert.equal(q3.scoring?.correctBoolean, true)
  // number exact
  assert.equal(q4.scoring?.correctNumber, 30)
  // number range
  assert.deepEqual(q5.scoring?.acceptRange, { min: 3, max: 3.2 })
  // essay → no scoring
  assert.equal(q6.scoring, null)
  // likert default labels
  assert.deepEqual(q7.config.likertLabels?.length, 5)
  // unknown type falls back to short_text (no choices, no scoring)
  assert.equal(q8.type, 'short_text')
  assert.equal(q8.scoring, null)
})

await test('normalizeGeneratedForm ignores scoring for surveys', () => {
  const raw = {
    title: 'نظرسنجی',
    questions: [
      { type: 'single_choice', title: 'رضایت شما؟', choices: ['زیاد', 'کم'], correct: 'زیاد', points: 1 },
    ],
  }
  const out = normalizeGeneratedForm(raw, { topic: 'نظرسنجی', formType: 'survey', count: 5 })
  assert.ok(out)
  assert.equal(out.questions[0].scoring, null)
  assert.equal(out.settings.maxAttempts, null) // survey defaults, no quiz tweaks
})

await test('normalizeGeneratedForm drops malformed choice questions', () => {
  const raw = {
    title: 'ت',
    questions: [
      { type: 'single_choice', title: 'فقط یک گزینه', choices: ['الف'] },
      { type: 'short_text', title: 'سالم' },
    ],
  }
  const out = normalizeGeneratedForm(raw, { topic: 'موضوع', formType: 'form', count: 5 })
  assert.ok(out)
  assert.equal(out.questions.length, 1)
  assert.equal(out.questions[0].title, 'سالم')
})

await test('normalizeGeneratedForm returns null on garbage', () => {
  assert.equal(normalizeGeneratedForm(null, { topic: 'x', formType: 'form', count: 5 }), null)
  assert.equal(normalizeGeneratedForm({}, { topic: 'x', formType: 'form', count: 5 }), null)
  assert.equal(
    normalizeGeneratedForm({ title: 'ت', questions: [] }, { topic: 'x', formType: 'form', count: 5 }),
    null,
  )
})

await test('normalizeGeneratedForm limits questions to the requested count', () => {
  const raw = {
    title: 'ت',
    questions: Array.from({ length: 30 }, (_, i) => ({ type: 'short_text', title: `س${i}` })),
  }
  const out = normalizeGeneratedForm(raw, { topic: 'x', formType: 'form', count: 5 })
  assert.ok(out)
  assert.equal(out.questions.length, 5)
})

console.log(`\n${passed} tests passed ✓`)
