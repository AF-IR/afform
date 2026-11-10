import Link from 'next/link'
import type { Metadata } from 'next'
import { CheckCircle2, CircleDashed } from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth/service'

export const metadata: Metadata = {
  title: 'پلن‌های استفاده | آرشام فرم',
  description:
    'پلن رایگان آرشام فرم: ساخت فرم و آزمون نامحدود با همه ۲۲ نوع سؤال، لینک اختصاصی، داشبورد پاسخ‌ها، گزارش نموداری، خروجی CSV/Excel/JSON و تحلیل هوش مصنوعی نتایج.',
  alternates: { canonical: '/plans' },
}

const FREE_PLAN = [
  'ساخت فرم و آزمون نامحدود (تا سقف پلن رایگان سرویس‌های زیرساخت)',
  'همه ۲۲ نوع سؤال با تنظیمات اعتبارسنجی',
  'منطق شرطی و آزمون زمان‌دار با نمره‌دهی خودکار',
  'لینک اختصاصی امن و انتشار عمومی',
  'داشبورد پاسخ‌ها با جست‌وجو و فیلتر',
  'گزارش نموداری مبتنی بر داده واقعی',
  'تحلیل هوش مصنوعی نتایج (Z.AI)',
  'خروجی CSV / Excel / JSON',
  'بارگذاری فایل در پاسخ‌ها',
  'قالب‌های آماده قابل ویرایش',
]

const UPCOMING = [
  'سقف بالاتر تعداد پاسخ و فرم',
  'قالب‌های پیشرفته و گزارش‌های بیشتر',
  'حذف برندینگ و فرم سفارشی',
  'همکاری چندنفره روی فرم‌ها',
]

export default async function PlansPage() {
  const user = await getCurrentUser()

  return (
    <>
      <SiteHeader isAuthenticated={Boolean(user)} />
      <main className="flex-1">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center">
            <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary">پلن‌های استفاده</Badge>
            <h1 className="text-3xl font-extrabold md:text-4xl">شروع رایگان، بدون نیاز به پرداخت</h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              همه قابلیت‌های اصلی امروز در پلن رایگان فعال است؛ امکانات تیمی در پلن حرفه‌ای اضافه خواهد شد.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <Card className="border-primary/50 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">پلن رایگان</CardTitle>
                  <Badge className="bg-primary/10 text-primary" variant="secondary">فعال</Badge>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold">۰ تومان</span>
                  <span className="mr-2 text-sm text-muted-foreground">— برای شروع</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {FREE_PLAN.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm leading-6">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6 w-full">
                  <Link href={user ? '/dashboard/forms/new' : '/register'}>
                    {user ? 'ساخت فرم جدید' : 'شروع رایگان'}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">پلن حرفه‌ای</CardTitle>
                  <Badge variant="secondary">در برنامه توسعه</Badge>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold">به‌زودی</span>
                  <span className="mr-2 text-sm text-muted-foreground">— برای تیم‌ها و سازمان‌ها</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {UPCOMING.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                      <CircleDashed className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" variant="outline" disabled>
                  اطلاع‌رسانی بعداً
                </Button>
              </CardContent>
            </Card>
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-6 text-muted-foreground">
            استفاده از پلن رایگان بدون پرداخت است؛ سقف واقعی مصرف به محدودیت‌های پلن رایگان سرویس‌های زیرساخت
            (Vercel و Supabase) بستگی دارد که در راهنمای استقرار مستند شده است.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
