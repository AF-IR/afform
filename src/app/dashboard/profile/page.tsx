import { redirect } from 'next/navigation'
import { ProfileClient } from '@/components/dashboard/profile-client'
import { getCurrentUser } from '@/lib/auth/service'

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/dashboard/profile')

  return (
    <ProfileClient
      user={{
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      }}
    />
  )
}
