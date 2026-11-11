import Link from 'next/link'
import { backend } from '@/lib/forms/service'
import { getCurrentUser } from '@/lib/auth/service'
import { Button } from '@/components/ui/button'
import { FormsGrid } from '@/components/dashboard/forms-grid'
import { Plus } from 'lucide-react'
import { faNumber } from '@/lib/persian'

export default async function FormsPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const forms = await backend().listForms(user.id)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">فرم‌های من</h1>
          <p className="mt-1 text-sm text-muted-foreground">{faNumber(forms.length)} فرم و آزمون</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/forms/new">
            <Plus className="ml-2 h-4 w-4" aria-hidden />
            فرم جدید
          </Link>
        </Button>
      </div>
      <FormsGrid initialForms={forms} />
    </div>
  )
}
