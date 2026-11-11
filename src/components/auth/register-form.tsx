'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { BrandMark } from '@/components/layout/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { registerSchema, type RegisterInput } from '@/lib/validation/client-schemas'

export function RegisterForm() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    watch,
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  async function onSubmit(values: RegisterInput) {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        setError('root', { message: data.error ?? 'ثبت‌نام ناموفق بود' })
        return
      }
      if (data.needsEmailConfirmation) {
        router.push(`/register?confirm=1&email=${encodeURIComponent(values.email)}`)
        return
      }
      // local preview mode: log in directly after successful registration
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password }),
      })
      if (loginRes.ok) {
        toast.success('حساب شما ساخته شد. خوش آمدید!')
        router.push('/dashboard')
        router.refresh()
      } else {
        toast.success('حساب شما ساخته شد؛ اکنون وارد شوید.')
        router.push('/login')
      }
    } catch {
      setError('root', { message: 'خطای شبکه؛ دوباره تلاش کنید' })
    }
  }

  const acceptTerms = watch('acceptTerms')

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="items-center text-center">
        <BrandMark className="mx-auto mb-2 h-14 w-14" />
        <CardTitle className="text-xl">ساخت حساب کاربری</CardTitle>
        <CardDescription>رایگان شروع کنید — کمتر از یک دقیقه</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="displayName">نام نمایشی</Label>
            <Input id="displayName" autoComplete="name" placeholder="مثلاً: آرشام محمدی" {...register('displayName')} />
            {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">ایمیل</Label>
            <Input id="email" type="email" dir="ltr" autoComplete="email" placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">رمز عبور</Label>
            <Input id="password" type="password" dir="ltr" autoComplete="new-password" placeholder="حداقل ۸ نویسه" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تکرار رمز عبور</Label>
            <Input id="confirmPassword" type="password" dir="ltr" autoComplete="new-password" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          <label className="flex items-start gap-2 text-sm leading-6" htmlFor="acceptTerms">
            <Checkbox
              id="acceptTerms"
              checked={acceptTerms === true}
              onCheckedChange={(v) => setValue('acceptTerms', v === true, { shouldValidate: true })}
            />
            <span>
              <Link href="/terms" target="_blank" className="text-primary hover:underline">شرایط استفاده</Link> و{' '}
              <Link href="/privacy-policy" target="_blank" className="text-primary hover:underline">سیاست حریم خصوصی</Link> را می‌پذیرم.
            </span>
          </label>
          {errors.acceptTerms && <p className="text-xs text-destructive">{errors.acceptTerms.message}</p>}
          {errors.root && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errors.root.message}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden />}
            ثبت‌نام
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            وارد شوید
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
