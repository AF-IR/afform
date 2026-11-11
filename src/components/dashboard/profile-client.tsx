'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { KeyRound, Loader2, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { changePasswordSchema, profileSchema, type ChangePasswordInput, type ProfileInput } from '@/lib/validation/client-schemas'
import { faDate } from '@/lib/persian'
import { BackendModeBadge } from '@/components/dashboard/mode-badge'

export function ProfileClient({
  user,
}: {
  user: { id: string; displayName: string; email: string; emailVerified: boolean; createdAt: string }
}) {
  const router = useRouter()

  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: user.displayName },
  })

  const passwordForm = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) })

  async function saveProfile(values: ProfileInput) {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error ?? 'به‌روزرسانی ناموفق بود')
    toast.success('پروفایل به‌روزرسانی شد')
    router.refresh()
  }

  async function changePassword(values: ChangePasswordInput) {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error ?? 'تغییر رمز ناموفق بود')
    toast.success('رمز عبور تغییر کرد')
    passwordForm.reset()
  }

  const initial = user.displayName.trim().charAt(0) || '؟'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">پروفایل و تنظیمات حساب</h1>
        <p className="mt-1 text-sm text-muted-foreground">اطلاعات حساب و امنیت</p>
      </div>

      {/* account summary */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-6">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-extrabold text-primary" aria-hidden>
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold">{user.displayName}</p>
              {user.emailVerified ? (
                <Badge variant="default" className="bg-green-600">ایمیل تأییدشده</Badge>
              ) : (
                <Badge variant="secondary">ایمیل تأییدنشده</Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground" dir="ltr">{user.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">تاریخ ایجاد حساب: {faDate(user.createdAt)}</p>
          </div>
          <BackendModeBadge />
        </CardContent>
      </Card>

      {/* display name */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" aria-hidden />نام نمایشی</CardTitle>
          <CardDescription>این نام در داشبورد و داشبورد سازنده فرم نمایش داده می‌شود</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(saveProfile)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="displayName">نام نمایشی</Label>
              <Input id="displayName" {...profileForm.register('displayName')} />
              {profileForm.formState.errors.displayName && (
                <p className="text-xs text-destructive">{profileForm.formState.errors.displayName.message}</p>
              )}
            </div>
            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden />}
              ذخیره
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* change password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" aria-hidden />تغییر رمز عبور</CardTitle>
          <CardDescription>رمز عبور جدید حداقل ۸ نویسه باشد</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
              <Input id="currentPassword" type="password" dir="ltr" autoComplete="current-password" {...passwordForm.register('currentPassword')} />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">رمز عبور جدید</Label>
              <Input id="newPassword" type="password" dir="ltr" autoComplete="new-password" {...passwordForm.register('newPassword')} />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
              {passwordForm.formState.isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden />}
              تغییر رمز عبور
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
