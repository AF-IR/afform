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
    <main className="auth-scene relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-10">
      {/* soft ambient blobs — same visual language as the welcome page */}
      <div aria-hidden className="auth-blob pointer-events-none absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="auth-blob auth-blob-slow pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  )
}
