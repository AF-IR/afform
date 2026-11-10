import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ClipboardList, Timer, GitBranch, Link2, BarChart3, Download,
  LayoutTemplate, ShieldCheck, Sparkles, Bot, FileUp, Lock,
} from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth/service'

export const metadata: Metadata = {
  title: 'قابلیت‌ها | آرشام فرم',
  description:
    'همه قابلیت‌های آرشام فرم: سازنده بصری با ۲۲ نوع سؤال، منطق شرطی، آزمون با نمره‌دهی خودکار، تحلیل هوش مصنوعی نتایج، خروجی CSV/Excel/JSON و امنیت در سطح دیتابیس.',
  alternates: { canonical: '/features' },
}

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'سازنده فرم بدون کدنویسی',
    text: '۲۲ نوع سؤال از متن کوتاه تا ماتریس و بارگذاری فایل؛ اجباری/اختیاری کردن، محدودیت طول، حداقل/حداکثر انتخاب و جابه‌جایی سؤال‌ها با کشیدن و رها کردن.',
  },
  {
    icon: Timer,
    title: 'آزمون واقعی با نمره‌دهی خودکار',
    text: 'تعریف پاسخ صحیح و امتیاز هر سؤال، مدت آزمون با کنترل زمان سمت سرور، سقف تلاش، ترتیب تصادفی سؤال‌ها و تعیین نمره قبولی.',
  },
  {
    icon: GitBranch,
    title: 'منطق شرطی هوشمند',
    text: 'نمایش سؤال بعدی بر اساس پاسخ قبلی؛ پنهان‌سازی مسیرهای نامرتبط و اعتبارسنجی فقط سؤال‌های نمایش‌داده‌شده روی سرور.',
  },
  {
    icon: Bot,
    title: 'تحلیل هوش مصنوعی نتایج',
    text: 'آمار واقعی پاسخ‌ها به مدل زبانی داده می‌شود و خروجی ساختاریافتهٔ فارسی می‌گیرید: خلاصهٔ تحلیلی، یافته‌های کلیدی و پیشنهادهای بهبود.',
  },
  {
    icon: Link2,
    title: 'لینک اختصاصی امن',
    text: 'هر فرم منتشرشده لینکی غیرقابل حدس مثل /f/a8d4f2c9 می‌گیرد؛ پیش‌نویس‌ها هرگز از لینک عمومی در دسترس نیستند و فرم بسته‌شده پاسخ جدید نمی‌پذیرد.',
  },
  {
    icon: BarChart3,
    title: 'داشبورد تحلیل پاسخ‌ها',
    text: 'تعداد پاسخ‌ها، توزیع گزینه‌ها، میانگین امتیازها، روند ۳۰ روزه، میانگین نمره آزمون و درصد قبولی — همه بر اساس داده واقعی.',
  },
  {
    icon: Download,
    title: 'خروجی CSV، Excel و JSON',
    text: 'دریافت پاسخ‌ها در قالب دلخواه با ایمن‌سازی سلول‌ها در برابر سوءاستفاده؛ دسترسی و مالکیت در هر خروجی سمت سرور بررسی می‌شود.',
  },
  {
    icon: LayoutTemplate,
    title: 'قالب‌های آماده کاربردی',
    text: '۱۰ قالب در ۵ دسته: رضایت‌سنجی مشتری، ثبت‌نام رویداد، آزمون آموزشی، ارزیابی کارکنان و … — قابل ویرایش کامل پس از انتخاب.',
  },
  {
    icon: FileUp,
    title: 'بارگذاری فایل در پاسخ‌ها',
    text: 'پاسخ‌دهندگان می‌توانند فایل پیوست کنند؛ فایل‌ها در باکت خصوصی ذخیره می‌شوند و فقط مالک فرم و از مسیر امن به آن‌ها دسترسی دارد.',
  },
  {
    icon: ShieldCheck,
    title: 'انتشار کنترل‌شده',
    text: 'تاریخ شروع و پایان، سقف تعداد پاسخ، پاسخ ناشناس، صفحه تشکر اختصاصی و نوار پیشرفت — همه اختیاری و از تنظیمات فرم.',
  },
  {
    icon: Lock,
    title: 'امنیت جدی داده‌ها',
    text: 'احراز هویت واقعی، جداسازی داده هر کاربر در سطح دیتابیس (Row Level Security)، محدودسازی نرخ درخواست و اعتبارسنجی دوطرفه کلاینت/سرور.',
  },
]

const QUESTION_TYPES = [
  'متن کوتاه', 'متن بلند', 'ایمیل', 'شماره تلفن', 'عدد', 'URL',
  'انتخاب یک گزینه', 'انتخاب چند گزینه', 'فهرست کشویی', 'بله یا خیر',
  'امتیازدهی عددی', 'مقیاس لیکرت', 'امتیاز ۱ تا ۵', 'امتیاز ۱ تا ۱۰', 'انتخاب ستاره‌ای',
  'تاریخ', 'ساعت', 'بارگذاری فایل', 'ماتریس سؤالات', 'بخش توضیحی', 'جداکننده بخش‌ها', 'چندگزینه‌ای با توضیح',
]

export default async function FeaturesPage() {
  const user = await getCurrentUser()

  return (
    <>
      <SiteHeader isAuthenticated={Boolean(user)} />
      <main className="flex-1">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center">
            <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary">قابلیت‌های آرشام فرم</Badge>
            <h1 className="text-3xl font-extrabold md:text-4xl">همه ابزارهایی که برای یک فرم واقعی لازم دارید</h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              از ساخت بصری سؤال‌ها تا انتشار امن و تحلیل هوشمند نتایج — همه چیز در یک پلتفرم فارسی و راست‌به‌چپ.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{f.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-center text-2xl font-extrabold md:text-3xl">انواع سؤال‌ها</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
              از سؤال‌های متنی ساده تا مقیاس لیکرت، ماتریس و بارگذاری فایل — هر نوع با تنظیمات مخصوص خودش
            </p>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {QUESTION_TYPES.map((t) => (
                <div key={t} className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm font-medium">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 text-center">
          <h2 className="text-2xl font-extrabold md:text-3xl">همین حالا شروع کنید</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            ثبت‌نام کمتر از یک دقیقه طول می‌کشد و همه این قابلیت‌ها در پلن رایگان در دسترس است.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-8">
              <Link href={user ? '/dashboard/forms/new' : '/register'}>ساخت فرم جدید</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8">
              <Link href="/plans">مشاهده پلن‌ها</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
