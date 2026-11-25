import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, CheckCircle2, LogIn, MailCheck } from 'lucide-react'
import { BrandMark } from '@/components/layout/site-header'

/**
 * Landing page after Supabase email confirmation.
 * Supabase redirects to /auth/callback?next=/auth/welcome — the account is
 * confirmed at that point, so this page welcomes the new user and clearly
 * guides them to the login page (the confirmation link does NOT sign in).
 * Simple, focused, and deliberately outside the indexed site map (robots).
 */
export const metadata: Metadata = {
  title: 'ثبت‌نام انجام شد — خوش آمدید',
  description: 'حساب شما در آرشام فرم با موفقیت فعال شد؛ اکنون وارد شوید.',
  robots: { index: false, follow: false },
}

export default function AuthWelcomePage() {
  return (
    <main className="auth-scene relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-16">
      {/* soft ambient blobs — same visual language as login, no sudden jumps */}
      <div aria-hidden className="pointer-events-none absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-primary/15 blur-3xl auth-blob" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl auth-blob auth-blob-slow" />

      <div className="auth-enter relative w-full max-w-lg">
        <div className="rounded-2xl border bg-card/90 p-8 text-center shadow-xl shadow-primary/5 backdrop-blur-sm sm:p-10">
          <div className="auth-pop mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
            <MailCheck className="h-8 w-8" aria-hidden />
          </div>

          <h1 className="text-2xl font-extrabold leading-relaxed">
            ثبت‌نام انجام شد — خوش آمدید!
          </h1>

          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            حساب کاربری شما با موفقیت تأیید و فعال شد. حالا فقط کافی است با همان ایمیل و رمز عبور وارد شوید تا
            پرسش‌نامه‌ها و آزمون‌های خود را بسازید.
          </p>

          <div className="mt-6 rounded-xl border bg-muted/40 p-4 text-right text-sm leading-6">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
              <span>ایمیل شما تأیید شد و حساب شما آماده استفاده است.</span>
            </p>
            <p className="mt-2 flex items-start gap-2">
              <LogIn className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>برای ادامه، از صفحه ورود استفاده کنید.</span>
            </p>
          </div>

          <Link
            href="/login"
            className="auth-lift mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-bold text-primary-foreground shadow-md shadow-primary/25 transition-colors hover:bg-primary/90"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            رفتن به صفحه ورود
          </Link>

          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            بازگشت به صفحه اصلی
          </Link>
        </div>

        <div className="auth-fade mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <BrandMark className="h-5 w-5" />
          <span>آرشام فرم — ساخت پرسش‌نامه و آزمون آنلاین</span>
        </div>
      </div>
    </main>
  )
}
