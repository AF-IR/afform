import { notFound, redirect } from 'next/navigation'
import { BuilderClient } from '@/components/forms/builder-client'
import { backend } from '@/lib/forms/service'
import { getCurrentUser } from '@/lib/auth/service'

export default async function EditFormPage({ params }: { params: Promise<{ formId: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const { formId } = await params

  const form = await backend().getForm(formId, user.id)
  if (!form) notFound()

  return (
    <BuilderClient
      form={{
        id: form.id,
        title: form.title,
        description: form.description,
        formType: form.formType,
        status: form.status,
        publicId: form.publicId,
        settings: form.settings,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
        publishedAt: form.publishedAt,
      }}
      initialQuestions={form.questions}
    />
  )
}
