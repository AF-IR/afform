import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowRight, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { backend } from '@/lib/forms/service'
import { getCurrentUser } from '@/lib/auth/service'
import { computeExamStats } from '@/lib/exam/panel'
import { ExamParticipantsClient } from '@/components/dashboard/exam-participants-client'

export const metadata = { title: 'اکانت دانش‌آموزان', robots: { index: false, follow: false } }

export default async function ExamParticipantsPage({ params }: { params: Promise<{ formId: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const { formId } = await params
  const form = await backend().getForm(formId, user.id)
  if (!form || form.formType !== 'quiz') notFound()

  const stats = await computeExamStats(form)
  const accounts = form.settings.examAccounts?.enabled ? form.settings.examAccounts.accounts : form.settings.examAccounts?.accounts ?? []

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="min-w-0">
        <Button asChild variant="ghost" size="sm" className="mb-1 -ml-2 text-muted-foreground">
          <Link href={`/dashboard/exams/${form.id}`}>
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            کنترل آزمون
          </Link>
        </Button>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">
          <GraduationCap className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          اکانت شرکت‌کنندگان — {form.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          برای هر دانش‌آموز یک نام کاربری و رمز تعریف کنید؛ ورود به آزمون و مشاهده نتیجه هر دو فقط با همین اکانت انجام می‌شود.
        </p>
      </div>

      <ExamParticipantsClient
        formId={form.id}
        examTitle={form.title}
        initialAccounts={accounts}
        initialEnabled={form.settings.examAccounts?.enabled ?? false}
        initialSettings={form.settings}
        submittedUsernames={stats.attempts.map((a) => a.username).filter((u): u is string => u !== null)}
      />
    </div>
  )
}
