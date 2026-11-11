import Link from 'next/link'
import { BrandMark } from '@/components/layout/site-header'
import { FooterContactLinks } from '@/components/layout/footer-contact-links'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-muted/40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5 font-extrabold">
            <BrandMark className="h-8 w-8" />
            آرشام فرم
          </div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            سامانه طراحی پرسشنامه و آزمون آنلاین — فرم بساز، آزمون برگزار کن، پاسخ‌ها را تحلیل کن.
          </p>
          <div className="mt-4">
            <h2 className="text-sm font-bold">ارتباط با ما</h2>
            <div className="mt-3">
              <FooterContactLinks />
            </div>
          </div>
        </div>

        <nav aria-label="محصول">
          <h2 className="text-sm font-bold">محصول</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/features" className="hover:text-foreground">قابلیت‌ها</Link></li>
            <li><Link href="/templates" className="hover:text-foreground">قالب‌های آماده</Link></li>
            <li><Link href="/plans" className="hover:text-foreground">پلن‌ها</Link></li>
            <li><Link href="/register" className="hover:text-foreground">ثبت‌نام رایگان</Link></li>
          </ul>
        </nav>

        <nav aria-label="راهنما">
          <h2 className="text-sm font-bold">راهنما</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/faq" className="hover:text-foreground">پرسش‌های متداول</Link></li>
            <li><Link href="/about" className="hover:text-foreground">درباره ما</Link></li>
            <li><Link href="/login" className="hover:text-foreground">ورود به حساب</Link></li>
            <li><Link href="/dashboard" className="hover:text-foreground">داشبورد</Link></li>
          </ul>
        </nav>

        <nav aria-label="قوانین">
          <h2 className="text-sm font-bold">قوانین</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/terms" className="hover:text-foreground">شرایط استفاده</Link></li>
            <li><Link href="/privacy-policy" className="hover:text-foreground">حریم خصوصی</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date())} آرشام فرم — همه حقوق محفوظ است.
      </div>
    </footer>
  )
}
