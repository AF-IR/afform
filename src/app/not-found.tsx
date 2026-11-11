import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { getCurrentUser } from '@/lib/auth/service'

export const metadata: Metadata = {
  title: 'صفحه یافت نشد',
  robots: { index: false, follow: false },
}

export default async function NotFound() {
  const user = await getCurrentUser()
  return (
    <>
      <SiteHeader isAuthenticated={Boolean(user)} />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <p className="text-7xl font-extrabold text-primary">۴۰۴</p>
        <h1 className="text-2xl font-extrabold">صفحه موردنظر پیدا نشد</h1>
        <p className="max-w-md leading-7 text-muted-foreground">
          آدرس واردشده اشتباه است یا صفحه حذف/جابه‌جا شده است.
          اگر به دنبال یک فرم عمومی هستید، لینک آن را از سازنده فرم بخواهید.
        </p>
        <div className="flex gap-3">
          <Link href="/" className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground">
            صفحه اصلی
          </Link>
          <Link href="/dashboard" className="rounded-lg border px-6 py-2.5 font-medium">
            داشبورد
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
