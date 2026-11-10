import Link from 'next/link'
import { ClipboardList, FilePlus2, Send, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OverviewChart } from '@/components/dashboard/overview-chart'
import { getCurrentUser } from '@/lib/auth/service'
import { backend } from '@/lib/forms/service'
import { faNumber, faRelative } from '@/lib/persian'
import { FORM_TYPE_LABEL, STATUS_LABEL, type FormStatus } from '@/types'

export default async function DashboardOverviewPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const stats = await backend().overviewStats(user.id)
  const forms = await backend().listForms(user.id)
  const recentForms = forms.slice(0, 5)

  const cards = [
    { title: 'کل فرم‌ها', value: stats.totalForms, icon: ClipboardList },
    { title: 'فرم‌های منتشرشده', value: stats.publishedForms, icon: Send },
    { title: 'کل پاسخ‌های دریافتی', value: stats.totalResponses, icon: TrendingUp },
    { title: 'پاسخ‌های ۷ روز اخیر', value: stats.recentResponses, icon: FilePlus2 },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">سلام {user.displayName} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">نمای کلی فعالیت‌های شما در آرشام فرم</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/forms/new">
            <FilePlus2 className="ml-2 h-4 w-4" aria-hidden />
            ایجاد فرم جدید
          </Link>
        </Button>
      </div>

      {/* stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <c.icon className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{c.title}</p>
                <p className="text-2xl font-extrabold">{faNumber(c.value)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* daily responses chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">پاسخ‌های هفت روز اخیر</CardTitle>
            <CardDescription>بر اساس داده واقعی ثبت‌شده</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.totalResponses === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                <p>هنوز پاسخی ثبت نشده است.</p>
                <p>پس از انتشار فرم و دریافت پاسخ، نمودار اینجا نمایش داده می‌شود.</p>
              </div>
            ) : (
              <OverviewChart data={stats.daily.map((d) => ({ date: d.date, count: d.count }))} />
            )}
          </CardContent>
        </Card>

        {/* recent forms */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">آخرین فرم‌های شما</CardTitle>
            <CardDescription>۵ فرم اخیر بر اساس آخرین تغییر</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentForms.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                <p>هنوز فرمی نساخته‌اید.</p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/templates">مرور قالب‌های آماده</Link>
                </Button>
              </div>
            ) : (
              recentForms.map((f) => (
                <Link
                  key={f.id}
                  href={`/dashboard/forms/${f.id}`}
                  className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{f.title}</p>
                    <Badge variant={f.status === 'published' ? 'default' : f.status === 'closed' ? 'destructive' : 'secondary'} className="shrink-0">
                      {STATUS_LABEL[f.status as FormStatus]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {FORM_TYPE_LABEL[f.formType]} · {faNumber(f.questionCount ?? 0)} سؤال · {faNumber(f.responseCount ?? 0)} پاسخ · {faRelative(f.updatedAt)}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
