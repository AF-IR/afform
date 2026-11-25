'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { BrandMark } from '@/components/layout/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSchema, type LoginInput } from '@/lib/validation/client-schemas'

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginInput) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        setError('root', { message: data.error ?? 'ورود ناموفق بود' })
        return
      }
      toast.success('خوش آمدید!')
      const next = params.get('next')
      router.push(next && next.startsWith('/') ? next : '/dashboard')
      router.refresh()
    } catch {
      setError('root', { message: 'خطای شبکه؛ دوباره تلاش کنید' })
    }
  }

  return (
    <div className="auth-enter relative w-full max-w-md">
      <Card className="w-full shadow-xl shadow-primary/5 ring-1 ring-black/5">
        <CardHeader className="items-center text-center">
          <span className="relative mx-auto mb-2 flex h-16 w-16 items-center justify-center">
            {/* soft breathing glow behind the brand mark */}
            <span aria-hidden className="brand-glow absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
            <span className="auth-pop relative flex h-16 w-16 items-center justify-center rounded-2xl border bg-card shadow-sm">
              <BrandMark className="h-11 w-11" />
            </span>
          </span>
          <CardTitle className="text-xl">ورود به آرشام فرم</CardTitle>
          <CardDescription>با ایمیل و رمز عبور خود وارد شوید</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="auth-stagger">
            {params.get('error') === 'callback' && (
              <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                تأیید ورود ناموفق بود؛ دوباره تلاش کنید.
              </p>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">ایمیل</Label>
                <Input id="email" type="email" dir="ltr" autoComplete="email" placeholder="you@example.com" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">رمز عبور</Label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    فراموشی رمز عبور؟
                  </Link>
                </div>
                <Input id="password" type="password" dir="ltr" autoComplete="current-password" {...register('password')} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              {errors.root && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errors.root.message}</p>}
              <Button type="submit" className="auth-lift w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden />}
                {isSubmitting ? 'در حال ورود…' : 'ورود'}
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              حساب کاربری ندارید؟{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                ثبت‌نام کنید
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* trust strip — real product facts, appears last */}
      <div className="auth-fade mt-5 flex items-center justify-center gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
          احراز هویت امن
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          ساخت پرسش‌نامه با هوش مصنوعی
        </span>
      </div>
    </div>
  )
}
