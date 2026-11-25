import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, BookOpenText } from 'lucide-react'
import { getDoc, docHref, DOC_PAGES } from '@/lib/docs/content'
import { DocHero, DocSection, UspBanner } from '@/components/docs/doc-ui'
import { DocIcon } from '@/components/docs/doc-icon'
import { breadcrumbSchema, buildFaqSchema } from '@/lib/seo'
import { USE_CASES } from '@/lib/use-cases/data'
export const metadata: Metadata = {
  title: 'مستندات — راهنمای کامل فرم، پرسشنامه و آزمون آنلاین',
  description:
    'مستندات کامل و جامع آرشام فرم: ۲۲ نوع سؤال آزمون و پرسشنامه، آزمون امن با کد ملی، ساخت پرسشنامه با هوش مصنوعی، خروجی رایگان Excel و JSON و CSV از نتایج، مدیریت پاسخ‌ها، منطق شرطی، امنیت داده و عیب‌یابی.',
  alternates: { canonical: '/docs' },
}

const DOC_FAQS = [
  {
    q: 'مستندات آرشام فرم شامل چه بخش‌هایی است؟',
    a: 'دوازده راهنمای کامل: شروع سریع، سازنده فرم، مرجع ۲۲ نوع سؤال (شامل انواع سؤال آزمون)، آزمون امن و نمره‌دهی، هوش مصنوعی (ساخت و تحلیل)، خروجی Excel و JSON، مدیریت پاسخ‌ها، منطق شرطی و انتشار، پلن‌ها و سهمیه‌ها، امنیت و حریم خصوصی، اصول طراحی پرسشنامه و عیب‌یابی.',
  },
  {
    q: 'آیا استفاده از همه این امکانات رایگان است؟',
    a: 'بله؛ ساخت فرم و آزمون، انتشار، داشبورد پاسخ‌ها، خروجی اکسل (xlsx)، CSV و JSON و تحلیل هوش مصنوعی در پلن رایگان در دسترس است؛ فقط عملیات‌های هوش مصنوعی سهمیهٔ روزانهٔ مشخص دارند که در راهنمای «پلن‌ها و سهمیه‌ها» شرح داده شده است.',
  },
  {
    q: 'از کجا شروع کنم؟',
    a: 'اگر تازه‌کار هستید، «شروع سریع» را بخوانید؛ اگر آزمون برگزار می‌کنید، «آزمون امن و نمره‌دهی» و مرجع «انواع سؤال»؛ اگر دنبال تحلیل و خروجی هستید، «خروجی Excel و JSON» و اگر سؤالی در کار با سایت دارید، «عیب‌یابی» را ببینید.',
  },
]

export default async function DocsHubPage() {
  const hub = getDoc('')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbSchema([
              { name: 'آرشام فرم', href: '/' },
              { name: 'مستندات', href: '/docs' },
            ]),
            buildFaqSchema(DOC_FAQS),
          ]),
        }}
      />
      <DocHero
        doc={hub!}
        lead="اینجا مرجع کامل و جامع کار با آرشام فرم است: از اولین فرم و سازنده، تا انواع سؤال آزمون، آزمون امن با لیست مجازین، هوش مصنوعی، مدیریت پاسخ‌ها، خروجی داده‌ها و عیب‌یابی. هر راهنما مستقل است و با مثال واقعی از امکانات پلتفرم نوشته شده است."
      />

      <div className="mt-8 space-y-10">
        <UspBanner />

        <DocSection id="guides" title="راهنماهای مستندات">
          <p>
            هر راهنما به یک سؤال واقعی شما جواب می‌دهد: «چه نوع سؤالی بسازم؟»، «چطور از تقلب در آزمون جلوگیری کنم؟»،
            «چطور نتایج را در اکسل تحلیل کنم؟» و «داده‌های من چقدر امن است؟». برای مطالعه روی هر کارت کلیک کنید.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {DOC_PAGES.map((d) => (
              <Link key={d.slug} href={docHref(d.slug)} className="group">
                <div className="h-full rounded-xl border bg-card p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <DocIcon name={d.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="font-bold group-hover:text-primary">{d.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{d.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </DocSection>

        <DocSection id="scenarios" title="کاربردهای آماده بر اساس نیاز شما">
          <p>
            اگر دنبال یک سناریوی مشخص هستید، صفحات کاربردی با راهنمای گام‌به‌گام و قالب پیشنهادی آماده‌اند:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {USE_CASES.map((u) => (
              <Link key={u.slug} href={`/use-cases/${u.slug}`} className="group">
                <div className="flex h-full items-start gap-3 rounded-xl border bg-card p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpenText className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-bold group-hover:text-primary">{u.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">{u.metaDescription}</span>
                  </span>
                  <ArrowLeft className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" aria-hidden />
                </div>
              </Link>
            ))}
          </div>
        </DocSection>

        <DocSection id="faq" title="پرسش‌های متداول درباره مستندات">
          <div className="divide-y rounded-xl border bg-card px-5">
            {DOC_FAQS.map((f) => (
              <div key={f.q} className="py-4">
                <h3 className="font-bold">{f.q}</h3>
                <p className="mt-1.5 text-sm leading-7">{f.a}</p>
              </div>
            ))}
          </div>
          <p>
            پاسخ سؤال‌های دیگر را در صفحه <Link className="font-bold text-primary hover:underline" href="/faq">پرسش‌های متداول</Link> و
            معرفی کامل امکانات را در <Link className="font-bold text-primary hover:underline" href="/features">قابلیت‌ها</Link> ببینید.
          </p>
        </DocSection>
      </div>
    </>
  )
}
