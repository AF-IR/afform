import { notFound, redirect } from 'next/navigation'
import { backend } from '@/lib/forms/service'
import { getCurrentUser } from '@/lib/auth/service'
import { ResponsesClient } from '@/components/dashboard/responses-client'

export default async function ResponsesPage({ params }: { params: Promise<{ formId: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const { formId } = await params
  const form = await backend().getForm(formId, user.id)
  if (!form) notFound()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">پاسخ‌های دریافتی</h1>
        <p className="mt-1 text-sm text-muted-foreground">{form.title}</p>
      </div>
      <ResponsesClient formId={form.id} formType={form.formType} />
    </div>
  )
}
