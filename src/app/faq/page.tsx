import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/auth/service'
import { FAQ_SCHEMA } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'پرسش‌های متداول و راهنما',
  description: 'پاسخ پرسش‌های رایج درباره ساخت فرم، آزمون آنلاین، پاسخ‌ها و امنیت در آرشام فرم.',
  alternates: { canonical: '/faq' },
}

const GUIDE = [
  {
    title: '۱. ساخت فرم',
    text: 'پس از ثبت‌نام، از داشبورد «ایجاد فرم جدید» را بزنید؛ از صفر شروع کنید یا یکی از ۱۰ قالب آماده را انتخاب کنید. عنوان، توضیحات و نوع فرم (فرم/پرسشنامه/آزمون) را تعیین کنید.',
  },
  {
    title: '۲. افزودن سؤال',
    text: 'از پلت سمت راست، نوع سؤال را انتخاب و به فرم اضافه کنید. هر سؤال تنظیمات مخصوص دارد: اجباری‌بودن، محدودیت طول، حداقل/حداکثر انتخاب، گزینه «سایر» و در حالت آزمون، پاسخ صحیح و امتیاز.',
  },
  {
    title: '۳. منطق شرطی',
    text: 'در هر سؤال می‌توانید تعیین کنید فقط در صورت برقراری شرط روی پاسخ سؤال‌های قبلی نمایش داده شود. سؤال‌های پنهان در ارسال پذیرفته نمی‌شوند.',
  },
  {
    title: '۴. انتشار و لینک عمومی',
    text: 'فرم ذخیره‌شده را منتشر کنید تا لینکی غیرقابل حدس مثل /f/a8d4f2c9 بگیرد. از تنظیمات، مهلت زمانی، سقف پاسخ و اجازه پاسخ ناشناس را کنترل کنید.',
  },
  {
    title: '۵. پاسخ‌ها و گزارش‌ها',
    text: 'پاسخ‌ها با جست‌وجو، فیلتر تاریخ و مرتب‌سازی در داشبورد قابل مرورند و به‌صورت CSV، Excel و JSON قابل دانلود هستند. گزارش‌های نموداری نیز از داده واقعی ساخته می‌شوند.',
  },
]

const FAQS = [
  { q: 'برای پاسخ‌دهندگان هزینه یا ثبت‌نامی لازم است؟', a: 'خیر؛ پاسخ‌دهنده فقط با باز کردن لینک فرم می‌تواند پاسخ دهد. مگر آنکه سازنده، پاسخ ناشناس را غیرفعال کرده باشد.' },
  { q: 'نمره آزمون چگونه محاسبه می‌شود؟', a: 'برای هر سؤال، پاسخ صحیح و امتیاز آن در سازنده تعریف می‌شود؛ سرور در زمان ارسال، نمره کل و وضعیت قبولی را محاسبه و ذخیره می‌کند. سؤال‌های تشریحی نمره خودکار نمی‌گیرند.' },
  { q: 'اگر اینترنت پاسخ‌دهنده قطع شود چه می‌شود؟', a: 'پاسخ فقط پس از زدن دکمه ثبت، سمت سرور ذخیره می‌شود. در آزمون زمان‌دار، اگر مهلت تمام شود پاسخ پذیرفته نمی‌شود؛ زمان هر تلاش با مُهر سمت سرور ثبت و بررسی می‌شود.' },
  { q: 'آیا می‌توانم فرم را بعد از انتشار ویرایش کنم؟', a: 'بله. تغییرات سؤال‌ها در فرم منتشرشده هم قابل ذخیره است. توجه کنید حذف یک سؤال، پاسخ‌های ثبت‌شده همان سؤال را نیز حذف می‌کند.' },
  { q: 'خروجی اکسل با فارسی مشکل ندارد؟', a: 'خروجی CSV با BOM استاندارد UTF-8 تولید می‌شود تا در اکسل فارسی درست نمایش داده شود؛ خروجی Excel نیز به‌صورت فایل xlsx استاندارد است.' },
  { q: 'داده‌های من کجا ذخیره می‌شود؟', a: 'در استقرار واقعی، داده‌ها در پایگاه داده PostgreSQL سرویس Supabase نگهداری می‌شود و دسترسی‌ها با Row Level Security کنترل می‌گردد. نسخه پیش‌نمایش محلی از SQLite روی سرور خودِ برنامه استفاده می‌کند.' },
]

export default async function FaqPage() {
  const user = await getCurrentUser()
  return (
    <>
      <SiteHeader isAuthenticated={Boolean(user)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-extrabold">راهنما و پرسش‌های متداول</h1>

        <section className="mt-10 space-y-4" aria-labelledby="guide">
          <h2 id="guide" className="text-xl font-bold">راهنمای گام‌به‌گام</h2>
          {GUIDE.map((g) => (
            <div key={g.title} className="rounded-xl border bg-card p-5">
              <h3 className="font-bold">{g.title}</h3>
              <p className="mt-1.5 text-sm leading-7 text-muted-foreground">{g.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-12" aria-labelledby="faq">
          <h2 id="faq" className="text-xl font-bold">پرسش‌های متداول</h2>
          <Accordion type="single" collapsible className="mt-4">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`f-${i}`}>
                <AccordionTrigger className="text-right">{f.q}</AccordionTrigger>
                <AccordionContent className="leading-7 text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <div className="mt-10 rounded-xl bg-muted/50 p-6 text-center">
          <p className="font-bold">آماده شروع هستید؟</p>
          <p className="mt-1 text-sm text-muted-foreground">اولین فرم خود را رایگان بسازید.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/forms/new">ساخت فرم جدید</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
