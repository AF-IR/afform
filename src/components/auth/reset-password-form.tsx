'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validation/client-schemas'

export function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  async function onSubmit(values: ResetPasswordInput) {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, token: token ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError('root', { message: data.error ?? 'عملیات ناموفق بود' })
        return
      }
      toast.success('رمز عبور تغییر کرد؛ اکنون وارد شوید.')
      router.push('/login')
    } catch {
      setError('root', { message: 'خطای شبکه؛ دوباره تلاش کنید' })
    }
  }

  if (!token && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Supabase mode without token: the recovery link creates a session via /auth/callback
  }

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">تعیین رمز عبور جدید</CardTitle>
        <CardDescription>
          {token ? 'رمز عبور جدید خود را وارد کنید' : 'نشست بازیابی شما فعال است؛ رمز جدید را تعیین کنید'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="password">رمز عبور جدید</Label>
            <Input id="password" type="password" dir="ltr" autoComplete="new-password" placeholder="حداقل ۸ نویسه" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تکرار رمز عبور جدید</Label>
            <Input id="confirmPassword" type="password" dir="ltr" autoComplete="new-password" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          {errors.root && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errors.root.message}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden />}
            تغییر رمز عبور
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">بازگشت به ورود</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
