'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Clock, GraduationCap, Loader2, ShieldCheck, Sparkles, UserCheck, Wand2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { faNumber } from '@/lib/persian'

const AI_STATUS_STEPS = [
  'در حال بررسی موضوع…',
  'طراحی ساختار آزمون…',
  'نوشتن سؤال‌ها و گزینه‌ها…',
  'تعیین پاسخ صحیح و بارم‌بندی…',
  'نهایی‌سازی و ایجاد آزمون…',
]

interface AiQuota {
  plan: 'free' | 'pro'
  generate: { used: number; limit: number | null }
  analyze: { used: number; limit: number | null }
}

export function NewExamClient() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  // AI generation (quiz-only)
  const [aiTopic, setAiTopic] = useState('')
  const [aiCount, setAiCount] = useState(10)
  const [generating, setGenerating] = useState(false)
  const [aiStep, setAiStep] = useState(0)
  const [quota, setQuota] = useState<AiQuota | null>(null)
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/ai/usage')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ok && setQuota(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (generating) {
      setAiStep(0)
      stepTimer.current = setInterval(() => {
        setAiStep((s) => Math.min(AI_STATUS_STEPS.length - 1, s + 1))
      }, 3500)
    } else if (stepTimer.current) {
      clearInterval(stepTimer.current)
      stepTimer.current = null
    }
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current)
    }
  }, [generating])

  function goToExam(id: string) {
    router.push(`/dashboard/exams/${id}`)
  }

  async function createEmpty() {
    if (!title.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description, formType: 'quiz' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'ایجاد آزمون ناموفق بود')
        return
      }
      toast.success('آزمون ساخته شد — اکنون سؤال‌ها و اکانت‌ها را تنظیم کنید')
      goToExam(data.form.id)
    } catch {
      toast.error('خطای شبکه')
    } finally {
      setCreating(false)
    }
  }

  async function generateWithAi() {
    if (aiTopic.trim().length < 5) {
      toast.error('موضوع آزمون را با حداقل ۵ نویسه توضیح دهید')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic.trim(), formType: 'quiz', count: aiCount }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'ساخت آزمون با هوش مصنوعی ناموفق بود')
        return
      }
      toast.success(`آزمون با ${faNumber(data.questionsCount)} سؤال و بارم‌بندی ساخته شد`)
      if (data.quota) setQuota(data.quota)
      goToExam(data.form.id)
    } catch {
      toast.error('خطای شبکه؛ دوباره تلاش کنید')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <GraduationCap className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold">ایجاد آزمون جدید</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            آزمون امن با اکانت اختصاصی شرکت‌کنندگان، زمان‌بندی سرور، نمره‌دهی خودکار و کنترل زمان ارائه نتیجه
          </p>
        </div>
      </div>

      {/* AI exam generation */}
      <Card className="border-primary/40 bg-gradient-to-l from-primary/5 via-transparent to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            ساخت سؤالات آزمون با هوش مصنوعی
          </CardTitle>
          <CardDescription>
            فقط موضوع آزمون را بنویسید؛ سؤال‌ها، گزینه‌ها، پاسخ صحیح و بارم‌بندی به‌صورت خودکار طراحی می‌شود و بعداً قابل ویرایش است.
          </CardDescription>
          {quota && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
              <Wand2 className="h-3.5 w-3.5 text-primary" aria-hidden />
              {quota.plan === 'pro' || quota.generate.limit === null ? (
                <span className="font-medium text-primary">پلن حرفه‌ای — ساخت روزانه نامحدود</span>
              ) : (
                <span>
                  سهمیه امروز: {faNumber(quota.generate.limit - quota.generate.used)} از {faNumber(quota.generate.limit)} ساخت باقی‌مانده
                </span>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="ai-topic">موضوع و درس آزمون *</Label>
            <Textarea
              id="ai-topic"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="مثلاً: آزمون فصل ۳ ریاضی پایه نهم — معادله خط و شیب"
              rows={2}
              maxLength={1000}
            />
          </div>
          <div className="space-y-2 w-full sm:max-w-[220px]">
            <Label htmlFor="ai-count">تعداد سؤال‌ها</Label>
            <select
              id="ai-count"
              value={aiCount}
              onChange={(e) => setAiCount(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {[5, 8, 10, 12, 15, 20].map((n) => (
                <option key={n} value={n}>{faNumber(n)} سؤال</option>
              ))}
            </select>
          </div>

          {generating && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3 text-sm" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
              <span key={aiStep} className="animate-in fade-in slide-in-from-left-2 duration-300">
                {AI_STATUS_STEPS[aiStep]} (معمولاً ۱۰ تا ۳۰ ثانیه طول می‌کشد)
              </span>
            </div>
          )}

          <Button onClick={generateWithAi} disabled={generating || aiTopic.trim().length < 5} className="w-full sm:w-auto">
            {generating ? <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden /> : <Wand2 className="ml-2 h-4 w-4" aria-hidden />}
            {generating ? 'در حال ساخت آزمون…' : 'تولید آزمون با هوش مصنوعی'}
          </Button>
        </CardContent>
      </Card>

      {/* empty exam */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">آزمون خالی (طراحی دستی)</CardTitle>
          <CardDescription>عنوان آزمون را تعیین کنید؛ سؤال‌ها، اکانت‌ها و زمان‌بندی در مراحل بعد</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">عنوان آزمون *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: آزمون میان‌ترم فیزیک — پایه دهم" maxLength={300} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">توضیحات برای شرکت‌کنندگان (اختیاری)</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثلاً: مواد امتحانی فصل ۱ تا ۴ — مدت پاسخ‌گویی ۴۵ دقیقه" rows={3} maxLength={5000} />
          </div>
          <Button onClick={createEmpty} disabled={creating || !title.trim()} className="w-full sm:w-auto">
            {creating && <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden />}
            ساخت آزمون و رفتن به کنترل آزمون
          </Button>
        </CardContent>
      </Card>

      {/* what you get */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">امکانات امنیتی آزمون (سمت سرور)</CardTitle>
          <CardDescription>این کنترل‌ها پس از ایجاد آزمون در کنترل آزمون و تنظیمات در دسترس‌اند</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm leading-6 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <UserCheck className="mb-1.5 h-4 w-4 text-primary" aria-hidden />
            <p className="font-semibold">اکانت اختصاصی</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ورود با نام کاربری و رمزی که سازنده تعریف می‌کند؛ مشاهده نتیجه هم با همان اکانت.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <Clock className="mb-1.5 h-4 w-4 text-primary" aria-hidden />
            <p className="font-semibold">زمان سمت سرور</p>
            <p className="mt-1 text-xs text-muted-foreground">
              تایمر با ساعت سرور تنظیم می‌شود؛ پس از اتمام زمان، ارسال پاسخ پذیرفته نمی‌شود.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <ShieldCheck className="mb-1.5 h-4 w-4 text-primary" aria-hidden />
            <p className="font-semibold">یک‌بار شرکت</p>
            <p className="mt-1 text-xs text-muted-foreground">
              هر اکانت فقط یک‌بار وارد آزمون می‌شود؛ ورود مجدد حتی با دستگاه دیگر مسدود است.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
