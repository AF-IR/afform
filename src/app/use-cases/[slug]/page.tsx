import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getCurrentUser } from '@/lib/auth/service'
import { USE_CASES, getUseCase } from '@/lib/use-cases/data'
import { DOC_PAGES, docHref } from '@/lib/docs/content'
import { DocIcon } from '@/components/docs/doc-icon'
import { UspBanner, DocFaq } from '@/components/docs/doc-ui'
import { breadcrumbSchema, buildFaqSchema } from '@/lib/seo'

/** Pre-render every use-case landing page at build time (fully indexable). */
export function generateStaticParams() {
  return USE_CASES.map((u) => ({ slug: u.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const uc = getUseCase(slug)
  if (!uc) return {}
  return {
    title: uc.metaTitle,
    description: uc.metaDescription,
    alternates: { canonical: `/use-cases/${uc.slug}` },
    openGraph: { title: uc.metaTitle, description: uc.metaDescription, type: 'article' },
  }
}

const RELATED_DOCS: Record<string, string[]> = {
  'online-exam': ['exam-mode', 'question-types', 'exports-reports'],
  'customer-satisfaction': ['ai-features', 'exports-reports', 'question-types'],
  'event-registration': ['logic-rules', 'security-privacy', 'exports-reports'],
  'job-application': ['logic-rules', 'security-privacy', 'ai-features'],
}

export default async function UseCaseLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const uc = getUseCase(slug)
  if (!uc) notFound()
  const user = await getCurrentUser()

  return (
    <>
      <SiteHeader isAuthenticated={Boolean(user)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbSchema([
              { name: 'آرشام فرم', href: '/' },
              { name: 'کاربردها', href: '/use-cases' },
              { name: uc.title, href: `/use-cases/${uc.slug}` },
            ]),
            buildFaqSchema(uc.faqs),
          ]),
        }}
      />
      <main className="flex-1">
        {/* hero */}
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-4xl px-4 py-14">
            <nav aria-label="مسیر صفحه" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground">خانه</Link>
              <span aria-hidden>/</span>
              <Link href="/use-cases" className="hover:text-foreground">کاربردها</Link>
              <span aria-hidden>/</span>
              <span className="text-foreground">{uc.title}</span>
            </nav>
            <h1 className="text-2xl font-extrabold leading-snug md:text-4xl">{uc.title}</h1>
            <p className="mt-4 leading-8 text-muted-foreground">{uc.intro}</p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {uc.audiences.map((a) => (
                <Badge key={a} variant="secondary">{a}</Badge>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 px-8">
                <Link href={user ? '/dashboard/templates' : '/register'}>
                  {user ? 'شروع با قالب آماده' : 'رایگان شروع کنید'}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8">
                <Link href="/features">مشاهده قابلیت‌ها</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* benefits */}
        <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="benefits-h">
          <h2 id="benefits-h" className="text-2xl font-extrabold md:text-3xl">چرا آرشام فرم برای این کار؟</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uc.benefits.map((b) => (
              <div key={b.title} className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <DocIcon name={b.icon} className="h-5 w-5" />
                </span>
                <h3 className="font-bold">{b.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* steps */}
        <section className="border-y bg-muted/30" aria-labelledby="steps-h">
          <div className="mx-auto max-w-4xl px-4 py-14">
            <h2 id="steps-h" className="text-2xl font-extrabold md:text-3xl">گام‌به‌گام تا نتیجه</h2>
            <ol className="mt-8 space-y-4">
              {uc.steps.map((s) => (
                <li key={s.title} className="flex items-start gap-3 rounded-xl border bg-card p-5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span>
                    <span className="block font-bold">{s.title}</span>
                    <span className="mt-1 block text-sm leading-7 text-muted-foreground">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* USP */}
        <section className="mx-auto max-w-6xl px-4 py-14">
          <UspBanner />
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 pb-14" aria-labelledby="faq-h">
          <h2 id="faq-h" className="text-2xl font-extrabold">پرسش‌های متداول</h2>
          <DocFaq faqs={uc.faqs} />
        </section>

        {/* related docs + use-cases */}
        <section className="border-t bg-muted/30" aria-labelledby="related-h">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 id="related-h" className="text-xl font-extrabold">ادامه مسیر</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                {(RELATED_DOCS[uc.slug] ?? []).map((ds) => {
                  const d = DOC_PAGES.find((x) => x.slug === ds)
                  if (!d) return null
                  return (
                    <Link key={ds} href={docHref(ds)} className="group flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:border-primary/40">
                      <span>
                        <span className="block text-sm font-bold group-hover:text-primary">{d.title}</span>
                        <span className="mt-0.5 block text-xs leading-6 text-muted-foreground">{d.description}</span>
                      </span>
                      <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" aria-hidden />
                    </Link>
                  )
                })}
              </div>
              <div className="space-y-2">
                {USE_CASES.filter((x) => x.slug !== uc.slug).map((x) => (
                  <Link key={x.slug} href={`/use-cases/${x.slug}`} className="group flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:border-primary/40">
                    <span className="text-sm font-bold group-hover:text-primary">{x.title}</span>
                    <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" aria-hidden />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
