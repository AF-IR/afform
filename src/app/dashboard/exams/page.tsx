import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight, Clock, ExternalLink, GraduationCap, ListChecks, Percent,
  Play, Settings, TrendingUp, Trophy, UserCheck, Users,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { backend } from '@/lib/forms/service'
import { getCurrentUser } from '@/lib/auth/service'
import { computeExamStats, isExam, resultReleaseLabel } from '@/lib/exam/panel'
import { faNumber, faRelative } from '@/lib/persian'
import { STATUS_LABEL, type FormStatus } from '@/types'

export const metadata = { title: 'پنل آزمون', robots: { index: false, follow: false } }

export default async function ExamsPanelPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/dashboard/exams')

  const allForms = await backend().listForms(user.id)
  const examForms = allForms.filter(isExam)

  // real per-exam stats (from stored responses — no demo data)
  const exams = await Promise.all(
    examForms.map(async (f) => {
      const full = await backend().getForm(f.id, user.id)
      if (!full) return null
      const stats = await computeExamStats(full)
      return { form: f, stats }
    }),
  )
  const rows = exams.filter((e): e is NonNullable<typeof e> => e !== null)

  const totalAttempts = rows.reduce((sum, e) => sum + e.stats.totalAttempts, 0)
  const graded = rows.filter((e) => e.stats.averagePercent !== null)
  const overallAvg = graded.length
    ? graded.reduce((sum, e) => sum + (e.stats.averagePercent ?? 0), 0) / graded.length
    : null
  const publishedCount = rows.filter((e) => e.form.status === 'published').length

  const cards = [
    { title: 'تعداد آزمون‌ها', value: faNumber(rows.length), icon: GraduationCap },
    { title: 'آزمون‌های فعال', value: faNumber(publishedCount), icon: Play },
    { title: 'کل شرکت‌کنندگان', value: faNumber(totalAttempts), icon: Users },
    {
      title: 'میانگین نمرات',
      value: overallAvg !== null ? `${faNumber(Math.round(overallAvg))}٪` : '—',
      icon: Percent,
    },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <GraduationCap className="h-4 w-4" aria-hidden />
            پنل اختصاصی آزمون
          </p>
          <h1 className="mt-1 text-2xl font-extrabold">مدیریت آزمون‌ها</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ساخت آزمون امن، تعریف اکانت دانش‌آموزان، کنترل زمان و مشاهده نتایج — همه در یک پنل جداگانه
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/exams/new">
            <GraduationCap className="ml-2 h-4 w-4" aria-hidden />
            ایجاد آزمون جدید
          </Link>
        </Button>
      </div>

      {/* panel stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <c.icon className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{c.title}</p>
                <p className="text-2xl font-extrabold">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* exam list */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <GraduationCap className="h-8 w-8" aria-hidden />
            </span>
            <div className="space-y-1">
              <p className="font-bold">هنوز آزمونی نساخته‌اید</p>
              <p className="text-sm text-muted-foreground">
                با پنل آزمون، آزمون امن با اکانت اختصاصی دانش‌آموز، زمان‌بندی و نمره‌دهی خودکار بسازید
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/exams/new">ایجاد اولین آزمون</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map(({ form, stats }) => {
            const status = form.status as FormStatus
            return (
              <Card key={form.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 border-b pb-4">
                  <div className="min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      <Link href={`/dashboard/exams/${form.id}`} className="hover:underline">
                        {form.title}
                      </Link>
                      <Badge variant={status === 'published' ? 'default' : status === 'closed' ? 'destructive' : 'secondary'}>
                        {STATUS_LABEL[status]}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {faNumber(stats.totalQuestions)} سؤال ({faNumber(stats.scoreableQuestions)} نمره‌دار) · آخرین فعالیت {faRelative(form.updatedAt)}
                    </CardDescription>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/exams/${form.id}`}>
                      کنترل آزمون
                      <ArrowRight className="mr-1 h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  {/* exam stat chips */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      {stats.accountsDefined > 0
                        ? `${faNumber(stats.accountsSubmitted)}/${faNumber(stats.accountsDefined)} اکانت شرکت کرده`
                        : `${faNumber(stats.totalAttempts)} مشارکت`}
                    </span>
                    {stats.averagePercent !== null && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                        <Percent className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        میانگین {faNumber(Math.round(stats.averagePercent))}٪
                      </span>
                    )}
                    {stats.passRatePercent !== null && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                        <Trophy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        قبولی {faNumber(Math.round(stats.passRatePercent))}٪
                      </span>
                    )}
                    {form.settings.timeLimitMinutes !== null && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        {faNumber(form.settings.timeLimitMinutes)} دقیقه
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      {resultReleaseLabel(form)}
                    </span>
                  </div>

                  {/* quick links */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/dashboard/exams/${form.id}/participants`}>
                        <UserCheck className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                        اکانت دانش‌آموزان
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/dashboard/exams/${form.id}/results`}>
                        <Trophy className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                        کارنامه نتایج
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/dashboard/forms/${form.id}/edit`}>
                        <ListChecks className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                        ویرایش سؤال‌ها
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/dashboard/forms/${form.id}/settings`}>
                        <Settings className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                        تنظیمات آزمون
                      </Link>
                    </Button>
                    {form.status !== 'draft' && (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/f/${form.publicId}`} target="_blank">
                          <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                          صفحه آزمون
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* exam guidance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
            چگونه یک آزمون حرفه‌ای بسازیم؟
          </CardTitle>
          <CardDescription>چهار گام تا یک آزمون امن و استاندارد</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm leading-6 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="font-semibold">۱. سؤال‌ها را بسازید</p>
            <p className="mt-1 text-muted-foreground">
              از انواع ویژه آزمون (چندگزینه‌ای، صحیح/غلط، عددی، جای خالی) استفاده کنید و نمره هر سؤال و پاسخ صحیح را تعیین کنید.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-semibold">۲. اکانت دانش‌آموزان را تعریف کنید</p>
            <p className="mt-1 text-muted-foreground">
              برای هر شرکت‌کننده نام کاربری و رمز بسازید؛ ورود به آزمون و مشاهده نتیجه فقط با همان اکانت انجام می‌شود.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-semibold">۳. زمان و امنیت را تنظیم کنید</p>
            <p className="mt-1 text-muted-foreground">
              مدت آزمون، سقف شرکت (پیش‌فرض یک‌بار)، بازه شروع و پایان و زمان ارائه نتیجه را مشخص کنید — همه سمت سرور اعمال می‌شود.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-semibold">۴. نتایج را ببینید و منتشر کنید</p>
            <p className="mt-1 text-muted-foreground">
              کارنامه هر دانش‌آموز، میانگین کلاس و نرخ قبولی را در پنل ببینید و در زمان تعیین‌شده به شرکت‌کنندگان نشان دهید.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
