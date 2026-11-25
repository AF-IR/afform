'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { BarChart3, CheckCircle2, CircleAlert, Hourglass, KeyRound, Loader2, Lock, SearchCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { faDate, faNumber } from '@/lib/persian'

interface PerQuestion {
  questionId: string
  title: string
  earned: number
  max: number
  correct: boolean | null
}

interface ResultData {
  totalScore: number
  maxScore: number
  passed: boolean | null
  perQuestion: PerQuestion[]
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'waiting'; releaseAt: string | null; submittedAt?: string }
  | { kind: 'not-found' }
  | { kind: 'done'; name: string | null; result: ResultData; submittedAt?: string }

/** Participant-side result lookup with the exam username/password. */
export function ExamResultClient({
  publicId,
  formTitle,
  accountsEnabled,
}: {
  publicId: string
  formTitle: string
  accountsEnabled: boolean
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function lookup() {
    if (!accountsEnabled) {
      setState({ kind: 'error', message: 'این آزمون با اکانت کاربری اجرا نمی‌شود؛ نتیجه را از برگزارکننده پیگیری کنید.' })
      return
    }
    if (!username.trim() || !password.trim()) {
      toast.error('نام کاربری و رمز عبور را وارد کنید')
      return
    }
    setState({ kind: 'loading' })
    try {
      const res = await fetch(`/api/public/forms/${publicId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam: { username: username.trim(), password } }),
      })
      const data = await res.json()
      if (!res.ok) {
        setState({ kind: 'error', message: data.error ?? 'دریافت نتیجه ناموفق بود' })
        return
      }
      if (!data.found) {
        setState({ kind: 'not-found' })
        return
      }
      if (!data.released) {
        setState({ kind: 'waiting', releaseAt: data.releaseAt ?? null, submittedAt: data.submittedAt })
        return
      }
      if (!data.result) {
        setState({ kind: 'not-found' })
        return
      }
      setState({ kind: 'done', name: data.participantName ?? null, result: data.result, submittedAt: data.submittedAt })
    } catch {
      setState({ kind: 'error', message: 'خطای شبکه؛ دوباره تلاش کنید' })
    }
  }

  if (state.kind === 'done') {
    const r = state.result
    const pct = r.maxScore > 0 ? Math.round((r.totalScore / r.maxScore) * 100) : 0
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
        <Card>
          <CardContent className="p-6 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BarChart3 className="h-7 w-7" aria-hidden />
            </span>
            <h1 className="text-lg font-extrabold">نتیجه آزمون «{formTitle}»</h1>
            {state.name && <p className="mt-1 text-sm text-muted-foreground">داوطلب: {state.name}</p>}
            <div
              className={`mt-5 rounded-xl border p-5 ${
                r.passed === true
                  ? 'border-green-600/40 bg-green-500/10'
                  : r.passed === false
                    ? 'border-destructive/40 bg-destructive/10'
                    : 'bg-muted/50'
              }`}
            >
              <p className="text-sm text-muted-foreground">نمره نهایی</p>
              <p className="mt-1 text-4xl font-extrabold">
                {faNumber(r.totalScore, { maximumFractionDigits: 1 })}
                <span className="mr-2 text-lg font-medium text-muted-foreground">از {faNumber(r.maxScore, { maximumFractionDigits: 1 })}</span>
              </p>
              <p className="mt-1 text-sm font-bold text-muted-foreground">{faNumber(pct)}٪</p>
              {r.passed !== null && (
                <p className={`mt-2 inline-flex items-center gap-1.5 text-sm font-bold ${r.passed ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
                  {r.passed ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}
                  {r.passed ? 'قبول شدید' : 'متأسفانه قبول نشدید'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {r.perQuestion.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-bold">کارنامه سؤال‌به‌سؤال</h2>
              <ul className="space-y-2">
                {r.perQuestion.map((p, i) => (
                  <li key={p.questionId} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-6">
                        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1 text-[11px] font-bold text-muted-foreground">
                          {faNumber(i + 1)}
                        </span>
                        {p.title}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                        p.correct === true
                          ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                          : p.correct === false
                            ? 'bg-destructive/15 text-destructive'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {faNumber(p.earned, { maximumFractionDigits: 1 })} از {faNumber(p.max, { maximumFractionDigits: 1 })}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="pb-8 text-center">
          <Button variant="ghost" asChild>
            <Link href="/">صفحه اصلی آرشام فرم</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (state.kind === 'waiting') {
    return (
      <CenteredCard icon={Hourglass} title="نتیجه هنوز اعلام نشده است" text="نتیجهٔ شما در زمانی که برگزارکننده تعیین کرده است در همین صفحه نمایش داده می‌شود.">
        {state.releaseAt && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
            زمان اعلام نتیجه: <span className="font-bold">{faDate(state.releaseAt, true)}</span>
          </p>
        )}
        <Button variant="outline" onClick={() => setState({ kind: 'idle' })}>بازگشت</Button>
      </CenteredCard>
    )
  }

  if (state.kind === 'not-found') {
    return (
      <CenteredCard icon={SearchCheck} title="پاسخی برای این اکانت ثبت نشده است" text="این اکانت هنوز در آزمون شرکت نکرده است. اگر مطمئن هستید که شرکت کرده‌اید، با برگزارکننده تماس بگیرید.">
        <Button variant="outline" onClick={() => setState({ kind: 'idle' })}>تلاش مجدد</Button>
      </CenteredCard>
    )
  }

  if (state.kind === 'error') {
    return (
      <CenteredCard icon={CircleAlert} title="دریافت نتیجه ممکن نشد" text={state.message}>
        <Button variant="outline" onClick={() => setState({ kind: 'idle' })}>تلاش مجدد</Button>
      </CenteredCard>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md animate-in fade-in slide-in-from-bottom-3 duration-300">
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-7 w-7" aria-hidden />
            </span>
            <h1 className="text-lg font-extrabold">مشاهده نتیجه آزمون</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              برای دیدن نتیجهٔ آزمون «{formTitle}»، همان نام کاربری و رمزی که برگزارکننده به شما داده است را وارد کنید.
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="res-user">نام کاربری</Label>
              <Input
                id="res-user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثلاً: student01"
                dir="ltr"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-pass">رمز عبور</Label>
              <Input
                id="res-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                dir="ltr"
                autoComplete="off"
                onKeyDown={(e) => { if (e.key === 'Enter') void lookup() }}
              />
            </div>
            <Button className="h-11 w-full" onClick={lookup} disabled={state.kind === 'loading'}>
              {state.kind === 'loading'
                ? <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden />
                : <KeyRound className="ml-2 h-4 w-4" aria-hidden />}
              مشاهده نتیجه
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CenteredCard({
  icon: Icon, title, text, children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  text: string
  children?: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="text-lg font-extrabold">{title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{text}</p>
          {children && <div className="mt-2 flex flex-col items-center gap-3">{children}</div>}
        </CardContent>
      </Card>
    </div>
  )
}
