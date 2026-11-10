import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { getCurrentUser } from '@/lib/auth/service'

export const metadata: Metadata = {
  title: 'ورود',
  description: 'ورود به حساب کاربری آرشام فرم با ایمیل و رمز عبور.',
  robots: { index: true, follow: true },
}

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  )
}
