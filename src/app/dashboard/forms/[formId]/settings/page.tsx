import { notFound, redirect } from 'next/navigation'
import { backend } from '@/lib/forms/service'
import { getCurrentUser } from '@/lib/auth/service'
import { SettingsClient } from '@/components/dashboard/settings-client'

export default async function FormSettingsPage({ params }: { params: Promise<{ formId: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const { formId } = await params
  const form = await backend().getForm(formId, user.id)
  if (!form) notFound()

  return (
    <SettingsClient
      form={{
        id: form.id, title: form.title, description: form.description, formType: form.formType,
        status: form.status, publicId: form.publicId, settings: form.settings,
        createdAt: form.createdAt, updatedAt: form.updatedAt, publishedAt: form.publishedAt,
      }}
    />
  )
}
