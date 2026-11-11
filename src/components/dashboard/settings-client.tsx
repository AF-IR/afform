'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Send, Lock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import type { FormSettings, FormStatus, FormSummary } from '@/types'
import { STATUS_LABEL } from '@/types'

export function SettingsClient({ form }: { form: FormSummary }) {
  const router = useRouter()
  const [settings, setSettings] = useState<FormSettings>(form.settings)
  const [saving, setSaving] = useState(false)
  const isQuiz = form.formType === 'quiz'

  function patch(p: Partial<FormSettings>) {
    setSettings((s) => ({ ...s, ...p }))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/forms/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error ?? 'ذخیره تنظیمات ناموفق بود')
      toast.success('تنظیمات ذخیره شد')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(status: FormStatus) {
    const res = await fetch(`/api/forms/${form.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, settings }),
    })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error ?? 'تغییر وضعیت ناموفق بود')
    toast.success(status === 'published' ? 'فرم منتشر شد' : status === 'closed' ? 'فرم بسته شد' : 'فرم به پیش‌نویس برگشت')
    router.refresh()
  }

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/f/${form.publicId}` : `/f/${form.publicId}`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">تنظیمات انتشار</h1>
        <p className="mt-1 text-sm text-muted-foreground">هر تنظیم در رفتار واقعی فرم اعمال و سمت سرور کنترل می‌شود</p>
      </div>

      {/* status & link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">وضعیت انتشار</CardTitle>
          <CardDescription>
            وضعیت فعلی: <Badge variant={form.status === 'published' ? 'default' : form.status === 'closed' ? 'destructive' : 'secondary'}>{STATUS_LABEL[form.status]}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.status !== 'draft' && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">لینک عمومی:</span>
              <code className="rounded bg-background px-2 py-0.5 text-xs" dir="ltr">/f/{form.publicId}</code>
              <Button
                size="sm" variant="ghost" className="h-7 text-xs"
                onClick={() => navigator.clipboard.writeText(publicUrl).then(() => toast.success('لینک کپی شد'), () => toast.error('کپی ناموفق بود'))}
              >
                کپی لینک کامل
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {form.status !== 'published' && (
              <Button onClick={() => setStatus('published')} disabled={saving}>
                <Send className="ml-2 h-4 w-4" aria-hidden /> انتشار فرم
              </Button>
            )}
            {form.status === 'published' && (
              <Button variant="destructive" onClick={() => setStatus('closed')} disabled={saving}>
                <Lock className="ml-2 h-4 w-4" aria-hidden /> بستن فرم
              </Button>
            )}
            {form.status === 'closed' && (
              <Button variant="outline" onClick={() => setStatus('draft')} disabled={saving}>
                بازگشت به پیش‌نویس
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            فرم‌های پیش‌نویس هرگز از طریق لینک عمومی در دسترس نیستند؛ فرم بسته‌شده هم پاسخ جدید نمی‌پذیرد.
          </p>
        </CardContent>
      </Card>

      {/* message & timing */}
      <Card>
        <CardHeader><CardTitle className="text-base">پیام و زمان‌بندی</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>پیام پس از ارسال</Label>
            <Textarea rows={3} value={settings.thankYouMessage} onChange={(e) => patch({ thankYouMessage: e.target.value })} maxLength={2000} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>تاریخ و ساعت شروع (اختیاری)</Label>
              <Input type="datetime-local" dir="ltr" value={settings.startAt ? toLocalInput(settings.startAt) : ''} onChange={(e) => patch({ startAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>
            <div className="space-y-2">
              <Label>تاریخ و ساعت پایان (اختیاری)</Label>
              <Input type="datetime-local" dir="ltr" value={settings.endAt ? toLocalInput(settings.endAt) : ''} onChange={(e) => patch({ endAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* limits */}
      <Card>
        <CardHeader><CardTitle className="text-base">محدودیت‌ها</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>سقف تعداد پاسخ (اختیاری)</Label>
            <Input type="number" dir="ltr" min={1} value={settings.responseLimit ?? ''} onChange={(e) => patch({ responseLimit: e.target.value === '' ? null : Number(e.target.value) })} />
          </div>
          {isQuiz && (
            <>
              <div className="space-y-2">
                <Label>مدت آزمون (دقیقه)</Label>
                <Input type="number" dir="ltr" min={1} value={settings.timeLimitMinutes ?? ''} onChange={(e) => patch({ timeLimitMinutes: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>حداکثر تلاش هر نفر</Label>
                <Input type="number" dir="ltr" min={1} value={settings.maxAttempts ?? ''} onChange={(e) => patch({ maxAttempts: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>نمره قبولی (٪)</Label>
                <Input type="number" dir="ltr" min={0} max={100} value={settings.passingScorePercent ?? ''} onChange={(e) => patch({ passingScorePercent: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* behavior */}
      <Card>
        <CardHeader><CardTitle className="text-base">نمایش و رفتار</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Row label="نمایش نوار پیشرفت" checked={settings.showProgressBar} onChange={(v) => patch({ showProgressBar: v })} />
          <Row label="ترتیب تصادفی سؤال‌ها" checked={settings.shuffleQuestions} onChange={(v) => patch({ shuffleQuestions: v })} />
          <Row label="ترتیب تصادفی گزینه‌ها" checked={settings.shuffleOptions} onChange={(v) => patch({ shuffleOptions: v })} />
          <Row label="اجازه پاسخ ناشناس" desc="در صورت غیرفعال‌شدن، فقط کاربران واردشده می‌توانند پاسخ دهند" checked={settings.allowAnonymous} onChange={(v) => patch({ allowAnonymous: v })} />
          <Row label="اجازه ویرایش پاسخ پس از ارسال" desc="همان مرورگر می‌تواند پاسخ خود را ویرایش کند" checked={settings.allowResponseEdit} onChange={(v) => patch({ allowResponseEdit: v })} />
          {isQuiz && (
            <>
              <Row label="نمایش نتیجه به پاسخ‌دهنده" desc="نمره و وضعیت قبولی پس از ارسال نمایش داده شود" checked={settings.showResultsToRespondent} onChange={(v) => patch({ showResultsToRespondent: v })} />
              <Row label="نمایش فوری نتیجه" checked={settings.showResultImmediately} onChange={(v) => patch({ showResultImmediately: v })} />
            </>
          )}
          <Row label="اجازه ایندکس موتورهای جست‌وجو" desc="پیش‌فرض: غیرفعال (فرم‌های عمومی ایندکس نمی‌شوند)" checked={settings.allowIndexing} onChange={(v) => patch({ allowIndexing: v })} />
        </CardContent>
      </Card>

      <Separator />
      <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
        {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden />}
        ذخیره همه تنظیمات
      </Button>
    </div>
  )
}

function Row({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
