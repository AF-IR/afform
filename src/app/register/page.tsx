import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MailCheck } from 'lucide-react'
import { RegisterForm } from '@/components/auth/register-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth/service'

export const metadata: Metadata = {
  title: 'ثبت‌نام',
  description: 'ساخت حساب کاربری رایگان در آرشام فرم.',
  robots: { index: true, follow: true },
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string; email?: string }>
}) {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')
  const { confirm, email } = await searchParams

  if (confirm === '1') {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md text-center shadow-sm">
          <CardHeader>
            <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/15 text-green-600">
              <MailCheck className="h-6 w-6" aria-hidden />
            </span>
            <CardTitle>ایمیل تأیید ارسال شد</CardTitle>
            <CardDescription>
              برای فعال‌سازی حساب، صندوق ورودی {email ? `«${email}»` : 'خود'} را بررسی کنید
              و روی لینک تأیید کلیک کنید. سپس وارد شوید.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </main>
  )
}
