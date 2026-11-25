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
      <main className="auth-scene relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-10">
        <div aria-hidden className="auth-blob pointer-events-none absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div aria-hidden className="auth-blob auth-blob-slow pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="auth-enter relative w-full max-w-md">
          <Card className="w-full text-center shadow-xl shadow-primary/5 ring-1 ring-black/5">
            <CardHeader>
              <span className="auth-pop mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/15 text-green-600">
                <MailCheck className="h-7 w-7" aria-hidden />
              </span>
              <CardTitle>ایمیل تأیید ارسال شد</CardTitle>
              <CardDescription>
                برای فعال‌سازی حساب، صندوق ورودی {email ? `«${email}»` : 'خود'} را بررسی کنید
                و روی لینک تأیید کلیک کنید؛ پس از تأیید، صفحه خوش‌آمد باز می‌شود و از صفحه ورود استفاده کنید.
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="auth-scene relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="auth-blob pointer-events-none absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="auth-blob auth-blob-slow pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
      <Suspense>
        <RegisterForm />
      </Suspense>
    </main>
  )
}
