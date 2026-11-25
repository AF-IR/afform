import Link from 'next/link'
import type { Metadata } from 'next'
import {
  FileText, ClipboardList, BarChart3, ShieldCheck, Sparkles, Link2, Users,
  Timer, GitBranch, Download, LayoutTemplate, CheckCircle2, Star, Lock, BookOpen,
} from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { getCurrentUser } from '@/lib/auth/service'
import { templates } from '@/lib/templates/data'
import { FAQ_SCHEMA, USP_HEADLINE, USP_TEXT, EXPORT_USP_HEADLINE, EXPORT_USP_TEXT } from '@/lib/seo'
import { DOC_PAGES, docHref } from '@/lib/docs/content'

export const metadata: Metadata = {
  title: 'آرشام فرم | ساخت پرسشنامه با هوش مصنوعی، رایگان و تحلیل نتایج',
  description:
    'با هوش مصنوعی رایگان پرسشنامه بسازید و نتایج را تحلیل کنید: آزمون آنلاین امن با نمره خودکار، لینک اختصاصی، خروجی اکسل و JSON از پاسخ‌ها — بدون کدنویسی.',
  alternates: { canonical: '/' },
  keywords: [
    'ساخت پرسشنامه با هوش مصنوعی', 'پرسشنامه هوش مصنوعی رایگان', 'تحلیل نتایج پرسشنامه با هوش مصنوعی',
    'فرم ساز آنلاین', 'آزمون آنلاین', 'نظرسنجی آنلاین', 'خروجی اکسل نتایج پرسشنامه', 'آرشام فرم',
  ],
}

const FEATURES = [
  {
    icon: Sparkles,
    title: 'ساخت پرسشنامه با هوش مصنوعی',
    text: 'فقط موضوع را بنویسید؛ مدل زبانی سؤال‌ها، گزینه‌ها و در آزمون‌ها پاسخ صحیح و امتیاز را طراحی می‌کند — کاملاً رایگان و قابل ویرایش.',
  },
  {
    icon: ClipboardList,
    title: 'سازنده فرم بدون کدنویسی',
    text: '۲۲ نوع سؤال از متن کوتاه تا ماتریس و بارگذاری فایل؛ اجباری/اختیاری کردن، محدودیت طول و حداقل/حداکثر انتخاب.',
  },
  {
    icon: BarChart3,
    title: 'تحلیل هوش مصنوعی نتایج',
    text: 'مدل، متن واقعی پاسخ‌ها را می‌خواند و خلاصه، یافته‌های کلیدی و پیشنهاد عملی فارسی می‌دهد — نه فقط نمودار، بلکه بینش.',
  },
  {
    icon: Timer,
    title: 'آزمون واقعی با نمره‌دهی خودکار',
    text: 'تعریف پاسخ صحیح و امتیاز هر سؤال، مدت آزمون با کنترل زمان سمت سرور، سقف تلاش و نمره قبولی.',
  },
  {
    icon: Lock,
    title: 'ورود به آزمون با اکانت دانش‌آموز',
    text: 'برای هر دانش‌آموز نام کاربری و رمز تعریف می‌کنید (یا خودکار می‌سازید)؛ هر اکانت فقط یک بار می‌تواند شرکت کند و با همان اکانت نتیجه را می‌بیند.',
  },
  {
    icon: GitBranch,
    title: 'منطق شرطی هوشمند',
    text: 'نمایش سؤال بعدی بر اساس پاسخ قبلی؛ پنهان‌سازی مسیرهای نامرتبط و اعتبارسنجی فقط سؤال‌های نمایش‌داده‌شده.',
  },
  {
    icon: Link2,
    title: 'لینک اختصاصی امن',
    text: 'هر فرم منتشرشده لینکی غیرقابل حدس مثل /f/a8d4f2c9 می‌گیرد؛ پیش‌نویس‌ها هرگز از لینک عمومی در دسترس نیستند.',
  },
  {
    icon: Download,
    title: 'خروجی CSV، Excel و JSON',
    text: 'دریافت پاسخ‌ها در قالب دلخواه با ایمن‌سازی سلول‌ها؛ تحلیل را در ابزار خودتان آسان انجام دهید.',
  },
  {
    icon: LayoutTemplate,
    title: 'قالب‌های آماده کاربردی',
    text: 'رضایت‌سنجی مشتری، ثبت‌نام رویداد، آزمون آموزشی، ارزیابی کارکنان و … — قابل ویرایش کامل پس از انتخاب.',
  },
  {
    icon: ShieldCheck,
    title: 'امنیت جدی داده‌ها',
    text: 'احراز هویت واقعی، جداسازی داده هر کاربر در سطح دیتابیس (RLS)، محدودسازی نرخ درخواست و اعتبارسنجی دوطرفه.',
  },
]

const USE_CASES = [
  { icon: Users, title: 'معلمان و مدرسان', text: 'آزمونک فصل‌به‌فصل با زمان‌بندی و نمره خودکار' },
  { icon: FileText, title: 'دانشجویان و پژوهشگران', text: 'پرسشنامه پژوهشی با لیکرت و ماتریس' },
  { icon: Star, title: 'کسب‌وکارها', text: 'رضایت‌سنجی مشتری و دریافت بازخورد محصول' },
  { icon: Lock, title: 'تیم‌های منابع انسانی', text: 'فرم درخواست همکاری و ارزیابی کارکنان' },
]

const PLANS = [
  {
    name: 'پلن رایگان',
    price: '۰ تومان',
    period: 'برای شروع',
    features: [
      'ساخت فرم و آزمون نامحدود (تا سقف پلن رایگان سرویس‌های زیرساخت)',
      'همه ۲۲ نوع سؤال',
      'لینک اختصاصی و انتشار عمومی',
      'داشبورد پاسخ‌ها و گزارش‌ها',
      'خروجی CSV / Excel / JSON',
    ],
    cta: 'شروع رایگان',
    highlighted: false,
  },
  {
    name: 'پلن حرفه‌ای (در برنامه توسعه)',
    price: 'به‌زودی',
    period: 'برای تیم‌ها و سازمان‌ها',
    features: [
      'سقف بالاتر تعداد پاسخ و فرم',
      'قالب‌های پیشرفته و گزارش‌های بیشتر',
      'حذف برندینگ و فرم سفارشی',
      'همکاری چندنفره روی فرم‌ها',
    ],
    cta: 'اطلاع بعداً',
    highlighted: true,
  },
]

const FAQS = [
  {
    q: 'آیا برای ساخت فرم باید برنامه‌نویسی بلد باشم؟',
    a: 'خیر. سازنده فرم آرشام کاملاً بصری است؛ سؤال اضافه می‌کنید، تنظیمات هر سؤال را مشخص می‌کنید و فرم را با یک کلیک منتشر می‌کنید.',
  },
  {
    q: 'تفاوت پرسشنامه و آزمون در آرشام فرم چیست؟',
    a: 'در حالت آزمون می‌توانید برای هر سؤال پاسخ صحیح و امتیاز تعیین کنید؛ نمره نهایی، درصد قبولی، مدت آزمون و سقف تلاش به‌صورت خودکار و سمت سرور محاسبه و کنترل می‌شود.',
  },
  {
    q: 'پاسخ‌دهندگان برای پاسخ‌دادن باید ثبت‌نام کنند؟',
    a: 'خیر. فرم منتشرشده با لینک اختصاصی در دسترس هر کسی است که لینک را دارد؛ مگر اینکه سازنده فرم، ثبت پاسخ ناشناس را غیرفعال کند.',
  },
  {
    q: 'آزمون‌های زمان‌دار چطور کنترل می‌شوند؟',
    a: 'زمان شروع هر تلاش با مُهر سمت سرور ثبت می‌شود و هنگام ثبت پاسخ، مدت مجاز روی سرور بررسی می‌شود؛ به ساعت مرورگر کاربر اعتماد نمی‌شود.',
  },
  {
    q: 'آیا می‌توانم پاسخ‌ها را در اکسل داشته باشم؟',
    a: 'بله؛ خروجی CSV، Excel و JSON از داشبورد فرم در دسترس است و همه مقادیر برای جلوگیری از سوءاستفاده، ایمن‌سازی شده‌اند.',
  },
  {
    q: 'اطلاعات پاسخ‌دهندگان محفوظ است؟',
    a: 'پاسخ‌ها فقط برای سازنده فرم قابل مشاهده است؛ دسترسی‌ها در سطح دیتابیس با Row Level Security کنترل می‌شود و داده خصوصی در URL یا متادیتای عمومی قرار نمی‌گیرد.',
  },
]

export default async function LandingPage() {
  const user = await getCurrentUser()

  return (
    <>
      <SiteHeader isAuthenticated={Boolean(user)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />

      <main className="flex-1">
        {/* ---------- Hero ---------- */}
        <section className="hero-pattern relative overflow-hidden border-b">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
            <div className="auth-stagger">
              <Badge variant="secondary" className="mb-4 gap-1 bg-primary/10 text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                ساخت پرسشنامه با هوش مصنوعی — رایگان
              </Badge>
              <h1 className="text-3xl font-extrabold leading-[1.35] md:text-5xl md:leading-[1.3]">
                پرسش‌نامه را با هوش مصنوعی بساز،
                <span className="bg-gradient-to-l from-primary via-emerald-500 to-teal-600 bg-clip-text text-transparent"> نتایج را تحلیل کن</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground md:text-lg">
                آرشام فرم؛ رایگان و بدون کدنویسی. با هوش مصنوعی پرسشنامه و آزمون بسازید، لینک اختصاصی بگیرید و
                پاسخ‌ها را هم با داشبورد و هم با تحلیل هوش مصنوعی بررسی کنید — خروجی اکسل و JSON هم از آنِ شماست.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 px-8 text-base shadow-md shadow-primary/25 transition-transform hover:-translate-y-0.5">
                  <Link href={user ? '/dashboard/forms/new' : '/register'}>ساخت پرسشنامه با هوش مصنوعی</Link>
                </Button>
                {!user && (
                  <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
                    <Link href="/register">ثبت‌نام رایگان</Link>
                  </Button>
                )}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                مناسب افراد، معلمان، دانشجویان، پژوهشگران، شرکت‌ها و تیم‌های کوچک
              </p>
            </div>

            {/* product preview card */}
            <div className="relative auth-enter" style={{ animationDelay: '0.18s' }}>
              <div aria-hidden className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-primary/15 via-transparent to-emerald-400/15 blur-2xl brand-glow" />
              <Card className="relative mx-auto w-full max-w-md shadow-xl ring-1 ring-black/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">فرم ثبت‌نام کارگاه</CardTitle>
                    <Badge className="bg-primary/10 text-primary" variant="secondary">منتشرشده</Badge>
                  </div>
                  <CardDescription className="text-xs" dir="ltr">لینک اختصاصی: /f/a8d4f2c9</CardDescription>
                </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="mb-2 text-sm font-medium">نام و نام خانوادگی <span className="text-destructive">*</span></p>
                  <div className="h-9 rounded-md border bg-background" />
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="mb-2 text-sm font-medium">به کارگاه چه امتیازی می‌دهید؟ <span className="text-destructive">*</span></p>
                  <div className="flex gap-1" aria-hidden>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={`h-5 w-5 ${i <= 4 ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="mb-2 text-sm font-medium">نحوه حضور</p>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">حضوری ✓</span>
                    <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">آنلاین</span>
                  </div>
                </div>
                <Button className="w-full" disabled>ثبت پاسخ</Button>
              </CardContent>
              </Card>
              {/* floating feature chips — real product capabilities */}
              <div className="absolute -right-3 top-6 hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-bold shadow-md auth-fade sm:flex">
                <ClipboardList className="h-3.5 w-3.5 text-primary" aria-hidden />
                ۲۲ نوع سؤال
              </div>
              <div className="absolute -left-3 bottom-10 hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-bold shadow-md auth-fade sm:flex">
                <Timer className="h-3.5 w-3.5 text-primary" aria-hidden />
                نمره‌دهی خودکار آزمون
              </div>
            </div>
          </div>
        </section>

        {/* ---------- fact strip (true product facts) ---------- */}
        <section aria-label="آمار محصول" className="fade-up border-b bg-card">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-6 text-center sm:grid-cols-4">
            {[
              { value: '۲۲', label: 'نوع سؤال قابل استفاده' },
              { value: '۱۰', label: 'قالب آماده کاربردی' },
              { value: '۳', label: 'فرمت خروجی پاسخ‌ها' },
              { value: '۱۰۰٪', label: 'فارسی و راست‌به‌چپ' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-extrabold text-primary md:text-3xl">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground md:text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Signature USP: AI (primary keyword) ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="usp">
          <div className="fade-up rounded-3xl border border-primary/20 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-8 md:p-10">
            <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
              <div>
                <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary">مزیت ویژه آرشام فرم</Badge>
                <h2 id="usp" className="text-xl font-extrabold leading-snug md:text-2xl">{USP_HEADLINE}</h2>
                <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{USP_TEXT}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild className="justify-center">
                  <Link href={user ? '/dashboard/forms/new' : '/register'}>همین حالا امتحان کنید</Link>
                </Button>
                <Button asChild variant="outline" className="justify-center">
                  <Link href="/docs/ai-features">راهنمای هوش مصنوعی</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Secondary USP: free exports (Excel/JSON) ---------- */}
        <section className="mx-auto max-w-6xl px-4 pb-14" aria-labelledby="usp-exports">
          <div className="fade-up rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-8">
            <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
              <div>
                <Badge variant="secondary" className="mb-3 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  تحلیل را آسان کنید
                </Badge>
                <h2 id="usp-exports" className="text-lg font-extrabold leading-snug md:text-xl">{EXPORT_USP_HEADLINE}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{EXPORT_USP_TEXT}</p>
              </div>
              <Button asChild variant="outline" className="justify-center">
                <Link href="/docs/exports-reports">راهنمای خروجی‌ها</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ---------- Use cases ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="usecases">
          <h2 id="usecases" className="text-center text-2xl font-extrabold md:text-3xl">برای چه کسانی؟</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((u) => (
              <Card key={u.title} className="text-center">
                <CardContent className="flex flex-col items-center gap-3 p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    <u.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="font-bold">{u.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{u.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section id="features" className="border-y bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-2xl font-extrabold md:text-3xl">قابلیت‌های اصلی</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
              همه چیزهایی که برای ساخت، انتشار و تحلیل یک فرم واقعی لازم دارید
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>
        </section>

        {/* ---------- Question types ---------- */}
        <section id="question-types" className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="qtypes">
          <h2 id="qtypes" className="text-center text-2xl font-extrabold md:text-3xl">انواع سؤال‌ها</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            از سؤال‌های متنی ساده تا مقیاس لیکرت، ماتریس و بارگذاری فایل — هر نوع با تنظیمات مخصوص خودش
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[
              'متن کوتاه', 'متن بلند', 'ایمیل', 'شماره تلفن', 'عدد', 'URL',
              'انتخاب یک گزینه', 'انتخاب چند گزینه', 'فهرست کشویی', 'بله یا خیر',
              'امتیازدهی عددی', 'مقیاس لیکرت', 'امتیاز ۱ تا ۵', 'امتیاز ۱ تا ۱۰', 'انتخاب ستاره‌ای',
              'تاریخ', 'ساعت', 'بارگذاری فایل', 'ماتریس سؤالات', 'بخش توضیحی', 'جداکننده بخش‌ها', 'چندگزینه‌ای با توضیح',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm font-medium">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {t}
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Templates ---------- */}
        <section id="templates" className="border-y bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-2xl font-extrabold md:text-3xl">نمونه فرم‌ها و آزمون‌های آماده</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
              با یک کلیک یک نسخه مستقل بسازید و سؤال‌ها را به دلخواه تغییر دهید
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.slice(0, 6).map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <Badge variant="secondary" className="w-fit">{t.category}</Badge>
                    <CardTitle className="mt-2 text-base">{t.title}</CardTitle>
                    <CardDescription className="text-sm leading-6">{t.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t.questions.length} سؤال</span>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/register">استفاده از قالب</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Button asChild variant="ghost">
                <Link href="/templates">مشاهده همه قالب‌های آماده</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ---------- Plans ---------- */}
        <section id="plans" className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="plans-title">
          <h2 id="plans-title" className="text-center text-2xl font-extrabold md:text-3xl">پلن‌های استفاده</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            شروع با پلن رایگان؛ امکانات پیشرفته در پلن حرفه‌ای (در برنامه توسعه) اضافه می‌شود
          </p>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
            {PLANS.map((p) => (
              <Card key={p.name} className={p.highlighted ? 'border-primary/50 shadow-md' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    {p.highlighted && <Badge>به‌زودی</Badge>}
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-extrabold">{p.price}</span>
                    <span className="mr-2 text-sm text-muted-foreground">— {p.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm leading-6">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-6 w-full" variant={p.highlighted ? 'outline' : 'default'} disabled={p.highlighted}>
                    <Link href={p.highlighted ? '/plans' : '/register'}>{p.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-6 text-muted-foreground">
            استفاده از پلن رایگان بدون پرداخت است؛ سقف واقعی مصرف به محدودیت‌های پلن رایگان سرویس‌های زیرساخت
            (Vercel و Supabase) بستگی دارد که در راهنمای استقرار مستند شده است.
          </p>
        </section>

        {/* ---------- Docs & guides ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="docs-title">
          <h2 id="docs-title" className="text-center text-2xl font-extrabold md:text-3xl">مستندات کامل و راهنماهای کاربردی</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            برای هر سؤال، یک راهنمای مفصل فارسی: از انتخاب نوع سؤال تا امنیت آزمون و تحلیل داده
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DOC_PAGES.map((d) => (
              <Link key={d.slug} href={docHref(d.slug)} className="group">
                <div className="flex h-full items-start gap-3 rounded-xl border bg-card p-4 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-4 w-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-bold group-hover:text-primary">{d.title}</span>
                    <span className="mt-1 block text-xs leading-6 text-muted-foreground">{d.description}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Button asChild variant="ghost">
              <Link href="/docs">مشاهده همه مستندات ←</Link>
            </Button>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" className="border-t bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-center text-2xl font-extrabold md:text-3xl">پرسش‌های متداول</h2>
            <Accordion type="single" collapsible className="mt-8">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-right text-base">{f.q}</AccordionTrigger>
                  <AccordionContent className="leading-7 text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ---------- Final CTA ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-2xl font-extrabold md:text-3xl">همین حالا اولین فرم خود را بسازید</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            ثبت‌نام کمتر از یک دقیقه طول می‌کشد و همه قابلیت‌ها در پلن رایگان در دسترس شماست.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-8">
              <Link href={user ? '/dashboard/forms/new' : '/register'}>ساخت فرم جدید</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8">
              <Link href="/dashboard/templates">مرور قالب‌ها</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
