import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata: Metadata = {
  title: 'تعیین رمز عبور جدید',
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  )
}
