'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Settings2, ShieldCheck } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DEFAULT_FORM_SETTINGS, type FormSettings, type FormSummary, type IdentityGate } from '@/types'
import { parseAllowedNationalIds } from '@/lib/exam/identity'
import { faNumber } from '@/lib/persian'

/**
 * Publish settings — every switch here has real server-side effects:
 * window, response limit, attempts, timing, anonymity, indexing…
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
  const gate = settings.identityGate
  const [whitelistText, setWhitelistText] = useState<string>(() => (gate?.allowedNationalIds ?? []).join('\n'))

  function patch(p: Partial<FormSettings>) {
    onSettingsChange({ ...DEFAULT_FORM_SETTINGS, ...settings, ...p })
  }

  function patchGate(p: Partial<IdentityGate>) {
    const current: IdentityGate = gate ?? {
      enabled: true,
      requireFullName: true,
      requireNationalId: true,
      allowedNationalIds: [],
    }
    patch({ identityGate: { ...current, ...p } })
  }

  function setWhitelist(text: string) {
    setWhitelistText(text)
    patchGate({ allowedNationalIds: parseAllowedNationalIds(text) })
  }

  const acceptedIds = gate?.allowedNationalIds?.length ?? 0

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

                {/* secure-exam identity gate */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-bold">
                        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                        ورود امن آزمون
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        پاسخ‌دهنده ابتدا نام و کد ملی خود را وارد می‌کند؛ اعتبار کد ملی، تطبیق با لیست مجاز و «فقط یک بار شرکت» همگی در سرور کنترل می‌شود.
                      </p>
                    </div>
                    <Switch
                      checked={gate?.enabled ?? false}
                      onCheckedChange={(v) => patchGate({ enabled: v })}
                      aria-label="فعال‌سازی ورود امن آزمون"
                    />
                  </div>

                  {gate?.enabled && (
                    <div className="space-y-4 rounded-lg border p-3">
                      <ToggleRow
                        label="نام و نام خانوادگی الزامی باشد"
                        checked={gate.requireFullName}
                        onChange={(v) => patchGate({ requireFullName: v })}
                      />
                      <ToggleRow
                        label="کد ملی الزامی باشد"
                        description="کنترل صحت ۱۰ رقم بودن و درستی محاسباتی کد ملی"
                        checked={gate.requireNationalId}
                        onChange={(v) => patchGate({ requireNationalId: v })}
                      />
                      <div className="space-y-2">
                        <Label>لیست کدهای ملی مجاز (هر خط یک کد)</Label>
                        <Textarea
                          dir="ltr"
                          rows={6}
                          className="font-mono text-left"
                          placeholder={'0012345678\n0012345679\n0012345680'}
                          value={whitelistText}
                          onChange={(e) => setWhitelist(e.target.value)}
                        />
                        <p className="text-xs leading-5 text-muted-foreground">
                          {acceptedIds > 0 ? (
                            <>
                              <span className="font-bold text-green-600 dark:text-green-400">{faNumber(acceptedIds)} کد ملی معتبر</span>
                              {' '}در لیست ثبت شده است. فقط همین افراد می‌توانند وارد شوند.
                            </>
                          ) : (
                            'لیست خالی است: هر کد ملی معتبر ایرانی می‌تواند وارد شود. با وارد کردن لیست، فقط همین کدها پذیرفته می‌شوند. اعداد فارسی هم پذیرفته می‌شود.'
                          )}
                          {' '}هر کد ملی در هر صورت فقط یک بار می‌تواند شرکت کند.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

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
              <p className="text-xs text-muted-foreground">
                پس از پایان مهلت، سرور پذیرش پاسخ جدید را متوقف می‌کند — حتی اگر کاربر صفحه را باز نگه داشته باشد.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-bold">محدودیت‌ها</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>سقف تعداد پاسخ (اختیاری)</Label>
                  <Input
                    type="number" dir="ltr" min={1}
                    value={settings.responseLimit ?? ''}
                    onChange={(e) => patch({ responseLimit: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </div>
                {isQuiz && (
                  <>
                    <div className="space-y-2">
                      <Label>مدت آزمون (دقیقه — اختیاری)</Label>
                      <Input
                        type="number" dir="ltr" min={1}
                        value={settings.timeLimitMinutes ?? ''}
                        onChange={(e) => patch({ timeLimitMinutes: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>حداکثر تلاش هر نفر</Label>
                      <Input
                        type="number" dir="ltr" min={1}
                        value={settings.maxAttempts ?? ''}
                        placeholder={isQuiz ? 'پیش‌فرض: ۱' : ''}
                        onChange={(e) => patch({ maxAttempts: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>نمره قبولی (٪ — اختیاری)</Label>
                      <Input
                        type="number" dir="ltr" min={0} max={100}
                        value={settings.passingScorePercent ?? ''}
                        onChange={(e) => patch({ passingScorePercent: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

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
              {isQuiz && (
                <>
                  <ToggleRow
                    label="نمایش نتیجه به پاسخ‌دهنده"
                    description="پس از ارسال، نمره و وضعیت قبولی نمایش داده شود"
                    checked={settings.showResultsToRespondent}
                    onChange={(v) => patch({ showResultsToRespondent: v })}
                  />
                  <ToggleRow
                    label="نمایش فوری نتیجه"
                    description="نتیجه بلافاصله پس از ارسال نمایش داده شود (در غیر این صورت فقط در داشبورد)"
                    checked={settings.showResultImmediately}
                    onChange={(v) => patch({ showResultImmediately: v })}
                  />
                </>
              )}
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
