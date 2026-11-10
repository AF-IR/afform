'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  CheckCircle2, ClipboardList, Loader2, Lock, LogIn, Pencil, Send, Timer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { QuestionRenderer } from '@/components/questions/renderer'
import { computeVisibleQuestions } from '@/lib/forms/conditional'
import { validateAnswer } from '@/lib/validation/schemas'
import { faDuration, faNumber } from '@/lib/persian'
import type { AnswerValue, FormSettings, FormType, Question } from '@/types'

interface PublicForm {
  id: string
  title: string
  description: string
  formType: FormType
  settings: FormSettings
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

type Phase = 'loading' | 'ready' | 'submitted' | 'error'

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
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [attemptToken, setAttemptToken] = useState<string | null>(null)
  const [deadline, setDeadline] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [thankYou, setThankYou] = useState(form.settings.thankYouMessage)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [lastAnswers, setLastAnswers] = useState<Record<string, AnswerValue> | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const submittingRef = useRef(false)

  const isQuiz = form.formType === 'quiz'
  const timeLimit = form.settings.timeLimitMinutes

  // shuffle (visual only — server validates everything)
  const questions = useMemo(() => {
    let qs = [...serverQuestions].sort((a, b) => a.position - b.position)
    if (form.settings.shuffleQuestions) qs = shuffle(qs)
    return qs
  }, [serverQuestions, form.settings.shuffleQuestions])

  // init: timed quiz → fetch attempt token from server clock
  useEffect(() => {
    let cancelled = false
    async function init() {
      if (isQuiz && timeLimit) {
        try {
          const res = await fetch(`/api/public/forms/${publicId}/start`, { method: 'POST' })
          const data = await res.json()
          if (!res.ok) {
            if (!cancelled) {
              setPhase('error')
              setErrorText(data.error ?? 'خطا در شروع آزمون')
            }
            return
          }
          if (!cancelled) {
            setAttemptToken(data.attemptToken)
            setDeadline(data.serverNow + timeLimit * 60 * 1000)
            setPhase('ready')
          }
        } catch {
          if (!cancelled) {
            setPhase('error')
            setErrorText('خطای شبکه در شروع آزمون')
          }
        }
      } else {
        if (!cancelled) setPhase('ready')
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

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

  const clockOffset = useRef(Date.now() - serverNow)

  // auto-submit on timeout
  useEffect(() => {
    if (remaining === 0 && !submittingRef.current && phase === 'ready') {
      void doSubmit()
    }
  }, [remaining])

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
          editResponseId: editId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
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

  // ---------- submitted ----------
  if (phase === 'submitted') {
    return (
      <CenteredCard icon={CheckCircle2} title="پاسخ شما ثبت شد" text={thankYou}>
        <div className="w-full space-y-4">
          {result && (
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

  // ---------- form ----------
  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold leading-8 md:text-2xl">{form.title}</h1>
              {form.description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{form.description}</p>}
            </div>
            {isQuiz && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                <ClipboardList className="h-4 w-4" aria-hidden />
                آزمون
              </span>
            )}
          </div>
          {isQuiz && (
            <p className="mt-3 text-xs text-muted-foreground">
              {faNumber(answerableList.length)} سؤال
              {timeLimit ? ` — مدت آزمون: ${faNumber(timeLimit)} دقیقه` : ''}
              {form.settings.maxAttempts ? ` — حداکثر ${faNumber(form.settings.maxAttempts)} تلاش` : ''}
            </p>
          )}
        </CardContent>
      </Card>

      {/* timer */}
      {isQuiz && timeLimit && remaining !== null && (
        <Card className={`sticky top-2 z-10 ${remaining < 60 ? 'border-destructive/50' : ''}`}>
          <CardContent className="flex items-center justify-between p-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Timer className="h-4 w-4" aria-hidden /> زمان باقی‌مانده
            </span>
            <span className={`font-mono text-xl font-extrabold tabular-nums ${remaining < 60 ? 'text-destructive' : 'text-foreground'}`} dir="ltr">
              {faDuration(remaining)}
            </span>
          </CardContent>
        </Card>
      )}

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
          {children && <div className="mt-2">{children}</div>}
        </CardContent>
      </Card>
    </div>
  )
}
