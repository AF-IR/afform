import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'بازیابی رمز عبور',
  description: 'بازیابی رمز عبور حساب آرشام فرم.',
}

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </main>
  )
}
