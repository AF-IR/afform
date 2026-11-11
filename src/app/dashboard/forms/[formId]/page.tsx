import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowRight, BarChart3, ExternalLink, ListOrdered, Pencil, Settings, Send, Lock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { backend } from '@/lib/forms/service'
import { getCurrentUser } from '@/lib/auth/service'
import { faDate, faNumber } from '@/lib/persian'
import { FORM_TYPE_LABEL, STATUS_LABEL, type FormStatus } from '@/types'

export default async function FormOverviewPage({ params }: { params: Promise<{ formId: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const { formId } = await params
  const form = await backend().getForm(formId, user.id)
  if (!form) notFound()

  const status = form.status as FormStatus
  const links = [
    { href: `/dashboard/forms/${form.id}/edit`, label: 'ویرایش سؤال‌ها', icon: Pencil },
    { href: `/dashboard/forms/${form.id}/responses`, label: 'پاسخ‌های دریافتی', icon: ListOrdered },
    { href: `/dashboard/forms/${form.id}/reports`, label: 'گزارش و تحلیل', icon: BarChart3 },
    { href: `/dashboard/forms/${form.id}/settings`, label: 'تنظیمات انتشار', icon: Settings },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-1 -ml-2 text-muted-foreground">
            <Link href="/dashboard/forms"><ArrowRight className="ml-1 h-4 w-4" aria-hidden />فرم‌های من</Link>
          </Button>
          <h1 className="truncate text-2xl font-extrabold">{form.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {FORM_TYPE_LABEL[form.formType]} · ایجاد در {faDate(form.createdAt)} · آخرین تغییر {faDate(form.updatedAt, true)}
          </p>
        </div>
        <Badge variant={status === 'published' ? 'default' : status === 'closed' ? 'destructive' : 'secondary'} className="h-8 px-4 text-sm">
          {STATUS_LABEL[status]}
        </Badge>
      </div>

      {form.description && (
        <Card><CardContent className="p-4 text-sm leading-6 text-muted-foreground">{form.description}</CardContent></Card>
      )}

      {status !== 'draft' && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <span className="text-muted-foreground">لینک عمومی:</span>
            <code className="rounded bg-muted px-2 py-1 text-xs" dir="ltr">/f/{form.publicId}</code>
            <Button asChild size="sm" variant="outline">
              <Link href={`/f/${form.publicId}`} target="_blank">
                <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden /> باز کردن
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">
              ({status === 'closed' ? 'فرم بسته است و پاسخ نمی‌پذیرد' : 'فعال و در دسترس'})
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">تعداد سؤال‌ها</p>
            <p className="mt-1 text-2xl font-extrabold">{faNumber(form.questions.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">پاسخ‌های دریافتی</p>
            <p className="mt-1 text-2xl font-extrabold">{faNumber(form.responseCount ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">تاریخ انتشار</p>
            <p className="mt-1 text-base font-bold">{form.publishedAt ? faDate(form.publishedAt) : '—'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardHeader className="flex-row items-center gap-3 pb-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <l.icon className="h-5 w-5" aria-hidden />
                </span>
                <CardTitle className="text-sm">{l.label}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
