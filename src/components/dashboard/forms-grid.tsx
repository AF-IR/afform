'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Copy, ExternalLink, MoreVertical, Pencil, Settings, Trash2,
  BarChart3, ListOrdered, Send, Lock, FileText,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { faNumber, faRelative } from '@/lib/persian'
import { FORM_TYPE_LABEL, STATUS_LABEL, type FormStatus, type FormSummary } from '@/types'

export function FormsGrid({ initialForms }: { initialForms: FormSummary[] }) {
  const router = useRouter()
  const [forms, setForms] = useState(initialForms)
  const [deleteTarget, setDeleteTarget] = useState<FormSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function refresh() {
    const res = await fetch('/api/forms')
    if (res.ok) {
      const data = await res.json()
      setForms(data.forms)
    }
  }

  async function duplicate(form: FormSummary) {
    const res = await fetch(`/api/forms/${form.id}/duplicate`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error ?? 'کپی ناموفق بود')
    toast.success('کپی ایجاد شد (پیش‌نویس)')
    await refresh()
    router.refresh()
  }

  async function setStatus(form: FormSummary, status: FormStatus) {
    const res = await fetch(`/api/forms/${form.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error ?? 'تغییر وضعیت ناموفق بود')
    toast.success(status === 'published' ? 'فرم منتشر شد' : 'فرم بسته شد')
    await refresh()
    router.refresh()
  }

  async function remove() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/forms/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'حذف ناموفق بود')
      return
    }
    toast.success('فرم و همه پاسخ‌های آن حذف شد')
    setDeleteTarget(null)
    await refresh()
    router.refresh()
  }

  function copyLink(form: FormSummary) {
    const url = `${window.location.origin}/f/${form.publicId}`
    navigator.clipboard.writeText(url).then(
      () => toast.success('لینک فرم کپی شد'),
      () => toast.error('کپی ناموفق بود'),
    )
  }

  if (forms.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/50" aria-hidden />
          <p className="font-semibold">هنوز فرمی نساخته‌اید</p>
          <p className="text-sm text-muted-foreground">از قالب‌های آماده شروع کنید یا فرم خالی بسازید.</p>
          <div className="mt-2 flex gap-2">
            <Button asChild>
              <Link href="/dashboard/forms/new">ایجاد فرم جدید</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/templates">قالب‌های آماده</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="fade-up-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {forms.map((f) => (
          <Card key={f.id} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-bold">{f.title}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {FORM_TYPE_LABEL[f.formType]} · {faNumber(f.questionCount ?? 0)} سؤال · {faNumber(f.responseCount ?? 0)} پاسخ
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="عملیات فرم">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild><Link href={`/dashboard/forms/${f.id}/edit`}><Pencil className="ml-2 h-4 w-4" />ویرایش سؤال‌ها</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href={`/dashboard/forms/${f.id}/responses`}><ListOrdered className="ml-2 h-4 w-4" />پاسخ‌ها</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href={`/dashboard/forms/${f.id}/reports`}><BarChart3 className="ml-2 h-4 w-4" />گزارش‌ها</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href={`/dashboard/forms/${f.id}/settings`}><Settings className="ml-2 h-4 w-4" />تنظیمات انتشار</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => duplicate(f)}><Copy className="ml-2 h-4 w-4" />کپی فرم</DropdownMenuItem>
                    {f.status === 'published' ? (
                      <DropdownMenuItem onClick={() => setStatus(f, 'closed')}><Lock className="ml-2 h-4 w-4" />بستن فرم</DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => setStatus(f, 'published')}><Send className="ml-2 h-4 w-4" />انتشار فرم</DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => copyLink(f)}><ExternalLink className="ml-2 h-4 w-4" />کپی لینک عمومی</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(f)}>
                      <Trash2 className="ml-2 h-4 w-4" />حذف فرم
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {f.description && <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{f.description}</p>}

              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <Badge variant={f.status === 'published' ? 'default' : f.status === 'closed' ? 'destructive' : 'secondary'}>
                  {STATUS_LABEL[f.status as FormStatus]}
                </Badge>
                <div className="flex items-center gap-1">
                  {f.status !== 'draft' && (
                    <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                      <Link href={`/f/${f.publicId}`} target="_blank">
                        <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden />
                        مشاهده فرم
                      </Link>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                    <Link href={`/dashboard/forms/${f.id}/edit`}>ویرایش</Link>
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">آخرین تغییر: {faRelative(f.updatedAt)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف فرم «{deleteTarget?.title}»؟</AlertDialogTitle>
            <AlertDialogDescription>
              این عملیات بازگشت‌پذیر نیست. فرم، همه سؤال‌ها و همه پاسخ‌های ثبت‌شده برای همیشه حذف می‌شوند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); remove() }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? 'در حال حذف…' : 'حذف قطعی'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
