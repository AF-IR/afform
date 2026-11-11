'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ClipboardList, FileText, Loader2, Megaphone, ScrollText, Sparkles, Users, Wand2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { templates } from '@/lib/templates/data'
import { Badge } from '@/components/ui/badge'
import { faNumber } from '@/lib/persian'

const TYPES = [
  { value: 'form', label: 'فرم', desc: 'جمع‌آوری اطلاعات، ثبت‌نام و درخواست', icon: FileText },
  { value: 'survey', label: 'پرسشنامه / نظرسنجی', desc: 'سنجش نظر با امتیازدهی و مقیاس', icon: ClipboardList },
  { value: 'quiz', label: 'آزمون', desc: 'با پاسخ صحیح، امتیاز و نمره خودکار', icon: ScrollText },
] as const

const AI_STATUS_STEPS = [
  'در حال بررسی موضوع…',
  'طراحی ساختار پرسش‌نامه…',
  'نوشتن سؤال‌ها…',
  'نهایی‌سازی و ایجاد فرم…',
]

export function NewFormClient() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formType, setFormType] = useState<'form' | 'survey' | 'quiz'>('form')
  const [creating, setCreating] = useState(false)
  // AI generation state
  const [aiTopic, setAiTopic] = useState('')
  const [aiAudience, setAiAudience] = useState('')
  const [aiType, setAiType] = useState<'form' | 'survey' | 'quiz'>('survey')
  const [aiCount, setAiCount] = useState(8)
  const [generating, setGenerating] = useState(false)
  const [aiStep, setAiStep] = useState(0)
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null)

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

  async function create(payload: Record<string, unknown>) {
    setCreating(true)
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'ایجاد فرم ناموفق بود')
        return
      }
      toast.success('فرم ساخته شد — اکنون سؤال‌ها را اضافه کنید')
      router.push(`/dashboard/forms/${data.form.id}/edit`)
    } catch {
      toast.error('خطای شبکه')
    } finally {
      setCreating(false)
    }
  }

  async function applyTemplate(templateId: string) {
    setCreating(true)
    try {
      const res = await fetch('/api/templates/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'ایجاد از قالب ناموفق بود')
        return
      }
      toast.success('نسخه مستقل از قالب ساخته شد')
      router.push(`/dashboard/forms/${data.form.id}/edit`)
    } finally {
      setCreating(false)
    }
  }

  async function generateWithAi() {
    if (aiTopic.trim().length < 5) {
      toast.error('موضوع را با حداقل ۵ نویسه توضیح دهید')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic.trim(), formType: aiType, count: aiCount, audience: aiAudience.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'ساخت با هوش مصنوعی ناموفق بود')
        return
      }
      toast.success(`پرسش‌نامه با ${faNumber(data.questionsCount)} سؤال ساخته شد — اکنون می‌توانید ویرایشش کنید`)
      router.push(`/dashboard/forms/${data.form.id}/edit`)
    } catch {
      toast.error('خطای شبکه؛ دوباره تلاش کنید')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">ایجاد فرم جدید</h1>
        <p className="mt-1 text-sm text-muted-foreground">با هوش مصنوعی بسازید، از قالب شروع کنید یا از صفر طراحی کنید</p>
      </div>

      {/* AI generation */}
      <Card className="border-primary/40 bg-gradient-to-l from-primary/5 via-transparent to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            ساخت پرسش‌نامه با هوش مصنوعی
          </CardTitle>
          <CardDescription>
            فقط موضوع را بنویسید؛ سؤال‌ها، گزینه‌ها و (در آزمون‌ها) پاسخ صحیح و امتیاز هر سؤال به‌صورت خودکار طراحی می‌شود. بعداً هر بخش را می‌توانید ویرایش کنید.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="ai-topic">موضوع پرسش‌نامه *</Label>
            <Textarea
              id="ai-topic"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="مثلاً: سنجش رضایت مشتریان از خدمات پشتیبانی شرکت در ۶ ماه گذشته"
              rows={2}
              maxLength={1000}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ai-audience">مخاطب هدف (اختیاری)</Label>
              <Input
                id="ai-audience"
                value={aiAudience}
                onChange={(e) => setAiAudience(e.target.value)}
                placeholder="مثلاً: دانشجویان ترم اول"
                maxLength={300}
              />
            </div>
            <div className="space-y-2">
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
          </div>
          <div className="space-y-2">
            <Label>نوع</Label>
            <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="نوع پرسش‌نامه هوش مصنوعی">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={aiType === t.value}
                  onClick={() => setAiType(t.value)}
                  className={`rounded-xl border p-3 text-right transition-all ${aiType === t.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                >
                  <t.icon className={`mb-1.5 h-4 w-4 ${aiType === t.value ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden />
                  <p className="text-sm font-bold">{t.label}</p>
                </button>
              ))}
            </div>
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
            {generating ? 'در حال ساخت…' : 'تولید پرسش‌نامه با هوش مصنوعی'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فرم خالی</CardTitle>
          <CardDescription>عنوان و نوع فرم را تعیین کنید؛ بقیه در سازنده فرم</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">عنوان فرم *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: نظرسنجی پایان ترم" maxLength={300} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">توضیحات (اختیاری)</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیح کوتاه برای پاسخ‌دهندگان" rows={3} maxLength={5000} />
          </div>
          <div className="space-y-2">
            <Label>نوع فرم</Label>
            <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="نوع فرم">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={formType === t.value}
                  onClick={() => setFormType(t.value)}
                  className={`rounded-xl border p-4 text-right transition-colors ${formType === t.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                >
                  <t.icon className={`mb-2 h-5 w-5 ${formType === t.value ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden />
                  <p className="text-sm font-bold">{t.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => create({ title: title.trim(), description, formType })} disabled={creating || !title.trim()} className="w-full sm:w-auto">
            {creating && <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden />}
            ساخت فرم و افزودن سؤال‌ها
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-extrabold">یا از قالب‌های آماده شروع کنید</h2>
        <p className="mt-1 text-sm text-muted-foreground">هر قالب یک نسخه مستقل و کاملاً قابل ویرایش می‌سازد</p>
        <div className="fade-up-stagger mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <Badge variant="secondary" className="w-fit">{t.category}</Badge>
                <CardTitle className="mt-1.5 text-sm">{t.title}</CardTitle>
                <CardDescription className="text-xs leading-5">{t.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-2">
                <Button size="sm" variant="outline" className="w-full" onClick={() => applyTemplate(t.id)} disabled={creating}>
                  استفاده از قالب ({t.questions.length} سؤال)
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Users className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        راهنما: پس از ساخت، فرم را با سؤال‌های دلخواه کامل کنید، پیش‌نمایش بگیرید و سپس از بخش تنظیمات، آن را منتشر کنید.
      </div>
    </div>
  )
}
