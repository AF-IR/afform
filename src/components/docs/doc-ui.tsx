import Link from 'next/link'
import { ArrowLeft, ChevronLeft, Clock3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { DocIcon } from '@/components/docs/doc-icon'
import { USP_HEADLINE, USP_TEXT, EXPORT_USP_HEADLINE, EXPORT_USP_TEXT } from '@/lib/seo'
import { docNeighbours, type DocMeta } from '@/lib/docs/content'

/** Page hero for a doc page — H1, lead paragraph and reading time. */
export function DocHero({ doc, lead }: { doc: DocMeta; lead: string }) {
  return (
    <header className="fade-up">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="bg-primary/10 text-primary">مستندات</Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          زمان مطالعه حدود {doc.minutes} دقیقه
        </span>
      </div>
      <h1 className="mt-3 text-2xl font-extrabold leading-snug md:text-3xl">{doc.title}</h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{lead}</p>
    </header>
  )
}

/** Anchored h2 section — in-page anchors (searchable, linkable, SEO friendly). */
export function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 border-t pt-8 first:border-t-0 first:pt-0">
      <h2 id={`${id}-h`} className="text-xl font-extrabold md:text-2xl">{title}</h2>
      <div className="mt-4 space-y-4 leading-7 text-muted-foreground [&_strong]:font-bold [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  )
}

/** Simple bullet list rendered inside a DocSection. */
export function DocList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/** Feature/benefit card used on docs and use-case pages. */
export function DocCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <DocIcon name={icon} className="h-5 w-5" />
      </span>
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  )
}

/**
 * The signature USP strip — shown on every doc page: the PRIMARY keyword
 * (AI questionnaire building + free analysis) with the AI guide CTA.
 */
export function UspBanner() {
  return (
    <aside className="fade-up rounded-2xl border border-primary/20 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-6" aria-label="مزیت ویژه آرشام فرم">
      <p className="flex items-center gap-2 text-sm font-extrabold text-foreground">
        <DocIcon name="Sparkles" className="h-5 w-5 text-primary" />
        {USP_HEADLINE}
      </p>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{USP_TEXT}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/docs/ai-features">راهنمای کامل هوش مصنوعی</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/register">ساخت فرم رایگان</Link>
        </Button>
      </div>
    </aside>
  )
}

/**
 * The SECONDARY USP strip (free JSON/Excel/CSV exports) — used on the
 * exports doc page and the features page to target long-tail searches
 * like «خروجی اکسل نتایج پرسشنامه».
 */
export function ExportUspBanner() {
  return (
    <aside className="fade-up rounded-2xl border border-emerald-500/20 bg-gradient-to-l from-emerald-500/10 via-emerald-500/5 to-transparent p-6" aria-label="مزیت خروجی نتایج">
      <p className="flex items-center gap-2 text-sm font-extrabold text-foreground">
        <DocIcon name="FileSpreadsheet" className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        {EXPORT_USP_HEADLINE}
      </p>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{EXPORT_USP_TEXT}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/docs/exports-reports">راهنمای کامل خروجی‌ها</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/register">ساخت فرم رایگان</Link>
        </Button>
      </div>
    </aside>
  )
}

/** FAQ block with the same data used for FAQPage JSON-LD. */
export function DocFaq({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <Accordion type="single" collapsible className="mt-2">
      {faqs.map((f, i) => (
        <AccordionItem key={i} value={`faq-${i}`}>
          <AccordionTrigger className="text-right font-bold">{f.q}</AccordionTrigger>
          <AccordionContent className="leading-7 text-muted-foreground">{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

/** Prev/next pager across doc pages. */
export function DocPager({ slug }: { slug: string }) {
  const { prev, next } = docNeighbours(slug)
  return (
    <nav aria-label="صفحه بعدی و قبلی مستندات" className="grid gap-3 border-t pt-6 sm:grid-cols-2">
      {prev ? (
        <Link href={`/docs/${prev.slug}`} className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/40">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> قبلی
          </span>
          <span className="mt-1 block text-sm font-bold group-hover:text-primary">{prev.title}</span>
        </Link>
      ) : <span />}
      {next ? (
        <Link href={`/docs/${next.slug}`} className="group rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40">
          <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            بعدی <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="mt-1 block text-sm font-bold group-hover:text-primary">{next.title}</span>
        </Link>
      ) : <span />}
    </nav>
  )
}
