import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth/service'
import { TEMPLATE_CATEGORIES, templates } from '@/lib/templates/data'

export const metadata: Metadata = {
  title: 'قالب‌های آماده فرم، پرسشنامه و آزمون | آرشام فرم',
  description:
    '۱۰ قالب آماده در ۵ دسته: رضایت‌سنجی مشتری، ثبت‌نام رویداد، پرسشنامه پژوهشی، آزمون اطلاعات عمومی، ارزیابی کارکنان و … — با یک کلیک نسخه مستقل بسازید و ویرایش کنید.',
  alternates: { canonical: '/templates' },
}

const FORM_TYPE_LABEL: Record<string, string> = {
  form: 'فرم',
  survey: 'پرسشنامه',
  quiz: 'آزمون',
}

export default async function TemplatesPage() {
  const user = await getCurrentUser()

  const byCategory = TEMPLATE_CATEGORIES.map((cat) => ({
    category: cat,
    items: templates.filter((t) => t.category === cat),
  })).filter((g) => g.items.length > 0)

  return (
    <>
      <SiteHeader isAuthenticated={Boolean(user)} />
      <main className="flex-1">
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center">
            <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary">
              {templates.length} قالب آماده
            </Badge>
            <h1 className="text-3xl font-extrabold md:text-4xl">نمونه فرم‌ها، پرسشنامه‌ها و آزمون‌های آماده</h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              با یک کلیک یک نسخه مستقل از هر قالب بسازید و سؤال‌ها را به دلخواه تغییر دهید.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl space-y-12 px-4 py-14">
          {byCategory.map((group) => (
            <div key={group.category}>
              <h2 className="mb-5 flex items-center gap-2 text-xl font-extrabold">
                <span className="h-5 w-1.5 rounded-full bg-primary" aria-hidden />
                {group.category}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((t) => (
                  <Card key={t.id} className="flex flex-col transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <Badge variant="secondary" className="w-fit">
                        {FORM_TYPE_LABEL[t.formType] ?? t.formType}
                      </Badge>
                      <CardTitle className="mt-2 text-base">{t.title}</CardTitle>
                      <CardDescription className="text-sm leading-6">{t.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t.questions.length} سؤال</span>
                      <Button asChild size="sm" variant="outline">
                        <Link href={user ? `/dashboard/forms/new?template=${t.id}` : '/register'}>
                          استفاده از قالب
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-12 text-center">
            <h2 className="text-2xl font-extrabold md:text-3xl">قالب مورد نظرتان را پیدا نکردید؟</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              با سازنده فرم از صفر شروع کنید — افزودن سؤال‌ها کمتر از چند دقیقه طول می‌کشد.
            </p>
            <Button asChild className="mt-6" size="lg">
              <Link href={user ? '/dashboard/forms/new' : '/register'}>ساخت فرم جدید</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
