import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarClock, FileText, Lock } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/service'
import { backend } from '@/lib/forms/service'
import { PublicFormClient } from '@/components/public/public-form-client'
import { faDate } from '@/lib/persian'

type Props = { params: Promise<{ publicId: string }> }

/** Public pages are never statically cached — status/windows change in real time. */
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicId } = await params
  try {
    const form = await backend().getFormByPublicId(publicId)
    if (!form || form.status === 'draft') {
      return { title: 'فرم یافت نشد', robots: { index: false, follow: false } }
    }
    return {
      title: form.title,
      description: form.description || `فرم «${form.title}» در آرشام فرم`,
      robots: form.settings.allowIndexing && form.status === 'published'
        ? { index: true, follow: true }
        : { index: false, follow: false },
    }
  } catch {
    return { title: 'خطا', robots: { index: false, follow: false } }
  }
}

export default async function PublicFormPage({ params }: Props) {
  const { publicId } = await params
  const form = await backend().getFormByPublicId(publicId).catch(() => null)

  // draft / missing → not found (never leak existence)
  if (!form || form.status === 'draft') {
    return (
      <PublicShell>
        <StateCard
          icon={FileText}
          title="فرمی با این لینک پیدا نشد"
          text="ممکن است لینک اشتباه باشد یا فرم هنوز منتشر نشده باشد. لینک صحیح را از سازنده فرم دریافت کنید."
        />
      </PublicShell>
    )
  }

  // closed → explicit message
  if (form.status === 'closed') {
    return (
      <PublicShell>
        <StateCard icon={Lock} title="این فرم بسته شده است" text="سازنده فرم، پذیرش پاسخ جدید را متوقف کرده است." />
      </PublicShell>
    )
  }

  // time window
  const now = Date.now()
  if (form.settings.startAt && now < new Date(form.settings.startAt).getTime()) {
    return (
      <PublicShell>
        <StateCard
          icon={CalendarClock}
          title="هنوز شروع نشده است"
          text={`این فرم از تاریخ ${faDate(form.settings.startAt, true)} در دسترس قرار می‌گیرد.`}
        />
      </PublicShell>
    )
  }
  if (form.settings.endAt && now > new Date(form.settings.endAt).getTime()) {
    return (
      <PublicShell>
        <StateCard
          icon={CalendarClock}
          title="مهلت پاسخ‌دهی به پایان رسیده است"
          text={`مهلت ثبت پاسخ در ${faDate(form.settings.endAt, true)} به پایان رسیده بود.`}
        />
      </PublicShell>
    )
  }

  const user = await getCurrentUser()
  const requiresLogin = !form.settings.allowAnonymous && !user

  return (
    <PublicShell>
      <PublicFormClient
        publicId={form.publicId}
        form={{
          id: form.id,
          title: form.title,
          description: form.description,
          formType: form.formType,
          settings: form.settings,
        }}
        questions={form.questions}
        serverNow={now}
        requiresLogin={requiresLogin}
        uploadUrl={`/api/public/forms/${form.publicId}/upload`}
      />
    </PublicShell>
  )
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="hero-pattern min-h-screen w-full py-8 md:py-12">
      <div className="mx-auto max-w-2xl px-4">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          ساخته‌شده با آرشام فرم
        </Link>
        {children}
      </div>
    </div>
  )
}

function StateCard({
  icon: Icon, title, text,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="text-lg font-extrabold">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
      <Link href="/" className="mt-6 inline-block rounded-lg border px-5 py-2 text-sm font-medium hover:bg-muted">
        آشنایی با آرشام فرم
      </Link>
    </div>
  )
}
