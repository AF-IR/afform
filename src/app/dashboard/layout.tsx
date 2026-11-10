import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/shell'
import { getCurrentUser } from '@/lib/auth/service'

export const metadata: Metadata = {
  title: 'داشبورد',
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/dashboard')

  return (
    <DashboardShell user={{ displayName: user.displayName, email: user.email }}>
      {children}
    </DashboardShell>
  )
}
