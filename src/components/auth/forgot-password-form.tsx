'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validation/client-schemas'

export function ForgotPasswordForm() {
  const [sentUrl, setSentUrl] = useState<string | null>(null)
  const [sentMessage, setSentMessage] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) })

  async function onSubmit(values: ForgotPasswordInput) {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        setError('root', { message: data.error ?? 'عملیات ناموفق بود' })
        return
      }
      setSentMessage(data.message ?? 'درخواست ثبت شد.')
      setSentUrl(data.resetUrl ?? null)
    } catch {
      setError('root', { message: 'خطای شبکه؛ دوباره تلاش کنید' })
    }
  }

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">بازیابی رمز عبور</CardTitle>
        <CardDescription>ایمیل حساب خود را وارد کنید تا لینک بازیابی ارسال شود</CardDescription>
      </CardHeader>
      <CardContent>
        {sentUrl ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-green-500/10 p-4 text-sm leading-6 text-green-700 dark:text-green-400">
              <MailCheck className="mt-1 h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p>{sentMessage}</p>
                <a href={sentUrl} className="mt-2 block break-all font-medium underline" dir="ltr">
                  {sentUrl}
                </a>
                <p className="mt-2 text-xs opacity-80">
                  (این رفتار فقط در حالت پیش‌نمایش محلی است؛ در استقرار واقعی با Supabase، لینک به‌صورت ایمیل ارسال می‌شود.)
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">بازگشت به ورود</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">ایمیل</Label>
              <Input id="email" type="email" dir="ltr" autoComplete="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            {errors.root && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errors.root.message}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden />}
              ارسال لینک بازیابی
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">بازگشت به ورود</Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
