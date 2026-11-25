import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowRight, Clock, GraduationCap, Percent, Settings, Trophy, UserCheck, Users,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { backend } from '@/lib/forms/service'
import { getCurrentUser } from '@/lib/auth/service'
import { computeExamStats, resultReleaseLabel } from '@/lib/exam/panel'
import { faDate, faDuration, faNumber } from '@/lib/persian'

export const metadata = { title: 'کارنامه نتایج آزمون', robots: { index: false, follow: false } }

export default async function ExamResultsPage({ params }: { params: Promise<{ formId: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const { formId } = await params
  const form = await backend().getForm(formId, user.id)
  if (!form || form.formType !== 'quiz') notFound()

  const stats = await computeExamStats(form)
  const s = form.settings

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-1 -ml-2 text-muted-foreground">
            <Link href={`/dashboard/exams/${form.id}`}>
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              کنترل آزمون
            </Link>
          </Button>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">
            <GraduationCap className="h-6 w-6 shrink-0 text-primary" aria-hidden />
            کارنامه نتایج — {form.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            نمره هر شرکت‌کننده، درصد، وضعیت قبولی و مدت پاسخ‌گویی — همه از داده واقعی ثبت‌شده
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/forms/${form.id}/settings`}>
            <Settings className="ml-1.5 h-3.5 w-3.5" aria-hidden />
            تغییر زمان ارائه نتیجه
          </Link>
        </Button>
      </div>

      {/* summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">مشارکت</p>
              <p className="text-2xl font-extrabold">
                {stats.accountsDefined > 0 ? `${faNumber(stats.accountsSubmitted)}/${faNumber(stats.accountsDefined)}` : faNumber(stats.totalAttempts)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Percent className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">میانگین کلاس</p>
              <p className="text-2xl font-extrabold">
                {stats.averagePercent !== null ? `${faNumber(Math.round(stats.averagePercent))}٪` : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Trophy className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">نرخ قبولی</p>
              <p className="text-2xl font-extrabold">
                {stats.passRatePercent !== null ? `${faNumber(Math.round(stats.passRatePercent))}٪` : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Clock className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">زمان ارائه نتیجه</p>
              <p className="mt-1 text-sm font-bold leading-5">{resultReleaseLabel(form)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* results table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">کارنامه شرکت‌کنندگان</CardTitle>
          <CardDescription>
            {s.examAccounts?.enabled
              ? 'شرکت‌کننده‌ها با اکانت تعریف‌شده شما منطبق شده‌اند؛ نام کاربری همان اکانت است.'
              : 'این آزمون ورود با اکانت ندارد؛ شرکت‌کننده‌ها بدون هویت ثبت شده‌اند (برای اتصال نتیجه به دانش‌آموز، اکانت‌ها را فعال کنید).'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.attempts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
              <UserCheck className="h-8 w-8 text-muted-foreground/50" aria-hidden />
              <p className="text-sm text-muted-foreground">هنوز کسی در آزمون شرکت نکرده است.</p>
              {form.status === 'draft' && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/forms/${form.id}/settings`}>انتشار آزمون</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 text-right font-medium">#</th>
                    <th className="py-2 text-right font-medium">شرکت‌کننده</th>
                    <th className="py-2 text-right font-medium">اکانت</th>
                    <th className="py-2 text-right font-medium">نمره</th>
                    <th className="py-2 text-right font-medium">درصد</th>
                    <th className="py-2 text-right font-medium">وضعیت</th>
                    <th className="py-2 text-right font-medium">مدت پاسخ‌گویی</th>
                    <th className="py-2 text-right font-medium">زمان ارسال</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.attempts.map((a, i) => (
                    <tr key={a.responseId} className="border-b last:border-0">
                      <td className="py-2.5 text-xs text-muted-foreground">{faNumber(i + 1)}</td>
                      <td className="py-2.5 font-medium">{a.displayName || a.respondentName || '—'}</td>
                      <td className="py-2.5" dir="ltr">{a.username ?? '—'}</td>
                      <td className="py-2.5" dir="ltr">
                        {a.totalScore !== null ? `${faNumber(a.totalScore)} از ${faNumber(a.maxScore ?? 0)}` : '—'}
                      </td>
                      <td className="py-2.5">{a.percent !== null ? `${faNumber(a.percent)}٪` : '—'}</td>
                      <td className="py-2.5">
                        {a.passed === null ? (
                          <Badge variant="secondary" className="px-2 py-0.5 text-[11px]">بدون نمره</Badge>
                        ) : a.passed ? (
                          <Badge variant="default" className="px-2 py-0.5 text-[11px]">قبول</Badge>
                        ) : (
                          <Badge variant="destructive" className="px-2 py-0.5 text-[11px]">مردود</Badge>
                        )}
                      </td>
                      <td className="py-2.5" dir="ltr">{a.durationSec !== null ? faDuration(a.durationSec) : '—'}</td>
                      <td className="py-2.5 text-xs text-muted-foreground">{faDate(a.submittedAt, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
