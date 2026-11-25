import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowRight, BarChart3, Clock, ExternalLink, GraduationCap, ListChecks,
  Lock, Pencil, Percent, ScrollText, Settings, ShieldCheck, Trophy, UserCheck, Users,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { backend } from '@/lib/forms/service'
import { getCurrentUser } from '@/lib/auth/service'
import { computeExamStats, resultReleaseLabel } from '@/lib/exam/panel'
import { faDate, faDuration, faNumber } from '@/lib/persian'
import { STATUS_LABEL, type FormStatus } from '@/types'

export const metadata = { title: 'کنترل آزمون', robots: { index: false, follow: false } }

export default async function ExamControlPage({ params }: { params: Promise<{ formId: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const { formId } = await params
  const form = await backend().getForm(formId, user.id)
  if (!form || form.formType !== 'quiz') notFound()

  const stats = await computeExamStats(form)
  const status = form.status as FormStatus
  const s = form.settings

  const links = [
    { href: `/dashboard/forms/${form.id}/edit`, label: 'ویرایش سؤال‌ها و بارم', desc: 'انواع ویژه آزمون، پاسخ صحیح و نمره هر سؤال', icon: ListChecks },
    { href: `/dashboard/exams/${form.id}/participants`, label: 'اکانت دانش‌آموزان', desc: 'تعریف نام کاربری و رمز برای هر شرکت‌کننده', icon: UserCheck },
    { href: `/dashboard/exams/${form.id}/results`, label: 'کارنامه نتایج', desc: 'نمره هر دانش‌آموز، درصد قبولی و مدت پاسخ‌گویی', icon: Trophy },
    { href: `/dashboard/forms/${form.id}/settings`, label: 'تنظیمات آزمون', desc: 'زمان، امنیت، زمان ارائه نتیجه و انتشار', icon: Settings },
    { href: `/dashboard/forms/${form.id}/reports`, label: 'گزارش تحلیلی', desc: 'تحلیل سؤال‌ها و نمودارهای نتیجه واقعی', icon: BarChart3 },
    { href: `/dashboard/forms/${form.id}/responses`, label: 'پاسخ‌های خام', desc: 'بررسی تک‌تک پاسخ‌ها و خروجی گرفتن', icon: ScrollText },
  ]

  const configChips = [
    { ok: true, label: `${faNumber(stats.totalQuestions)} سؤال (${faNumber(stats.scoreableQuestions)} نمره‌دار)` },
    { ok: s.timeLimitMinutes !== null, label: s.timeLimitMinutes !== null ? `زمان: ${faNumber(s.timeLimitMinutes)} دقیقه` : 'بدون محدودیت زمان' },
    { ok: true, label: s.maxAttempts === 1 ? 'شرکت: فقط یک‌بار' : s.maxAttempts !== null ? `سقف شرکت: ${faNumber(s.maxAttempts)} بار` : 'سقف شرکت: نامحدود' },
    { ok: s.examAccounts?.enabled, label: s.examAccounts?.enabled ? 'ورود با اکانت فعال' : 'ورود با اکانت غیرفعال' },
    { ok: s.passingScorePercent !== null, label: s.passingScorePercent !== null ? `حد قبولی: ${faNumber(s.passingScorePercent)}٪` : 'حد قبولی تعیین نشده' },
    { ok: true, label: resultReleaseLabel(form) },
    s.startAt ? { ok: true, label: `شروع: ${faDate(s.startAt, true)}` } : null,
    s.endAt ? { ok: true, label: `پایان: ${faDate(s.endAt, true)}` } : null,
  ].filter((c): c is { ok: boolean; label: string } => c !== null)

  const recent = stats.attempts.slice(0, 5)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-1 -ml-2 text-muted-foreground">
            <Link href="/dashboard/exams">
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              پنل آزمون
            </Link>
          </Button>
          <h1 className="flex flex-wrap items-center gap-2 truncate text-2xl font-extrabold">
            <GraduationCap className="h-6 w-6 shrink-0 text-primary" aria-hidden />
            {form.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            کنترل کامل آزمون — سؤال‌ها، شرکت‌کنندگان، نتایج و تنظیمات امنیتی
          </p>
        </div>
        <Badge variant={status === 'published' ? 'default' : status === 'closed' ? 'destructive' : 'secondary'} className="h-8 px-4 text-sm">
          {STATUS_LABEL[status]}
        </Badge>
      </div>

      {status === 'draft' && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <p className="font-medium">این آزمون هنوز منتشر نشده و دانش‌آموزان نمی‌توانند وارد شوند.</p>
            <Button asChild size="sm">
              <Link href={`/dashboard/forms/${form.id}/settings`}>
                <ShieldCheck className="ml-1.5 h-4 w-4" aria-hidden />
                انتشار آزمون
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {status !== 'draft' && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <span className="text-muted-foreground">لینک ورود دانش‌آموزان:</span>
            <code className="rounded bg-muted px-2 py-1 text-xs" dir="ltr">/f/{form.publicId}</code>
            <Button asChild size="sm" variant="outline">
              <Link href={`/f/${form.publicId}`} target="_blank">
                <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden />
                باز کردن
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* exam config chips */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">وضعیت پیکربندی آزمون</CardTitle>
          <CardDescription>این تنظیمات سمت سرور اعمال می‌شوند و مرورگر قابل دور زدن نیست</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-xs">
          {configChips.map((c) => (
            <span
              key={c.label}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${c.ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${c.ok ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} aria-hidden />
              {c.label}
            </span>
          ))}
        </CardContent>
      </Card>

      {/* live stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">شرکت‌کنندگان</p>
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
              <p className="text-sm text-muted-foreground">میانگین نمره</p>
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
              <p className="text-sm text-muted-foreground">قبولی / مردودی</p>
              <p className="text-2xl font-extrabold">
                {stats.gradedCount > 0 ? `${faNumber(stats.passedCount)} / ${faNumber(stats.failedCount)}` : '—'}
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
              <p className="text-sm text-muted-foreground">بارم کل</p>
              <p className="text-2xl font-extrabold">{stats.maxScoreSum > 0 ? faNumber(stats.maxScoreSum) : '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* recent attempts */}
      {recent.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">آخرین مشارکت‌ها</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/dashboard/exams/${form.id}/results`}>
                همه نتایج
                <ArrowRight className="mr-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 text-right font-medium">شرکت‌کننده</th>
                  <th className="py-2 text-right font-medium">نمره</th>
                  <th className="py-2 text-right font-medium">درصد</th>
                  <th className="py-2 text-right font-medium">وضعیت</th>
                  <th className="py-2 text-right font-medium">مدت</th>
                  <th className="py-2 text-right font-medium">زمان ارسال</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.responseId} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">
                      {a.displayName || a.respondentName || a.username || 'بدون اکانت'}
                    </td>
                    <td className="py-2.5" dir="ltr">
                      {a.totalScore !== null ? `${faNumber(a.totalScore)}/${faNumber(a.maxScore ?? 0)}` : '—'}
                    </td>
                    <td className="py-2.5">{a.percent !== null ? `${faNumber(a.percent)}٪` : '—'}</td>
                    <td className="py-2.5">
                      {a.passed === null ? '—' : (
                        <Badge variant={a.passed ? 'default' : 'destructive'} className="px-2 py-0.5 text-[11px]">
                          {a.passed ? 'قبول' : 'مردود'}
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5" dir="ltr">{a.durationSec !== null ? faDuration(a.durationSec) : '—'}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{faDate(a.submittedAt, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* management links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader className="flex-row items-center gap-3 pb-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <l.icon className="h-5 w-5" aria-hidden />
                </span>
                <CardTitle className="text-sm">{l.label}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs leading-5 text-muted-foreground">{l.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* security note */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm leading-6">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="text-muted-foreground">
            امنیت آزمون: پاسخ صحیح هرگز به مرورگر فرستاده نمی‌شود، زمان با ساعت سرور کنترل می‌شود، ورود مجدد با اکانت و کوکی
            امضاشده مسدود می‌شود و نتیجه فقط در زمان تعیین‌شده (زمان ارائه نتیجه) به دانش‌آموز نمایش داده می‌شود.
          </p>
        </CardContent>
      </Card>

      {form.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden />
              توضیحات آزمون برای شرکت‌کنندگان
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">{form.description}</CardContent>
        </Card>
      )}
    </div>
  )
}
