import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { backend } from '@/lib/forms/service'
import { ExamResultClient } from '@/components/public/exam-result-client'

type Props = { params: Promise<{ publicId: string }> }

/** Result pages are private — never indexed. */
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: 'مشاهده نتیجه آزمون',
    robots: { index: false, follow: false },
  }
}

export default async function ExamResultPage({ params }: Props) {
  const { publicId } = await params
  const form = await backend().getFormByPublicId(publicId).catch(() => null)

  if (!form || form.status === 'draft') {
    return (
      <Shell>
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <h1 className="text-lg font-extrabold">آزمونی با این لینک پیدا نشد</h1>
          <p className="mt-2 text-sm text-muted-foreground">لینک را از برگزارکنندهٔ آزمون دریافت کنید.</p>
        </div>
      </Shell>
    )
  }
  if (form.formType !== 'quiz') {
    return (
      <Shell>
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <h1 className="text-lg font-extrabold">این فرم آزمون نیست</h1>
          <p className="mt-2 text-sm text-muted-foreground">صفحهٔ نتیجه فقط برای آزمون‌ها فعال است.</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <ExamResultClient
        publicId={form.publicId}
        formTitle={form.title}
        accountsEnabled={Boolean(form.settings.examAccounts?.enabled)}
      />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
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
