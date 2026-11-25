'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  ClipboardCopy, KeyRound, Loader2, Settings2, ShieldCheck, Users, Wand2,
} from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  DEFAULT_FORM_SETTINGS, type ExamAccounts, type FormSettings, type FormSummary, type ResultRelease,
} from '@/types'
import { parseExamAccountsText, serializeExamAccountsText, generateExamAccounts } from '@/lib/exam/accounts'
import { faNumber } from '@/lib/persian'

/**
 * Publish settings — every switch here has real server-side effects:
 * window, response limit, attempts, timing, anonymity, indexing…
 * Exam mode adds: participant accounts (username/password) + result release.
 */
export function BuilderSettingsSheet({
  open,
  onOpenChange,
  form,
  settings,
  onSettingsChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  form: FormSummary
  settings: FormSettings
  onSettingsChange: (s: FormSettings) => void
  onSave: () => Promise<boolean>
}) {
  const [saving, setSaving] = useState(false)
  const isQuiz = form.formType === 'quiz'
  const [accountsText, setAccountsText] = useState<string>(() => serializeExamAccountsText(settings.examAccounts?.accounts))
  const [genCount, setGenCount] = useState('20')
  const [genPrefix, setGenPrefix] = useState('student')

  function patch(p: Partial<FormSettings>) {
    onSettingsChange({ ...DEFAULT_FORM_SETTINGS, ...settings, ...p })
  }

  function setAccounts(text: string) {
    setAccountsText(text)
    const { accounts, invalidLines } = parseExamAccountsText(text)
    const accountsPatch: ExamAccounts = {
      enabled: settings.examAccounts?.enabled ?? true,
      accounts,
    }
    patch({ examAccounts: accountsPatch })
    if (invalidLines > 0) toast.warning(`${faNumber(invalidLines)} خط نامعتبر نادیده گرفته شد (قالب: username,password,نام)`)
  }

  function autoGenerate() {
    const n = Math.max(1, Math.min(500, Number(genCount) || 20))
    const generated = generateExamAccounts(n, genPrefix)
    const merged = [...(settings.examAccounts?.accounts ?? []), ...generated]
    setAccountsText(serializeExamAccountsText(merged))
    patch({ examAccounts: { enabled: true, accounts: merged } })
    toast.success(`${faNumber(n)} اکانت ساخته شد — رمزها را کپی و بین دانش‌آموزان توزیع کنید`)
  }

  const accountCount = settings.examAccounts?.accounts.length ?? 0

  async function saveAndClose() {
    setSaving(true)
    const ok = await onSave()
    setSaving(false)
    if (ok) {
      toast.success('تنظیمات ذخیره شد')
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full max-w-md p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2 text-right"><Settings2 className="h-4 w-4" aria-hidden />تنظیمات و انتشار</SheetTitle>
          <SheetDescription>هر تنظیم در رفتار واقعی فرم اعمال می‌شود (سمت سرور نیز کنترل می‌شود)</SheetDescription>
        </SheetHeader>

        <ScrollArea className="custom-scroll h-[calc(100vh-9rem)]">
          <div className="space-y-6 p-4">
            <div className="space-y-3">
              <Label>پیام پس از ارسال</Label>
              <Textarea
                rows={3}
                value={settings.thankYouMessage}
                onChange={(e) => patch({ thankYouMessage: e.target.value })}
                maxLength={2000}
              />
            </div>

            {isQuiz && (
              <>
                <Separator />

                {/* exam access accounts — the professional student-entry system */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-bold">
                        <KeyRound className="h-4 w-4 text-primary" aria-hidden />
                        ورود با اکانت دانش‌آموز
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        برای هر دانش‌آموز یک اکانت تعریف کنید. ورود به آزمون و مشاهدهٔ نتیجه فقط با نام کاربری و رمز تعریف‌شده ممکن است و هر اکانت فقط یک بار می‌تواند شرکت کند — روی همهٔ دستگاه‌ها کنترل می‌شود.
                      </p>
                    </div>
                    <Switch
                      checked={settings.examAccounts?.enabled ?? false}
                      onCheckedChange={(v) => patch({
                        examAccounts: { enabled: v, accounts: settings.examAccounts?.accounts ?? [] },
                      })}
                      aria-label="فعال‌سازی ورود با اکانت"
                    />
                  </div>

                  {(settings.examAccounts?.enabled) && (
                    <div className="space-y-3 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
                          اکانت‌های آزمون
                        </Label>
                        <Badge variant={accountCount > 0 ? 'default' : 'secondary'}>
                          {faNumber(accountCount)} اکانت
                        </Badge>
                      </div>
                      <Textarea
                        dir="ltr"
                        rows={7}
                        className="font-mono text-left text-xs"
                        placeholder={'student01,ab3x9f,علی رضایی\nstudent02,k7p2mn,سارا محمدی\n…'}
                        value={accountsText}
                        onChange={(e) => setAccounts(e.target.value)}
                      />
                      <p className="text-[11px] leading-5 text-muted-foreground">
                        هر خط یک اکانت: <code className="rounded bg-muted px-1" dir="ltr">username,password[,نام و نام خانوادگی]</code>. نام کاربری فقط حروف انگلیسی، عدد و نقطه/خط تیره. رمزها فقط برای شما و سرور ذخیره می‌شوند.
                      </p>
                      <div className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/40 p-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">پیشوند</Label>
                          <Input value={genPrefix} onChange={(e) => setGenPrefix(e.target.value)} dir="ltr" className="h-8 w-28 font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">تعداد</Label>
                          <Input type="number" min={1} max={500} value={genCount} onChange={(e) => setGenCount(e.target.value)} dir="ltr" className="h-8 w-20" />
                        </div>
                        <Button size="sm" variant="outline" type="button" onClick={autoGenerate}>
                          <Wand2 className="ml-1 h-4 w-4" aria-hidden />
                          تولید خودکار اکانت
                        </Button>
                        {accountCount > 0 && (
                          <Button
                            size="sm" variant="ghost" type="button" className="h-8"
                            onClick={() => {
                              navigator.clipboard
                                .writeText(accountsText)
                                .then(() => toast.success('لیست اکانت‌ها کپی شد — آن را بین دانش‌آموزان توزیع کنید'))
                                .catch(() => toast.error('کپی ممکن نشد'))
                            }}
                          >
                            <ClipboardCopy className="ml-1 h-3.5 w-3.5" aria-hidden />
                            کپی لیست برای توزیع
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* exam timing */}
                <div className="space-y-3">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />زمان‌بندی آزمون
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>مدت آزمون (دقیقه)</Label>
                      <Input
                        type="number" dir="ltr" min={1}
                        value={settings.timeLimitMinutes ?? ''}
                        placeholder="بدون محدودیت"
                        onChange={(e) => patch({ timeLimitMinutes: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>حداکثر تلاش هر اکانت</Label>
                      <Input
                        type="number" dir="ltr" min={1}
                        value={settings.maxAttempts ?? ''}
                        placeholder="پیش‌فرض: ۱"
                        onChange={(e) => patch({ maxAttempts: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>شروع برگزاری (اختیاری)</Label>
                      <Input
                        type="datetime-local" dir="ltr"
                        value={settings.startAt ? toLocalInput(settings.startAt) : ''}
                        onChange={(e) => patch({ startAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>پایان برگزاری (اختیاری)</Label>
                      <Input
                        type="datetime-local" dir="ltr"
                        value={settings.endAt ? toLocalInput(settings.endAt) : ''}
                        onChange={(e) => patch({ endAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      />
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    زمان‌سنج روی سرور اجرا می‌شود: با بستن صفحه متوقف نمی‌شود و پس از پایان زمان، پاسخ تازه پذیرفته نمی‌شود.
                  </p>
                </div>

                <Separator />

                {/* result release */}
                <div className="space-y-3">
                  <p className="text-sm font-bold">ارائهٔ نتیجه</p>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">نمایش نتیجه به دانش‌آموز</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">دانش‌آموز می‌تواند کارنامهٔ خود را در صفحهٔ نتیجه ببیند</p>
                    </div>
                    <Switch
                      checked={settings.showResultsToRespondent}
                      onCheckedChange={(v) => patch({ showResultsToRespondent: v })}
                      aria-label="نمایش نتیجه"
                    />
                  </div>
                  {settings.showResultsToRespondent && (
                    <div className="space-y-3 rounded-lg border p-3">
                      <div className="space-y-2">
                        <Label>زمان ارائهٔ نتیجه</Label>
                        <Select
                          value={settings.resultRelease ?? 'immediately'}
                          onValueChange={(v) => patch({ resultRelease: v as ResultRelease })}
                          dir="rtl"
                        >
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediately">بلافاصله پس از پایان آزمون</SelectItem>
                            <SelectItem value="afterEnd">پس از پایان مهلت برگزاری</SelectItem>
                            <SelectItem value="scheduled">زمان مشخص</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {settings.resultRelease === 'scheduled' && (
                        <div className="space-y-2">
                          <Label>تاریخ و ساعت اعلام نتیجه</Label>
                          <Input
                            type="datetime-local" dir="ltr"
                            value={settings.resultReleaseAt ? toLocalInput(settings.resultReleaseAt) : ''}
                            onChange={(e) => patch({ resultReleaseAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          />
                        </div>
                      )}
                      <p className="text-xs leading-5 text-muted-foreground">
                        دانش‌آموز در صفحهٔ <span className="font-mono text-[11px]" dir="ltr">/f/{form.publicId}/result</span> با اکانت خود وارد می‌شود و کارنامهٔ سؤال‌به‌سؤال را می‌بیند.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>نمره قبولی (٪ — اختیاری)</Label>
                    <Input
                      type="number" dir="ltr" min={0} max={100}
                      value={settings.passingScorePercent ?? ''}
                      onChange={(e) => patch({ passingScorePercent: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </div>
                </div>
              </>
            )}

            {!isQuiz && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-bold">زمان‌بندی</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>شروع (اختیاری)</Label>
                      <Input
                        type="datetime-local" dir="ltr"
                        value={settings.startAt ? toLocalInput(settings.startAt) : ''}
                        onChange={(e) => patch({ startAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>پایان (اختیاری)</Label>
                      <Input
                        type="datetime-local" dir="ltr"
                        value={settings.endAt ? toLocalInput(settings.endAt) : ''}
                        onChange={(e) => patch({ endAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>سقف تعداد پاسخ (اختیاری)</Label>
                    <Input
                      type="number" dir="ltr" min={1}
                      value={settings.responseLimit ?? ''}
                      onChange={(e) => patch({ responseLimit: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-4">
              <p className="text-sm font-bold">نمایش و رفتار</p>
              <ToggleRow
                label="نمایش نوار پیشرفت"
                checked={settings.showProgressBar}
                onChange={(v) => patch({ showProgressBar: v })}
              />
              <ToggleRow
                label="ترتیب تصادفی سؤال‌ها"
                checked={settings.shuffleQuestions}
                onChange={(v) => patch({ shuffleQuestions: v })}
              />
              <ToggleRow
                label="ترتیب تصادفی گزینه‌ها"
                checked={settings.shuffleOptions}
                onChange={(v) => patch({ shuffleOptions: v })}
              />
              <ToggleRow
                label="اجازه پاسخ ناشناس"
                description="در صورت غیرفعال‌شدن، فقط کاربران واردشده می‌توانند پاسخ دهند"
                checked={settings.allowAnonymous}
                onChange={(v) => patch({ allowAnonymous: v })}
              />
              <ToggleRow
                label="اجازه ویرایش پاسخ پس از ارسال"
                description="همان مرورگر می‌تواند پاسخ خود را ویرایش کند"
                checked={settings.allowResponseEdit}
                onChange={(v) => patch({ allowResponseEdit: v })}
              />
              <ToggleRow
                label="اجازه ایندکس موتورهای جست‌وجو"
                description="به‌صورت پیش‌فرض فرم‌های عمومی در نتایج جست‌وجو ایندکس نمی‌شوند"
                checked={settings.allowIndexing}
                onChange={(v) => patch({ allowIndexing: v })}
              />
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="border-t p-4">
          <Button onClick={saveAndClose} disabled={saving} className="w-full">
            {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden />}
            ذخیره تنظیمات
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>}
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
