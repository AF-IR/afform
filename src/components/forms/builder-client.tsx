'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowRight, Check, CheckCircle2, CircleAlert, Copy, Eye, Loader2,
  Plus, Search, Send, CloudUpload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QuestionEditor, newChoiceId, newQuestionId } from '@/components/forms/question-editor'
import { QuestionRenderer } from '@/components/questions/renderer'
import { BuilderSettingsSheet } from '@/components/forms/builder-settings'
import { computeVisibleQuestions } from '@/lib/forms/conditional'
import {
  ALL_QUESTION_TYPES, DEFAULT_FORM_SETTINGS, QUESTION_TYPE_META,
  type AnswerValue, type FormSettings, type FormSummary, type Question, type QuestionType,
} from '@/types'
import { cn } from '@/lib/utils'
import { faNumber } from '@/lib/persian'

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

const GROUPS: { key: 'text' | 'choice' | 'rating' | 'advanced'; label: string }[] = [
  { key: 'text', label: 'سؤال‌های متنی' },
  { key: 'choice', label: 'سؤال‌های انتخابی' },
  { key: 'rating', label: 'عددی و امتیازی' },
  { key: 'advanced', label: 'پیشرفته' },
]

function defaultQuestion(type: QuestionType): Question {
  const meta = QUESTION_TYPE_META[type]
  const q: Question = {
    id: newQuestionId(),
    type,
    title: '',
    description: '',
    required: false,
    position: 0,
    config: {},
    scoring: null,
    conditionalRules: null,
    conditionalMode: 'any',
  }
  if (['single_choice', 'multi_choice', 'dropdown', 'multi_choice_comment'].includes(type)) {
    q.config = {
      choices: [
        { id: newChoiceId(), label: 'گزینه ۱' },
        { id: newChoiceId(), label: 'گزینه ۲' },
      ],
    }
  }
  if (type === 'multi_choice_comment') q.config.choices?.push({ id: newChoiceId(), label: 'گزینه ۳' })
  if (type === 'rating_number') q.config = { min: 0, max: 100, unit: 'امتیاز' }
  if (type === 'number') q.config = { integer: true }
  if (type === 'file') q.config = { maxSizeMB: 4 }
  if (type === 'matrix') q.config = { rows: ['گزاره اول', 'گزاره دوم'], cols: ['خیلی کم', 'متوسط', 'خیلی زیاد'] }
  if (type === 'info') q.title = 'عنوان بخش توضیحی'
  if (type === 'separator') q.title = 'بخش جدید'
  if (!meta.answerable && type !== 'info' && type !== 'separator') q.required = false
  return q
}

export function BuilderClient({
  form,
  initialQuestions,
}: {
  form: FormSummary
  initialQuestions: Question[]
}) {
  const [title, setTitle] = useState(form.title)
  const [description, setDescription] = useState(form.description)
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [settings, setSettings] = useState<FormSettings>({ ...DEFAULT_FORM_SETTINGS, ...form.settings })
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [publishing, setPublishing] = useState(false)
  const firstRun = useRef(true)
  const dirtyRef = useRef(false)
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---------- save ----------
  const save = useCallback(async () => {
    dirtyRef.current = false // edits made during save will re-mark automatically
    setSaveState('saving')
    try {
      const metaRes = await fetch(`/api/forms/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || 'بدون عنوان', description, formType: form.formType, settings }),
      })
      if (!metaRes.ok) {
        const d = await metaRes.json().catch(() => ({}))
        throw new Error(d.error ?? 'ذخیره مشخصات ناموفق بود')
      }
      const qRes = await fetch(`/api/forms/${form.id}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questions.map((q, i) => ({ ...q, position: i })),
        }),
      })
      if (!qRes.ok) {
        const d = await qRes.json().catch(() => ({}))
        throw new Error(d.error ?? 'ذخیره سؤال‌ها ناموفق بود')
      }
      setSaveState(dirtyRef.current ? 'dirty' : 'saved')
      return true
    } catch (e) {
      setSaveState('error')
      toast.error(e instanceof Error ? e.message : 'ذخیره‌سازی ناموفق بود — داده‌ها حفظ شده‌اند')
      return false
    }
  }, [form.id, form.formType, title, description, questions, settings])

  // mark dirty on any change
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    dirtyRef.current = true
    setSaveState((s) => (s === 'saving' ? s : 'dirty'))
  }, [title, description, questions, settings])

  // auto-save — persist changes automatically after a short debounce
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    if (saveState !== 'dirty') return
    autoTimer.current = setTimeout(() => {
      void saveRef.current()
    }, 2200)
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current)
    }
  }, [saveState, title, description, questions])

  // warn on unload with unsaved changes
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (saveState === 'dirty' || saveState === 'error') {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [saveState])

  // ---------- question ops ----------
  function addQuestion(type: QuestionType) {
    setQuestions((qs) => [...qs, { ...defaultQuestion(type), position: qs.length }])
  }

  function updateQuestion(idx: number, q: Question) {
    setQuestions((qs) => qs.map((x, i) => (i === idx ? q : x)))
  }

  function removeQuestion(idx: number) {
    if (!window.confirm('این سؤال حذف شود؟ پاسخ‌های ثبت‌شده برای این سؤال نیز حذف می‌شوند.')) return
    setQuestions((qs) => qs.filter((_, i) => i !== idx))
  }

  function duplicateQuestion(idx: number) {
    setQuestions((qs) => {
      const src = qs[idx]
      const copy: Question = {
        ...structuredClone(src),
        id: newQuestionId(),
      }
      if (copy.config.choices) copy.config.choices = copy.config.choices.map((c) => ({ ...c, id: newChoiceId() }))
      if (copy.scoring?.correctChoices) {
        // remap scoring to the new choice ids, keeping order
        const oldChoices = src.config.choices ?? []
        const map = new Map(oldChoices.map((c, i) => [c.id, copy.config.choices?.[i]?.id ?? c.id]))
        copy.scoring = {
          ...copy.scoring,
          correctChoices: copy.scoring.correctChoices?.map((id) => map.get(id) ?? id),
        }
      }
      copy.conditionalRules = null // rules of the copy are reset to stay valid
      const next = [...qs]
      next.splice(idx + 1, 0, copy)
      return next.map((q, i) => ({ ...q, position: i }))
    })
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    setQuestions((qs) => {
      const next = [...qs]
      const j = idx + dir
      if (j < 0 || j >= next.length) return qs
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })
  }

  // ---------- publish ----------
  async function togglePublish() {
    if (saveState !== 'saved') {
      const ok = await save()
      if (!ok) return
    }
    if (questions.filter((q) => QUESTION_TYPE_META[q.type].answerable).length === 0) {
      toast.error('برای انتشار، حداقل یک سؤال پاسخ‌پذیر لازم است')
      return
    }
    setPublishing(true)
    try {
      const nextStatus = form.status === 'published' ? 'closed' : 'published'
      const res = await fetch(`/api/forms/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, settings }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'تغییر وضعیت انتشار ناموفق بود')
        return
      }
      toast.success(nextStatus === 'published' ? 'فرم منتشر شد' : 'فرم از دسترس خارج شد')
      window.location.href = `/dashboard/forms/${form.id}/edit`
    } finally {
      setPublishing(false)
    }
  }

  const filteredTypes = useMemo(() => {
    const s = search.trim()
    return ALL_QUESTION_TYPES.filter((t) => !s || QUESTION_TYPE_META[t].label.includes(s))
  }, [search])

  const saveLabel: Record<SaveState, { text: string; cls: string; icon: React.ReactNode }> = {
    saved: { text: 'ذخیره شد', cls: 'text-green-600', icon: <CheckCircle2 className="h-4 w-4" aria-hidden /> },
    dirty: { text: 'ذخیره خودکار در راه است…', cls: 'text-amber-600', icon: <CloudUpload className="h-4 w-4" aria-hidden /> },
    saving: { text: 'در حال ذخیره…', cls: 'text-muted-foreground', icon: <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> },
    error: { text: 'خطا در ذخیره — برای تلاش مجدد کلیک کنید', cls: 'text-destructive', icon: <CircleAlert className="h-4 w-4" aria-hidden /> },
  }

  const publicLink = typeof window !== 'undefined' ? `${window.location.origin}/f/${form.publicId}` : `/f/${form.publicId}`

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto max-w-7xl space-y-4">
        {/* top bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="بازگشت">
            <Link href="/dashboard/forms"><ArrowRight className="h-5 w-5" /></Link>
          </Button>
          <div className="min-w-0 flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 border-0 bg-transparent px-0 text-lg font-extrabold shadow-none focus-visible:ring-0"
              placeholder="عنوان فرم"
              maxLength={300}
              aria-label="عنوان فرم"
            />
            <div className="flex items-center gap-3 text-xs">
              <span className={cn('flex items-center gap-1', saveLabel[saveState].cls)}>
                {saveLabel[saveState].icon}
                {saveLabel[saveState].text}
              </span>
              <span className="text-muted-foreground">{faNumber(questions.length)} سؤال</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              تنظیمات و انتشار
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={questions.length === 0}>
              <Eye className="ml-1 h-4 w-4" aria-hidden />
              پیش‌نمایش
            </Button>
            <Button size="sm" onClick={() => save()} disabled={saveState === 'saving'}>
              {saveState === 'saving' ? <Loader2 className="ml-1 h-4 w-4 animate-spin" aria-hidden /> : <CloudUpload className="ml-1 h-4 w-4" aria-hidden />}
              ذخیره
            </Button>
            <Button size="sm" variant={form.status === 'published' ? 'destructive' : 'default'} onClick={togglePublish} disabled={publishing}>
              {publishing ? <Loader2 className="ml-1 h-4 w-4 animate-spin" aria-hidden />
                : form.status === 'published' ? <Send className="ml-1 h-4 w-4" aria-hidden />
                : <Check className="ml-1 h-4 w-4" aria-hidden />}
              {form.status === 'published' ? 'بستن فرم' : 'انتشار فرم'}
            </Button>
          </div>
        </div>

        {form.status === 'published' && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-green-600/30 bg-green-500/10 p-3 text-sm">
            <Badge className="bg-green-600">منتشرشده</Badge>
            <span className="text-muted-foreground">لینک عمومی:</span>
            <code className="rounded bg-muted px-2 py-0.5 text-xs" dir="ltr">/f/{form.publicId}</code>
            <Button
              size="sm" variant="ghost" className="h-7 text-xs"
              onClick={() => navigator.clipboard.writeText(publicLink).then(() => toast.success('لینک کپی شد'))}
            >
              <Copy className="ml-1 h-3 w-3" aria-hidden /> کپی لینک
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link href={`/f/${form.publicId}`} target="_blank">باز کردن فرم عمومی</Link>
            </Button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[290px_1fr]">
          {/* palette */}
          <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جست‌وجوی نوع سؤال…" className="pr-9" />
            </div>
            {GROUPS.map((g) => {
              const items = filteredTypes.filter((t) => QUESTION_TYPE_META[t].group === g.key)
              if (!items.length) return null
              return (
                <div key={g.key} className="rounded-xl border bg-card p-3">
                  <p className="mb-2 text-xs font-bold text-muted-foreground">{g.label}</p>
                  <div className="grid gap-1.5">
                    {items.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => addQuestion(t)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-right text-sm font-medium transition-colors hover:bg-accent"
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                        {QUESTION_TYPE_META[t].label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </aside>

          {/* questions list */}
          <div className="space-y-4">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="توضیحات فرم (برای پاسخ‌دهندگان نمایش داده می‌شود)"
              aria-label="توضیحات فرم"
            />
            {questions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
                <Plus className="h-10 w-10 text-muted-foreground/40" aria-hidden />
                <p className="font-semibold">اولین سؤال را از پلت سمت راست اضافه کنید</p>
                <p className="text-sm text-muted-foreground">هر نوع سؤال، تنظیمات مخصوص خودش را دارد.</p>
              </div>
            ) : (
              questions.map((q, i) => (
                <QuestionEditor
                  key={q.id}
                  question={q}
                  index={i}
                  total={questions.length}
                  allQuestions={questions}
                  formType={form.formType}
                  onChange={(nq) => updateQuestion(i, nq)}
                  onMoveUp={() => moveQuestion(i, -1)}
                  onMoveDown={() => moveQuestion(i, 1)}
                  onDuplicate={() => duplicateQuestion(i)}
                  onRemove={() => removeQuestion(i)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* preview */}
      <BuilderPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={title}
        description={description}
        questions={questions}
        settings={settings}
        formType={form.formType}
      />

      {/* settings sheet */}
      <BuilderSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        form={form}
        settings={settings}
        onSettingsChange={setSettings}
        onSave={save}
      />
    </TooltipProvider>
  )
}

// ---------- preview with conditional logic ----------

export function BuilderPreview({
  open, onOpenChange, title, description, questions, settings, formType,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: string
  questions: Question[]
  settings: FormSettings
  formType: 'form' | 'survey' | 'quiz'
}) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})

  const handlePreviewOpenChange = (o: boolean) => {
    if (o) setAnswers({}) // fresh answers on each preview open
    onOpenChange(o)
  }

  const visible = useMemo(() => computeVisibleQuestions(questions, answers), [questions, answers])
  const visibleList = questions.filter((q) => visible.has(q.id))
  const answeredCount = visibleList.filter((q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '').length
  const progress = visibleList.length ? Math.round((answeredCount / visibleList.length) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={handlePreviewOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle>پیش‌نمایش {formType === 'quiz' ? 'آزمون' : 'فرم'}</DialogTitle>
          <DialogDescription>
            منطق شرطی، اعتبارسنجی و نمایش سؤال‌ها دقیقاً مانند فرم عمومی عمل می‌کند؛ پاسخ‌ها ذخیره نمی‌شوند.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="custom-scroll max-h-[calc(90vh-8rem)]">
          <div className="space-y-5 p-5">
            <div>
              <h2 className="text-xl font-extrabold">{title || 'فرم بدون عنوان'}</h2>
              {description && <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p>}
            </div>
            {settings.showProgressBar && visibleList.length > 1 && (
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{faNumber(progress)}٪ تکمیل‌شده</p>
              </div>
            )}
            {visibleList.map((q) => (
              <div key={q.id} className="rounded-xl border p-4">
                <QuestionRenderer
                  question={q}
                  value={answers[q.id] ?? null}
                  onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                />
              </div>
            ))}
            <div className="rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              این یک پیش‌نمایش است — دکمه ارسال در فرم عمومی فعال می‌شود.
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
