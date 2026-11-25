'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AlertCircle, ArrowLeft, ArrowRight, CheckCircle2,
  ClipboardList, Hourglass, IdCard, LayoutGrid, Loader2, Lock, LogIn, Pencil,
  Play, Send, ShieldAlert, ShieldCheck, Timer, UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QuestionRenderer } from '@/components/questions/renderer'
import { MathText } from '@/components/questions/math-text'
import { computeVisibleQuestions } from '@/lib/forms/conditional'
import { validateAnswer } from '@/lib/validation/schemas'
import { faDuration, faNumber } from '@/lib/persian'
import { isValidNationalId, normalizeNationalId } from '@/lib/exam/identity'
import type { AnswerValue, FormSettings, FormType, IdentityGate, Question } from '@/types'

interface PublicForm {
  id: string
  title: string
  description: string
  formType: FormType
  settings: FormSettings
}

interface SubmitIdentity {
  fullName?: string
  nationalId?: string
}

interface ExamCredentials {
  username: string
  password: string
}

interface SubmitResult {
  totalScore: number
  maxScore: number
  passed: boolean | null
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Phase =
  | 'loading'
  | 'exam-login'
  | 'identity'
  | 'start'
  | 'ready'
  | 'submitted'
  | 'already'
  | 'expired'
  | 'error'

export function PublicFormClient({
  form,
  questions: serverQuestions,
  serverNow,
  requiresLogin,
  uploadUrl,
  publicId,
}: {
  form: PublicForm
  questions: Question[]
  serverNow: number
  requiresLogin: boolean
  uploadUrl: string
  publicId: string
}) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [errorText, setErrorText] = useState('')
  const [startError, setStartError] = useState('')
  const [resumed, setResumed] = useState(false)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [attemptToken, setAttemptToken] = useState<string | null>(null)
  const [deadline, setDeadline] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [thankYou, setThankYou] = useState(form.settings.thankYouMessage)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [releaseAt, setReleaseAt] = useState<string | null>(null)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [lastAnswers, setLastAnswers] = useState<Record<string, AnswerValue> | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  // exam access account credentials (never displayed, only re-sent on submit)
  const examCredsRef = useRef<ExamCredentials | null>(null)
  // legacy secure-exam identity step (کد ملی)
  const gate: IdentityGate | null = form.settings.identityGate
  const [fullName, setFullName] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [identityError, setIdentityError] = useState('')
  const [checkingIdentity, setCheckingIdentity] = useState(false)
  const identityRef = useRef<SubmitIdentity>({})
  // exam-login form
  const [examUser, setExamUser] = useState('')
  const [examPass, setExamPass] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const submittingRef = useRef(false)
  const clockOffset = useRef(Date.now() - serverNow)

  const isQuiz = form.formType === 'quiz'
  const timeLimit = form.settings.timeLimitMinutes
  const accountsEnabled = Boolean(form.settings.examAccounts?.enabled)
  const resultsEnabled = Boolean(form.settings.showResultsToRespondent)

  // shuffle (visual only — server validates everything)
  const questions = useMemo(() => {
    let qs = [...serverQuestions].sort((a, b) => a.position - b.position)
    if (form.settings.shuffleQuestions) qs = shuffle(qs)
    return qs
  }, [serverQuestions, form.settings.shuffleQuestions])

  // init: probe the attempt state (read-only) and pick the right screen.
  // The exam NEVER starts implicitly by opening the page — the timer begins
  // only when the participant logs in with their account (or presses شروع).
  useEffect(() => {
    let cancelled = false
    async function init() {
      if (requiresLogin) {
        if (!cancelled) setPhase('ready')
        return
      }
      try {
        const res = await fetch(`/api/public/forms/${publicId}/attempt`, { cache: 'no-store' })
        const data = await res.json()
        if (cancelled) return
        if (res.ok && data?.status === 'active') {
          clockOffset.current = Date.now() - (data.serverNow ?? Date.now())
          setAttemptToken(data.attemptToken)
          setDeadline(data.deadline)
          setResumed(true)
          setPhase('ready')
          return
        }
        if (res.ok && data?.status === 'done') {
          setPhase('already')
          return
        }
        if (res.ok && data?.status === 'expired') {
          setPhase('expired')
          return
        }
      } catch {
        // probe failed — fall through to the non-resume flow below
      }
      if (accountsEnabled) {
        setPhase('exam-login')
        return
      }
      if (form.settings.identityGate?.enabled) {
        setPhase('identity')
        return
      }
      // timed quiz → explicit start screen (timer starts on user intent)
      setPhase(isQuiz && timeLimit ? 'start' : 'ready')
    }
    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Start (or resume) the attempt on the server.
   * The server decides the deadline — and refuses a second attempt to anyone
   * who already participated (per account when the exam uses accounts).
   */
  const beginExam = useCallback(async (opts?: { identity?: SubmitIdentity; exam?: ExamCredentials }) => {
    setStartError('')
    const needsServer = Boolean((isQuiz && timeLimit) || form.settings.identityGate?.enabled || opts?.exam)
    if (needsServer) {
      try {
        const res = await fetch(`/api/public/forms/${publicId}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity: opts?.identity,
            exam: opts?.exam ? { username: opts.exam.username, password: opts.exam.password } : undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          const code = data?.code as string | undefined
          if (code === 'already_participated' || code === 'max_attempts') {
            setPhase('already')
            return false
          }
          if (code === 'time_expired') {
            setPhase('expired')
            return false
          }
          if (opts?.exam) {
            setStartError(data.error ?? 'ورود به آزمون ممکن نشد')
          } else if (form.settings.identityGate?.enabled) {
            setIdentityError(data.error ?? 'ورود به آزمون ممکن نشد')
          } else {
            setStartError(data.error ?? 'شروع آزمون ممکن نشد')
          }
          return false
        }
        if (data.attemptToken && data.deadline) {
          clockOffset.current = Date.now() - (data.serverNow ?? Date.now())
          setAttemptToken(data.attemptToken)
          setDeadline(data.deadline)
          setResumed(Boolean(data.resumed))
        }
      } catch {
        setStartError('خطای شبکه؛ دوباره تلاش کنید')
        return false
      }
    }
    setPhase('ready')
    return true
  }, [isQuiz, timeLimit, publicId, form.settings.identityGate])

  /** Exam login — account credentials are verified server-side, then the attempt starts. */
  async function loginExam() {
    setStartError('')
    if (!examUser.trim() || !examPass.trim()) {
      setStartError('نام کاربری و رمز عبور را وارد کنید')
      return
    }
    setLoggingIn(true)
    const creds: ExamCredentials = { username: examUser.trim(), password: examPass }
    examCredsRef.current = creds
    const ok = await beginExam({ exam: creds })
    if (!ok) examCredsRef.current = null
    setLoggingIn(false)
  }

  /** Legacy identity card submit — client-side validation, then server pre-check. */
  async function confirmIdentity() {
    setIdentityError('')
    const identity: SubmitIdentity = {}
    if (gate?.requireFullName) {
      if (fullName.trim().length < 3) {
        setIdentityError('نام و نام خانوادگی را کامل وارد کنید')
        return
      }
      identity.fullName = fullName.trim()
    }
    if (gate?.requireNationalId) {
      if (!isValidNationalId(nationalId)) {
        setIdentityError('کد ملی باید ۱۰ رقم معتبر باشد')
        return
      }
      identity.nationalId = normalizeNationalId(nationalId) ?? undefined
    }
    setCheckingIdentity(true)
    identityRef.current = identity
    await beginExam({ identity })
    setCheckingIdentity(false)
  }

  /** Start-screen button (non-gated timed quiz). */
  async function startExam() {
    setStartError('')
    await beginExam()
  }

  // countdown (display only — server is the authority)
  useEffect(() => {
    if (!deadline) return
    const tick = () => {
      const r = Math.max(0, Math.floor((deadline - (Date.now() - clockOffset.current)) / 1000))
      setRemaining(r)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])

  const visible = useMemo(() => computeVisibleQuestions(questions, answers), [questions, answers])
  const visibleList = questions.filter((q) => visible.has(q.id))
  const answerableList = visibleList.filter((q) => q.type !== 'info' && q.type !== 'separator')
  const answeredCount = answerableList.filter((q) => {
    const v = answers[q.id]
    return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
  }).length
  const progress = answerableList.length ? Math.round((answeredCount / answerableList.length) * 100) : 0

  function setAnswer(qid: string, v: AnswerValue) {
    setAnswers((a) => ({ ...a, [qid]: v }))
    setErrors((e) => {
      if (!e[qid]) return e
      const next = { ...e }
      delete next[qid]
      return next
    })
  }

  async function doSubmit(editId?: string) {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setErrors({})

    // client-side validation for fast feedback (server re-validates fully)
    const fieldErrors: Record<string, string> = {}
    for (const q of answerableList) {
      const res = validateAnswer(q, answers[q.id] ?? null)
      if (!res.ok) fieldErrors[q.id] = res.error
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      setSubmitting(false)
      submittingRef.current = false
      const firstId = Object.keys(fieldErrors)[0]
      document.getElementById(`q-${firstId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      toast.error('پاسخ برخی سؤال‌ها معتبر نیست — موارد مشخص‌شده را اصلاح کنید')
      return
    }

    try {
      const res = await fetch(`/api/public/forms/${publicId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptToken: attemptToken ?? undefined,
          answers,
          identity: form.settings.identityGate?.enabled ? identityRef.current : undefined,
          exam: examCredsRef.current ?? undefined,
          editResponseId: editId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'time_expired') {
          setPhase('expired')
          return
        }
        if (data.code === 'max_attempts' || data.code === 'already_participated') {
          setPhase('already')
          return
        }
        if (data.code === 'account_invalid' || data.fieldErrors?.__exam) {
          examCredsRef.current = null
          setStartError(data.error ?? 'نام کاربری یا رمز عبور نادرست است')
          setPhase('exam-login')
          return
        }
        if (data.code === 'identity_not_allowed' || data.code === 'identity_already_used' || data.fieldErrors?.__identity) {
          setIdentityError(data.error ?? data.fieldErrors?.__identity ?? 'ورود به آزمون ممکن نشد')
          setPhase('identity')
          return
        }
        if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
          setErrors(data.fieldErrors)
          toast.error(data.error ?? 'برخی پاسخ‌ها معتبر نیستند')
        } else {
          setPhase('error')
          setErrorText(data.error ?? 'ثبت پاسخ ناموفق بود')
        }
        return
      }
      setThankYou(data.thankYouMessage ?? form.settings.thankYouMessage)
      setResult(data.result ?? null)
      setReleaseAt(data.releaseAt ?? null)
      setSubmittedId(data.responseId ?? null)
      setLastAnswers(data.edited ? answers : { ...answers })
      setIsEditing(false)
      setPhase('submitted')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      toast.error('خطای شبکه؛ دوباره تلاش کنید')
    } finally {
      setSubmitting(false)
      submittingRef.current = false
    }
  }

  // auto-submit on timeout
  useEffect(() => {
    if (remaining === 0 && !submittingRef.current && phase === 'ready') {
      void doSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining])

  // ---------- exam login (creator-defined accounts) ----------
  if (phase === 'exam-login') {
    return (
      <div className="mx-auto w-full max-w-md animate-in fade-in slide-in-from-bottom-3 duration-300">
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Lock className="h-7 w-7" aria-hidden />
              </span>
              <h1 className="text-lg font-extrabold">ورود به آزمون</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                برای شرکت در آزمون «{form.title}»، نام کاربری و رمز عبوری که برگزارکننده به شما داده است را وارد کنید.
                هر اکانت فقط <span className="font-bold text-foreground">یک بار</span> می‌تواند در آزمون شرکت کند.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded-xl border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">تعداد سؤال</p>
                <p className="mt-1 font-extrabold">{faNumber(answerableList.length)}</p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">مدت آزمون</p>
                <p className="mt-1 font-extrabold">{timeLimit ? `${faNumber(timeLimit)} دقیقه` : 'بدون محدودیت'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam-user">نام کاربری</Label>
                <Input
                  id="exam-user"
                  value={examUser}
                  onChange={(e) => setExamUser(e.target.value)}
                  placeholder="مثلاً: student01"
                  dir="ltr"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam-pass">رمز عبور</Label>
                <Input
                  id="exam-pass"
                  type="password"
                  value={examPass}
                  onChange={(e) => setExamPass(e.target.value)}
                  placeholder="••••••"
                  dir="ltr"
                  autoComplete="off"
                  onKeyDown={(e) => { if (e.key === 'Enter') void loginExam() }}
                />
              </div>
              {startError && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{startError}</p>
              )}
              <Button className="h-12 w-full text-base" onClick={loginExam} disabled={loggingIn}>
                {loggingIn
                  ? <Loader2 className="ml-2 h-5 w-5 animate-spin" aria-hidden />
                  : <LogIn className="ml-2 h-5 w-5" aria-hidden />}
                ورود و شروع آزمون
              </Button>
              <ul className="space-y-2 rounded-xl border bg-muted/30 p-4 text-xs leading-6 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  ورود با اکانت روی سرور کنترل می‌شود؛ شرکت تکراری با همان اکانت روی هیچ دستگاهی ممکن نیست.
                </li>
                {timeLimit && (
                  <li className="flex items-start gap-2">
                    <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    با ورود، زمان‌سنج روی سرور آغاز می‌شود و با بستن صفحه متوقف نمی‌شود.
                  </li>
                )}
                {resultsEnabled && (
                  <li className="flex items-start gap-2">
                    <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    بعد از آزمون می‌توانید با همین اکانت نتیجهٔ خود را در صفحهٔ «مشاهده نتیجه» ببینید.
                  </li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------- legacy secure-exam identity gate (کد ملی) ----------
  if (phase === 'identity') {
    return (
      <div className="mx-auto w-full max-w-md animate-in fade-in slide-in-from-bottom-3 duration-300">
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="h-7 w-7" aria-hidden />
              </span>
              <h1 className="text-lg font-extrabold">ورود امن به آزمون</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                برای شروع آزمون «{form.title}» هویت خود را تأیید کنید.
              </p>
            </div>
            <div className="space-y-4">
              {gate?.requireFullName && (
                <div className="space-y-2">
                  <Label htmlFor="identity-name">نام و نام خانوادگی</Label>
                  <Input
                    id="identity-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثلاً: علی رضایی"
                    maxLength={120}
                    autoComplete="name"
                  />
                </div>
              )}
              {gate?.requireNationalId && (
                <div className="space-y-2">
                  <Label htmlFor="identity-nid">کد ملی</Label>
                  <Input
                    id="identity-nid"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="کد ملی ۱۰ رقمی"
                    inputMode="numeric"
                    maxLength={20}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    کد ملی باید در لیست مجاز آزمون ثبت شده باشد و سابقه شرکت با آن وجود نداشته باشد.
                  </p>
                </div>
              )}
              {identityError && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {identityError}
                </p>
              )}
              <Button className="h-11 w-full" onClick={confirmIdentity} disabled={checkingIdentity}>
                {checkingIdentity
                  ? <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden />
                  : <IdCard className="ml-2 h-4 w-4" aria-hidden />}
                تأیید و شروع آزمون
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------- login required ----------
  if (requiresLogin) {
    return (
      <CenteredCard icon={LogIn} title="ورود لازم است" text="سازنده این فرم پاسخ ناشناس را غیرفعال کرده است. برای پاسخ‌دادن ابتدا وارد حساب خود شوید.">
        <Button asChild>
          <Link href={`/login?next=${typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname) : '/'}`}>ورود به حساب</Link>
        </Button>
      </CenteredCard>
    )
  }

  // ---------- error states ----------
  if (phase === 'error') {
    return (
      <CenteredCard icon={Lock} title="امکان ثبت پاسخ نیست" text={errorText}>
        <Button variant="outline" onClick={() => window.location.reload()}>تلاش مجدد</Button>
      </CenteredCard>
    )
  }

  // ---------- exam already taken ----------
  if (phase === 'already') {
    return (
      <CenteredCard
        icon={UserCheck}
        title="شما قبلاً در این آزمون شرکت کرده‌اید"
        text="ثبت پاسخ تکراری مجاز نیست. در صورت نیاز به بررسی، با برگزارکنندهٔ آزمون تماس بگیرید."
      >
        {resultsEnabled && accountsEnabled && (
          <Button asChild variant="outline">
            <Link href={`/f/${publicId}/result`}>مشاهده نتیجه با اکانت</Link>
          </Button>
        )}
        <Button variant="ghost" asChild>
          <Link href="/">صفحه اصلی آرشام فرم</Link>
        </Button>
      </CenteredCard>
    )
  }

  // ---------- exam time over ----------
  if (phase === 'expired') {
    return (
      <CenteredCard
        icon={Hourglass}
        title="زمان آزمون به پایان رسیده است"
        text="زمان‌سنج این آزمون روی سرور است و با بستن صفحه متوقف نمی‌شود؛ پس از اتمام زمان، پاسخ جدیدی پذیرفته نمی‌شود."
      >
        {resultsEnabled && accountsEnabled && (
          <Button asChild variant="outline">
            <Link href={`/f/${publicId}/result`}>مشاهده نتیجه</Link>
          </Button>
        )}
        <Button variant="ghost" asChild>
          <Link href="/">صفحه اصلی آرشام فرم</Link>
        </Button>
      </CenteredCard>
    )
  }

  // ---------- submitted ----------
  if (phase === 'submitted') {
    const showResultCard = Boolean(result) && resultsEnabled
    return (
      <CenteredCard icon={CheckCircle2} title="پاسخ شما ثبت شد" text={thankYou}>
        <div className="w-full space-y-4">
          {showResultCard && result && (
            <div className={`rounded-xl border p-4 text-center ${result.passed === true ? 'border-green-600/40 bg-green-500/10' : result.passed === false ? 'border-destructive/40 bg-destructive/10' : 'bg-muted/50'}`}>
              <p className="text-sm text-muted-foreground">نمره شما</p>
              <p className="mt-1 text-3xl font-extrabold">
                {faNumber(result.totalScore, { maximumFractionDigits: 1 })}
                <span className="mr-1 text-base font-medium text-muted-foreground">از {faNumber(result.maxScore, { maximumFractionDigits: 1 })}</span>
              </p>
              {result.passed !== null && (
                <p className={`mt-1 text-sm font-bold ${result.passed ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
                  {result.passed ? 'قبول شدید ✓' : 'متأسفانه قبول نشدید'}
                </p>
              )}
            </div>
          )}
          {!showResultCard && resultsEnabled && (
            <div className="rounded-xl border bg-muted/40 p-4 text-center">
              <p className="text-sm font-medium">نتیجهٔ آزمون در زمان مقرر اعلام می‌شود</p>
              <p className="mt-1 text-xs text-muted-foreground">
                در صفحهٔ «مشاهده نتیجه» با اکانت خود وارد شوید تا کارنامه‌تان را ببینید.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href={`/f/${publicId}/result`}>مشاهده نتیجه</Link>
              </Button>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {form.settings.allowResponseEdit && submittedId && (
              <Button
                variant="outline"
                onClick={() => {
                  if (lastAnswers) setAnswers(lastAnswers)
                  setIsEditing(true)
                  setPhase('ready')
                  toast.info('می‌توانید پاسخ‌های خود را ویرایش و دوباره ارسال کنید')
                }}
              >
                <Pencil className="ml-2 h-4 w-4" aria-hidden /> ویرایش پاسخ
              </Button>
            )}
            <Button variant="ghost" asChild>
              <Link href="/">صفحه اصلی آرشام فرم</Link>
            </Button>
          </div>
          {isEditing && <p className="text-center text-xs text-muted-foreground">در حال ویرایش پاسخ قبلی — ارسال دوباره، پاسخ قبلی را به‌روزرسانی می‌کند.</p>}
        </div>
      </CenteredCard>
    )
  }

  // ---------- loading ----------
  if (phase === 'loading') {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    )
  }

  // ---------- start screen (timed quiz without accounts) ----------
  if (phase === 'start') {
    return (
      <div className="mx-auto w-full max-w-md animate-in fade-in slide-in-from-bottom-3 duration-300">
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardList className="h-7 w-7" aria-hidden />
              </span>
              <h1 className="text-lg font-extrabold">آمادهٔ شروع آزمون</h1>
              <p className="text-sm leading-6 text-muted-foreground">{form.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded-xl border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">تعداد سؤال</p>
                <p className="mt-1 font-extrabold">{faNumber(answerableList.length)}</p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">مدت آزمون</p>
                <p className="mt-1 font-extrabold">{faNumber(timeLimit ?? 0)} دقیقه</p>
              </div>
            </div>
            <ul className="space-y-2 rounded-xl border bg-muted/30 p-4 text-xs leading-6 text-muted-foreground">
              <li className="flex items-start gap-2">
                <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                با زدن «شروع آزمون»، زمان‌سنج روی سرور آغاز می‌شود و دیگر متوقف نمی‌شود.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                بستن یا رفرش‌کردن صفحه زمان را ریست نمی‌کند؛ زمان باقی‌مانده حفظ می‌شود.
              </li>
              <li className="flex items-start gap-2">
                <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                در پایان زمان، پاسخ‌های شما به‌طور خودکار ثبت می‌شوند؛ پس وقت را دست‌کم نگرفتید.
              </li>
              {form.settings.maxAttempts !== null && form.settings.maxAttempts > 0 && (
                <li className="flex items-start gap-2">
                  <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  فقط {faNumber(form.settings.maxAttempts)} بار اجازهٔ شرکت در این آزمون را دارید.
                </li>
              )}
            </ul>
            {startError && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{startError}</p>
            )}
            <Button className="h-12 w-full text-base" onClick={startExam} disabled={checkingIdentity || submitting}>
              {submitting || checkingIdentity
                ? <Loader2 className="ml-2 h-5 w-5 animate-spin" aria-hidden />
                : <Play className="ml-2 h-5 w-5" aria-hidden />}
              شروع آزمون
            </Button>
            <p className="text-center text-xs text-muted-foreground">زمان‌سنج از لحظهٔ شروع، حتی پس از بستن مرورگر، ادامه پیدا می‌کند.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------- ready (form or exam runner) ----------
  if (isQuiz) {
    return (
      <ExamRunner
        form={form}
        visibleList={visibleList}
        answerableList={answerableList}
        answers={answers}
        errors={errors}
        remaining={remaining}
        resumed={resumed}
        submitting={submitting}
        isEditing={isEditing}
        answeredCount={answeredCount}
        uploadUrl={uploadUrl}
        setAnswer={setAnswer}
        onSubmit={() => doSubmit(isEditing ? (submittedId ?? undefined) : undefined)}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold leading-8 md:text-2xl"><MathText text={form.title} /></h1>
              {form.description && <p className="mt-2 text-sm leading-6 text-muted-foreground"><MathText text={form.description} /></p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* progress */}
      {form.settings.showProgressBar && answerableList.length > 1 && (
        <div className="space-y-1.5">
          <Progress value={progress} aria-label="پیشرفت فرم" />
          <p className="text-xs text-muted-foreground">
            {faNumber(answeredCount)} از {faNumber(answerableList.length)} سؤال پاسخ داده شده
          </p>
        </div>
      )}

      {/* questions */}
      <div className="space-y-4">
        {visibleList.map((q) => (
          <div key={q.id} id={`q-${q.id}`}>
            <Card className={errors[q.id] ? 'border-destructive/60' : ''}>
              <CardContent className="p-5">
                <QuestionRenderer
                  question={q}
                  value={answers[q.id] ?? null}
                  error={errors[q.id]}
                  disabled={submitting}
                  number={answerableList.findIndex((x) => x.id === q.id) + 1}
                  choices={
                    form.settings.shuffleOptions && q.config.choices
                      ? shuffleMemo(q)
                      : undefined
                  }
                  uploadUrl={q.type === 'file' ? uploadUrl : undefined}
                  onChange={(v) => setAnswer(q.id, v)}
                />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <Button
        size="lg"
        className="h-12 w-full text-base"
        onClick={() => doSubmit(isEditing ? (submittedId ?? undefined) : undefined)}
        disabled={submitting}
      >
        {submitting ? <Loader2 className="ml-2 h-5 w-5 animate-spin" aria-hidden /> : <Send className="ml-2 h-5 w-5" aria-hidden />}
        {isEditing ? 'به‌روزرسانی پاسخ' : 'ثبت پاسخ'}
      </Button>
      <p className="pb-8 text-center text-xs text-muted-foreground">
        پاسخ‌های شما فقط برای سازنده فرم نمایش داده می‌شود.
      </p>
    </div>
  )
}

// ============================================================
// ExamRunner — the professional exam experience:
// sticky server-synced timer, one question at a time, numbered
// palette navigation and auto-submit when the server clock hits zero.
// ============================================================

function ExamRunner({
  form,
  visibleList,
  answerableList,
  answers,
  errors,
  remaining,
  resumed,
  submitting,
  isEditing,
  answeredCount,
  uploadUrl,
  setAnswer,
  onSubmit,
}: {
  form: PublicForm
  visibleList: Question[]
  answerableList: Question[]
  answers: Record<string, AnswerValue>
  errors: Record<string, string>
  remaining: number | null
  resumed: boolean
  submitting: boolean
  isEditing: boolean
  answeredCount: number
  uploadUrl: string
  setAnswer: (qid: string, v: AnswerValue) => void
  onSubmit: () => void
}) {
  const [current, setCurrent] = useState(0)
  const [paletteOpen, setPaletteOpen] = useState(true)
  const timeLimit = form.settings.timeLimitMinutes

  const idxOf = (id: string) => answerableList.findIndex((x) => x.id === id)
  const structural = visibleList.filter((q) => q.type === 'info' || q.type === 'separator')

  // keep the current index inside bounds when conditional logic reshapes the list
  useEffect(() => {
    if (current > answerableList.length - 1) setCurrent(Math.max(0, answerableList.length - 1))
  }, [answerableList.length, current])

  const q = answerableList[Math.min(current, Math.max(0, answerableList.length - 1))]
  const number = current + 1
  const isLast = current >= answerableList.length - 1
  const answeredIds = new Set(
    answerableList
      .filter((x) => {
        const v = answers[x.id]
        return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
      })
      .map((x) => x.id),
  )

  function go(delta: -1 | 1) {
    setCurrent((c) => Math.min(answerableList.length - 1, Math.max(0, c + delta)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function jump(i: number) {
    setCurrent(i)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-10">
      {/* header card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold leading-7 md:text-xl"><MathText text={form.title} /></h1>
              {form.description && <p className="mt-1.5 text-sm leading-6 text-muted-foreground"><MathText text={form.description} /></p>}
            </div>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              <ClipboardList className="h-4 w-4" aria-hidden />
              آزمون
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{faNumber(answerableList.length)} سؤال</span>
            <span>{faNumber(answeredCount)} پاسخ داده‌شده</span>
            {form.settings.maxAttempts ? <span>حداکثر {faNumber(form.settings.maxAttempts)} تلاش</span> : null}
          </div>
        </CardContent>
      </Card>

      {/* sticky server-synced timer */}
      {timeLimit && remaining !== null && (
        <Card className={`sticky top-2 z-20 ${remaining < 60 ? 'border-destructive/60' : ''}`}>
          <CardContent className="flex items-center justify-between gap-3 p-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Timer className="h-4 w-4" aria-hidden /> زمان باقی‌مانده
            </span>
            <span className={`font-mono text-xl font-extrabold tabular-nums ${remaining < 60 ? 'animate-pulse text-destructive' : 'text-foreground'}`} dir="ltr">
              {faDuration(remaining)}
            </span>
          </CardContent>
          <div className="h-1.5 w-full overflow-hidden rounded-b-xl bg-muted">
            <div
              className={`h-full transition-all ${remaining < 60 ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${Math.min(100, Math.max(0, (remaining / (timeLimit * 60)) * 100))}%` }}
            />
          </div>
          {resumed && remaining > 0 && (
            <p className="flex items-center gap-1.5 border-t bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
              <ShieldAlert className="h-3 w-3 shrink-0" aria-hidden />
              آزمون شما از قبل شروع شده است؛ زمان باقی‌مانده دقیقاً ادامهٔ همان جلسه است.
            </p>
          )}
        </Card>
      )}

      {/* palette */}
      {answerableList.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between text-sm font-bold"
              onClick={() => setPaletteOpen((o) => !o)}
              aria-expanded={paletteOpen}
            >
              <span className="flex items-center gap-1.5">
                <LayoutGrid className="h-4 w-4 text-primary" aria-hidden />
                جدول سؤال‌ها
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {paletteOpen ? 'بستن' : 'باز کردن'}
              </span>
            </button>
            {paletteOpen && (
              <div className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-10">
                {answerableList.map((x, i) => {
                  const answered = answeredIds.has(x.id)
                  const isCurrent = i === current
                  const hasError = Boolean(errors[x.id])
                  return (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => jump(i)}
                      aria-label={`رفتن به سؤال ${faNumber(i + 1)}`}
                      className={
                        'flex h-9 items-center justify-center rounded-lg border text-xs font-bold transition-colors ' +
                        (isCurrent
                          ? 'border-primary bg-primary text-primary-foreground'
                          : hasError
                            ? 'border-destructive/60 bg-destructive/10 text-destructive'
                            : answered
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted')
                      }
                    >
                      {faNumber(i + 1)}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-primary/10 ring-1 ring-primary/40" aria-hidden /> پاسخ داده‌شده</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-muted ring-1 ring-border" aria-hidden /> بدون پاسخ</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* structural blocks before the current question (info/separator) */}
      {structural.length > 0 && current === 0 && (
        <div className="space-y-3">
          {structural.map((sq) => (
            <Card key={sq.id}>
              <CardContent className="p-4">
                <QuestionRenderer question={sq} value={null} onChange={() => {}} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* current question */}
      {q ? (
        <Card id={`q-${q.id}`} className={errors[q.id] ? 'border-destructive/60' : ''}>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                سؤال {faNumber(number)} از {faNumber(answerableList.length)}
              </span>
              {q.scoring && form.settings.showResultsToRespondent !== undefined && (
                <span className="text-xs text-muted-foreground">{faNumber(q.scoring.points)} نمره</span>
              )}
            </div>
            <QuestionRenderer
              question={q}
              value={answers[q.id] ?? null}
              error={errors[q.id]}
              disabled={submitting}
              choices={
                form.settings.shuffleOptions && q.config.choices
                  ? shuffleMemo(q)
                  : undefined
              }
              uploadUrl={q.type === 'file' ? uploadUrl : undefined}
              onChange={(v) => setAnswer(q.id, v)}
            />
            {errors[q.id] && (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-destructive" role="alert">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                {errors[q.id]}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            سؤالی برای نمایش وجود ندارد.
          </CardContent>
        </Card>
      )}

      {/* navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" className="flex-1" onClick={() => go(-1)} disabled={current === 0 || submitting}>
          <ArrowRight className="ml-1 h-4 w-4" aria-hidden /> قبلی
        </Button>
        {!isLast ? (
          <Button className="flex-1" onClick={() => go(1)} disabled={submitting}>
            بعدی <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button size="lg" className="h-12 flex-1 text-base" onClick={onSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="ml-2 h-5 w-5 animate-spin" aria-hidden /> : <Send className="ml-2 h-5 w-5" aria-hidden />}
            {isEditing ? 'به‌روزرسانی پاسخ' : answeredCount < answerableList.length ? 'ثبت و پایان آزمون' : 'ثبت و پایان آزمون'}
          </Button>
        )}
      </div>

      {answeredCount < answerableList.length && !submitting && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          {faNumber(answerableList.length - answeredCount)} سؤال بی‌پاسخ دارید؛ می‌توانید همین حالا ثبت کنید یا از جدول سؤال‌ها به آن‌ها برگردید.
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        پاسخ‌ها فقط برای برگزارکنندهٔ آزمون نمایش داده می‌شود.
      </p>
    </div>
  )
}

// stable shuffle per question during the session
const shuffleCache = new Map<string, { id: string; label: string }[]>()
function shuffleMemo(q: Question) {
  const cached = shuffleCache.get(q.id)
  if (cached) return cached
  const shuffled = shuffle(q.config.choices ?? [])
  shuffleCache.set(q.id, shuffled)
  return shuffled
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
