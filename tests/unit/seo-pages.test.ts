/**
 * Unit tests for the SEO surface: every doc page and use-case landing page
 * must exist as a real route and be present in the sitemap (indexability).
 * Run: bun tests/unit/seo-pages.test.ts
 */

import assert from 'node:assert/strict'
import sitemap from '../../src/app/sitemap'
import { DOCS, DOC_PAGES, docHref, docNeighbours, getDoc } from '../../src/lib/docs/content'
import { USE_CASES, getUseCase } from '../../src/lib/use-cases/data'
import { breadcrumbSchema, buildFaqSchema, USP_HEADLINE, EXPORT_USP_HEADLINE } from '../../src/lib/seo'

// ---------- sitemap ----------

const urls = sitemap().map((e) => new URL(e.url).pathname)

assert.ok(urls.includes('/docs'), 'sitemap must contain /docs hub')
assert.ok(urls.includes('/use-cases'), 'sitemap must contain /use-cases hub')
for (const d of DOC_PAGES) {
  assert.ok(urls.includes(`/docs/${d.slug}`), `sitemap must contain /docs/${d.slug}`)
}
for (const u of USE_CASES) {
  assert.ok(urls.includes(`/use-cases/${u.slug}`), `sitemap must contain /use-cases/${u.slug}`)
}
assert.ok(!urls.some((u) => u.includes('#')), 'no hash URLs allowed in sitemap')
assert.ok(new Set(urls).size === urls.length, 'sitemap URLs must be unique')

// ---------- docs content ----------

assert.equal(DOCS.length, DOC_PAGES.length + 1, 'DOCS = pages + hub')
for (const d of DOC_PAGES) {
  assert.ok(d.title.length > 3, `doc ${d.slug} has title`)
  assert.ok(d.description.length > 20, `doc ${d.slug} has description`)
  assert.ok(d.minutes > 0, `doc ${d.slug} has reading time`)
  assert.ok(d.keywords.length >= 3, `doc ${d.slug} has SEO keywords`)
}
assert.equal(getDoc('question-types')?.slug, 'question-types')
assert.equal(getDoc('does-not-exist'), undefined)
assert.equal(docHref(''), '/docs')
assert.equal(docHref('exam-mode'), '/docs/exam-mode')

// chain covers every page exactly once (prev/next pager integrity)
const chain = new Set<string>()
for (const d of DOC_PAGES) {
  const { prev, next } = docNeighbours(d.slug)
  if (prev) chain.add(prev.slug)
  if (next) chain.add(next.slug)
}
const first = docNeighbours(DOC_PAGES[0].slug)
const last = docNeighbours(DOC_PAGES[DOC_PAGES.length - 1].slug)
assert.ok(!first.prev, 'first doc has no prev')
assert.ok(!last.next, 'last doc has no next')
assert.equal(chain.size, DOC_PAGES.length, 'pager chain covers all docs')

// ---------- use-cases content ----------

for (const u of USE_CASES) {
  assert.ok(u.metaTitle.includes('آرشام فرم') || u.metaTitle.length > 10, `use-case ${u.slug} has meta title`)
  assert.ok(u.metaDescription.length > 50, `use-case ${u.slug} has meta description`)
  assert.ok(u.benefits.length >= 4, `use-case ${u.slug} has benefits`)
  assert.ok(u.steps.length >= 3, `use-case ${u.slug} has steps`)
  assert.ok(u.faqs.length >= 3, `use-case ${u.slug} has FAQ (for FAQPage schema)`)
  assert.ok(u.audiences.length >= 2, `use-case ${u.slug} has audiences`)
}
assert.equal(getUseCase('online-exam')?.templateId, 'course-quiz')
assert.equal(getUseCase('nope'), undefined)

// unique slugs everywhere
assert.equal(new Set(USE_CASES.map((u) => u.slug)).size, USE_CASES.length)
assert.equal(new Set(DOC_PAGES.map((d) => d.slug)).size, DOC_PAGES.length)

// ---------- schema helpers ----------

const bc = breadcrumbSchema([
  { name: 'خانه', href: '/' },
  { name: 'مستندات', href: '/docs' },
  { name: 'شروع سریع' },
])
assert.equal(bc['@type'], 'BreadcrumbList')
assert.equal(bc.itemListElement.length, 3)
assert.ok(!('item' in bc.itemListElement[2]), 'last breadcrumb has no URL item')

const faq = buildFaqSchema([{ q: 'سؤال؟', a: 'پاسخ.' }])
assert.equal(faq['@type'], 'FAQPage')
assert.equal(faq.mainEntity[0].name, 'سؤال؟')

// PRIMARY keyword family: free AI questionnaire building + analysis
assert.ok(USP_HEADLINE.includes('هوش مصنوعی'), 'primary USP mentions AI')
assert.ok(USP_HEADLINE.includes('رایگان'), 'primary USP mentions free')
// SECONDARY USP (long-tail): free exports of results
assert.ok(EXPORT_USP_HEADLINE.includes('خروجی'), 'secondary USP mentions exports')
assert.ok(EXPORT_USP_HEADLINE.includes('اکسل') && EXPORT_USP_HEADLINE.includes('JSON'), 'secondary USP mentions Excel/JSON')

console.log('seo-pages tests: all assertions passed')
