import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { getCurrentUser } from '@/lib/auth/service'
import { USE_CASES } from '@/lib/use-cases/data'
import { UspBanner } from '@/components/docs/doc-ui'
import { breadcrumbSchema } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'کاربردها — آزمون آنلاین، رضایت مشتری، ثبت‌نام و استخدام',
  description:
    'راهنمای کاربردی آرشام فرم برای هر سناریو: برگزاری آزمون آنلاین امن با اکانت دانش‌آموز، نظرسنجی رضایت مشتری با خروجی اکسل، فرم ثبت‌نام رویداد با سقف ظرفیت و فرم استخدام با دریافت رزومه.',
  alternates: { canonical: '/use-cases' },
}

export default async function UseCasesHubPage() {
  const user = await getCurrentUser()
  return (
    <>
      <SiteHeader isAuthenticated={Boolean(user)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: 'آرشام فرم', href: '/' },
              { name: 'کاربردها', href: '/use-cases' },
            ]),
          ),
        }}
      />
      <main className="flex-1">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center">
            <p className="text-sm font-bold text-primary">راهنماهای کاربردی</p>
            <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">برای هر نیاز، یک مسیر آماده</h1>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">
              چهار سناریوی پرتکرار را از صفر تا تحلیل نتایج پوشش داده‌ایم: هر راهنما قالب پیشنهادی، گام‌های دقیق و
              پرسش‌های متداول همان کاربرد دارد — و همیشه با خروجی رایگان اکسل و JSON تمام می‌شود.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-4 sm:grid-cols-2">
            {USE_CASES.map((u) => (
              <Link key={u.slug} href={`/use-cases/${u.slug}`} className="group">
                <article className="flex h-full flex-col rounded-2xl border bg-card p-6 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                  <h2 className="text-lg font-extrabold group-hover:text-primary">{u.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-7 text-muted-foreground">{u.metaDescription}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {u.audiences.map((a) => (
                      <span key={a} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{a}</span>
                    ))}
                  </div>
                  <span className="mt-4 flex items-center gap-1 text-sm font-bold text-primary">
                    راهنمای کامل
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
                  </span>
                </article>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14">
          <UspBanner />
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
