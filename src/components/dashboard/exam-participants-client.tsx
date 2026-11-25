'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CheckCircle2, CircleDashed, Copy, Download, Eye, EyeOff, KeyRound, Loader2,
  Plus, Printer, ShieldCheck, Upload, UserPlus, Users, Wand2, X,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { generateExamAccounts, parseExamAccountsText } from '@/lib/exam/accounts'
import { faNumber } from '@/lib/persian'
import type { ExamAccount, FormSettings } from '@/types'

interface Props {
  formId: string
  examTitle: string
  initialAccounts: ExamAccount[]
  initialEnabled: boolean
  /** full current settings — PATCH replaces the whole object, so we always send it complete */
  initialSettings: FormSettings
  /** usernames that already submitted (participation status) */
  submittedUsernames: string[]
}

/**
 * Student-account manager of the exam panel.
 * The creator defines one username+password per participant; students enter
 * the exam AND view their result with these credentials. Saved through the
 * owner-scoped PATCH /api/forms/[formId] (settings.examAccounts) — passwords
 * are stored owner-only and never exposed on the public side.
 */
export function ExamParticipantsClient({ formId, examTitle, initialAccounts, initialEnabled, initialSettings, submittedUsernames }: Props) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<ExamAccount[]>(initialAccounts)
  const [enabled, setEnabled] = useState(initialEnabled)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // add-single form
  const [newName, setNewName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // bulk import
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')

  // generate
  const [genCount, setGenCount] = useState(20)
  const [genPrefix, setGenPrefix] = useState('student')
  const [showPasswords, setShowPasswords] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const submitted = useMemo(() => new Set(submittedUsernames.map((u) => u.toLowerCase())), [submittedUsernames])

  function markDirty(next: ExamAccount[]) {
    setAccounts(next)
    setDirty(true)
  }

  function addAccount() {
    const username = newUsername.trim().toLowerCase()
    const password = newPassword.trim()
    if (!username || !password) {
      toast.error('نام کاربری و رمز عبور هر دو الزامی است')
      return
    }
    if (!/^[a-zA-Z0-9._@-]{2,64}$/.test(username)) {
      toast.error('نام کاربری فقط حروف انگلیسی، رقم و نقطه/خط تیره (۲ تا ۶۴ نویسه)')
      return
    }
    if (accounts.some((a) => a.username === username)) {
      toast.error('این نام کاربری قبلاً تعریف شده است')
      return
    }
    if (password.length > 64) {
      toast.error('رمز عبور حداکثر ۶۴ نویسه است')
      return
    }
    markDirty([...accounts, { username, password, ...(newName.trim() ? { name: newName.trim().slice(0, 120) } : {}) }])
    setNewName(''); setNewUsername(''); setNewPassword('')
    toast.success('اکانت اضافه شد — برای ذخیره نهایی، «ذخیره اکانت‌ها» را بزنید')
  }

  function removeAccount(username: string) {
    if (submitted.has(username)) {
      toast.error('این دانش‌آموز در آزمون شرکت کرده است؛ حذف اکانت، کارنامه او را بی‌نام می‌کند')
    }
    markDirty(accounts.filter((a) => a.username !== username))
  }

  function generate() {
    const generated = generateExamAccounts(genCount, genPrefix, accounts.length + 1)
    const existing = new Set(accounts.map((a) => a.username))
    const merged = [...accounts, ...generated.filter((g) => !existing.has(g.username))]
    markDirty(merged)
    setEnabled(true)
    toast.success(`${faNumber(generated.length)} اکانت تولید شد — رمزها تصادفی و یکتا هستند`)
  }

  function applyBulk() {
    const { accounts: parsed, invalidLines } = parseExamAccountsText(bulkText)
    if (!parsed.length) {
      toast.error('هیچ اکانت معتبری پیدا نشد — قالب هر خط: نام‌کاربری,رمز,نام')
      return
    }
    const existing = new Set(accounts.map((a) => a.username))
    const merged = [...accounts, ...parsed.filter((p) => !existing.has(p.username))]
    markDirty(merged)
    setEnabled(true)
    setBulkText('')
    setBulkOpen(false)
    toast.success(
      invalidLines > 0
        ? `${faNumber(parsed.length)} اکانت اضافه شد؛ ${faNumber(invalidLines)} خط نامعتبر نادیده گرفته شد`
        : `${faNumber(parsed.length)} اکانت اضافه شد`,
    )
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...initialSettings,
            examAccounts: { enabled, accounts },
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'ذخیره ناموفق بود')
        return
      }
      setDirty(false)
      toast.success(enabled ? `اکانت‌های آزمون ذخیره شد (${faNumber(accounts.length)} اکانت)` : 'ورود با اکانت غیرفعال شد')
      router.refresh()
    } catch {
      toast.error('خطای شبکه')
    } finally {
      setSaving(false)
    }
  }

  function exportCsv() {
    const header = 'name,username,password,participated'
    const lines = accounts.map((a) =>
      [a.name ?? '', a.username, a.password, submitted.has(a.username) ? 'yes' : 'no']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
    const csv = '\uFEFF' + [header, ...lines].join('\r\n') // BOM → Excel opens UTF-8 Persian correctly
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${examTitle.slice(0, 40) || 'exam'}-accounts.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('فایل اکانت‌ها (CSV) دانلود شد')
  }

  function copyAll() {
    const text = accounts.map((a) => `${a.name ? a.name + ' — ' : ''}${a.username} / ${a.password}`).join('\n')
    navigator.clipboard.writeText(text)
      .then(() => toast.success('همه اکانت‌ها کپی شد — در گروه پیام‌رسان منتشر کنید'))
      .catch(() => toast.error('کپی ناموفق بود'))
  }

  return (
    <div className="space-y-6">
      {/* gate toggle + save bar */}
      <Card className={enabled ? 'border-primary/40' : ''}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-start gap-3">
            <Switch checked={enabled} onCheckedChange={(v) => { setEnabled(v); setDirty(true) }} aria-label="فعال‌سازی ورود با اکانت" />
            <div>
              <p className="text-sm font-bold">ورود به آزمون فقط با اکانت</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                هر شرکت‌کننده با نام کاربری و رمزی که شما تعریف می‌کنید وارد می‌شود و بعداً با همان اکانت نتیجه‌اش را می‌بیند.
              </p>
            </div>
          </div>
          <Button onClick={save} disabled={saving || (!dirty && accounts.length === initialAccounts.length && enabled === initialEnabled)}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="ml-2 h-4 w-4" aria-hidden />}
            ذخیره اکانت‌ها
          </Button>
        </CardContent>
      </Card>

      {enabled && (
        <>
          {/* add + generate + import tools */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <UserPlus className="h-4 w-4 text-primary" aria-hidden />
                  افزودن اکانت تکی
                </CardTitle>
                <CardDescription>مثلاً برای یک دانش‌آموز جدید</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="p-name">نام و نام خانوادگی</Label>
                    <Input id="p-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثلاً: علی رضایی" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-user">نام کاربری *</Label>
                    <Input id="p-user" dir="ltr" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="ali.rezaei" className="text-left" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-pass">رمز عبور *</Label>
                    <Input id="p-pass" dir="ltr" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="a4k9m2" className="text-left" />
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={addAccount}>
                  <Plus className="ml-1.5 h-4 w-4" aria-hidden />
                  افزودن به فهرست
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Wand2 className="h-4 w-4 text-primary" aria-hidden />
                  تولید خودکار اکانت‌ها
                </CardTitle>
                <CardDescription>مثلاً ۲۰ اکانت با پیشوند «student» و رمزهای تصادفی</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="gen-prefix">پیشوند نام کاربری</Label>
                    <Input id="gen-prefix" dir="ltr" value={genPrefix} onChange={(e) => setGenPrefix(e.target.value)} className="text-left" placeholder="student" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gen-count">تعداد</Label>
                    <Input id="gen-count" type="number" min={1} max={500} value={genCount} onChange={(e) => setGenCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} />
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={generate}>
                  <Wand2 className="ml-1.5 h-4 w-4" aria-hidden />
                  تولید اکانت‌ها
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* bulk import */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Upload className="h-4 w-4 text-primary" aria-hidden />
                  درج گروهی از فایل یا متن
                </CardTitle>
                <CardDescription className="mt-1">هر خط یک اکانت: <code dir="ltr" className="rounded bg-muted px-1">username,password,نام و نام خانوادگی</code></CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setBulkOpen((v) => !v)}>
                {bulkOpen ? 'بستن' : 'باز کردن'}
              </Button>
            </CardHeader>
            {bulkOpen && (
              <CardContent className="space-y-3">
                <Textarea dir="ltr" className="min-h-40 text-left" value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={'ali,pass123,علی رضایی\nsara,xyz789,سارا محمدی'} />
                <Button size="sm" variant="secondary" onClick={applyBulk} disabled={!bulkText.trim()}>
                  <Upload className="ml-1.5 h-4 w-4" aria-hidden />
                  افزودن اکانت‌ها
                </Button>
              </CardContent>
            )}
          </Card>

          {/* account list */}
          <Card ref={searchRef}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" aria-hidden />
                  اکانت‌های آزمون ({faNumber(accounts.length)})
                </CardTitle>
                <CardDescription className="mt-1">
                  {faNumber(submittedUsernames.length)} نفر در آزمون شرکت کرده‌اند
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowPasswords((v) => !v)}>
                  {showPasswords ? <EyeOff className="ml-1.5 h-3.5 w-3.5" aria-hidden /> : <Eye className="ml-1.5 h-3.5 w-3.5" aria-hidden />}
                  {showPasswords ? 'پنهان‌کردن رمزها' : 'نمایش رمزها'}
                </Button>
                <Button size="sm" variant="ghost" onClick={copyAll} disabled={!accounts.length}>
                  <Copy className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                  کپی همه
                </Button>
                <Button size="sm" variant="ghost" onClick={() => window.print()} disabled={!accounts.length}>
                  <Printer className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                  چاپ برگه اکانت‌ها
                </Button>
                <Button size="sm" variant="outline" onClick={exportCsv} disabled={!accounts.length}>
                  <Download className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                  خروجی CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                  <KeyRound className="h-8 w-8 text-muted-foreground/50" aria-hidden />
                  هنوز اکانتی تعریف نشده است — با «تولید خودکار» یا «افزودن اکانت تکی» شروع کنید
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="py-2 text-right font-medium">نام</th>
                        <th className="py-2 text-right font-medium">نام کاربری</th>
                        <th className="py-2 text-right font-medium">رمز عبور</th>
                        <th className="py-2 text-right font-medium">وضعیت</th>
                        <th className="py-2 text-right font-medium">حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((a) => (
                        <tr key={a.username} className="border-b last:border-0">
                          <td className="py-2.5">{a.name || '—'}</td>
                          <td className="py-2.5 font-medium" dir="ltr">{a.username}</td>
                          <td className="py-2.5" dir="ltr">
                            <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                              {showPasswords ? a.password : '••••••'}
                            </span>
                          </td>
                          <td className="py-2.5">
                            {submitted.has(a.username) ? (
                              <Badge variant="default" className="gap-1 px-2 py-0.5 text-[11px]">
                                <CheckCircle2 className="h-3 w-3" aria-hidden />
                                شرکت کرده
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[11px]">
                                <CircleDashed className="h-3 w-3" aria-hidden />
                                هنوز وارد نشده
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeAccount(a.username)} aria-label={`حذف اکانت ${a.username}`}>
                              <X className="h-4 w-4" aria-hidden />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {dirty && (
                <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
                  تغییرات ذخیره‌نشده دارید — برای اعمال، «ذخیره اکانت‌ها» را بزنید.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!enabled && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <KeyRound className="h-8 w-8 text-muted-foreground/50" aria-hidden />
            <p className="text-sm font-medium">ورود با اکانت خاموش است</p>
            <p className="text-sm text-muted-foreground">
              در این حالت هر کسی با لینک آزمون می‌تواند وارد شود. برای آزمون واقعی، کلید بالا را روشن کنید.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
