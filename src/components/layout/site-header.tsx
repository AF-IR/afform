'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import {
  Menu, Moon, Sun, ChevronDown, FilePlus2, LayoutTemplate, FileStack,
  BarChart3, Sparkles, CircleHelp, ShieldCheck, Download, Zap,
  Info, ScrollText, Lock, Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FooterContactLinks } from '@/components/layout/footer-contact-links'

/** Real brand mark from the repository (public/brand/logo-mark.svg). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/logo-mark.svg"
      alt=""
      aria-hidden
      className={cn('h-9 w-9 shrink-0 select-none rounded-xl', className)}
      draggable={false}
    />
  )
}

const PRODUCT_ITEMS = [
  { href: '/dashboard/forms/new', icon: FilePlus2, title: 'سازنده فرم', desc: '۲۲ نوع سؤال، منطق شرطی و پیش‌نمایش زنده' },
  { href: '/dashboard/templates', icon: LayoutTemplate, title: 'قالب‌های آماده', desc: '۱۰ قالب کاربردی برای شروع سریع' },
  { href: '/dashboard/forms', icon: FileStack, title: 'مدیریت پاسخ‌ها', desc: 'جست‌وجو، فیلتر و حذف پاسخ‌های دریافتی' },
  { href: '/features', icon: BarChart3, title: 'گزارش و تحلیل', desc: 'نمودارهای مبتنی بر داده واقعی' },
  { href: '/features', icon: Sparkles, title: 'انواع سؤال', desc: 'از متن کوتاه تا ماتریس و بارگذاری فایل' },
  { href: '/faq', icon: CircleHelp, title: 'پرسش‌های متداول', desc: 'پاسخ سؤال‌های رایج درباره سرویس' },
]

const RESOURCES = [
  { href: '/about', icon: Info, title: 'درباره آرشام فرم', desc: 'معرفی محصول و اهداف آن' },
  { href: '/templates', icon: LayoutTemplate, title: 'قالب‌های آماده', desc: 'مرور همه ۱۰ قالب در ۵ دسته' },
  { href: '/plans', icon: Zap, title: 'پلن‌های استفاده', desc: 'پلن رایگان فعلی و امکانات پیش‌رو' },
  { href: '/faq', icon: CircleHelp, title: 'پرسش‌های متداول', desc: 'پاسخ سؤال‌های رایج درباره سرویس' },
  { href: '/terms', icon: ScrollText, title: 'شرایط استفاده', desc: 'قواعد استفاده از سرویس' },
  { href: '/privacy-policy', icon: Lock, title: 'حریم خصوصی', desc: 'نحوه حفاظت از داده‌ها' },
]

const HIGHLIGHTS = [
  { icon: Zap, label: 'بدون کدنویسی' },
  { icon: ShieldCheck, label: 'امنیت در سطح دیتابیس' },
  { icon: Download, label: 'خروجی CSV / Excel / JSON' },
]

type OpenMenu = 'product' | 'resources' | null

export function SiteHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState<OpenMenu>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { theme, setTheme } = useTheme()

  // close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenu(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setMenu(null), 120)
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-extrabold text-foreground transition-opacity hover:opacity-90"
          aria-label="آرشام فرم — صفحه اصلی"
          onMouseEnter={() => setMenu(null)}
        >
          <BrandMark />
          <span>آرشام فرم</span>
        </Link>

        {/* desktop navigation with mega menu */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="ناوبری اصلی">
          {/* mega: محصولات */}
          <div className="relative" onMouseEnter={() => { cancelClose(); setMenu('product') }} onMouseLeave={scheduleClose}>
            <button
              type="button"
              aria-expanded={menu === 'product'}
              onClick={() => setMenu(menu === 'product' ? null : 'product')}
              className={cn(
                'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                menu === 'product' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              محصولات
              <ChevronDown className={cn('h-4 w-4 transition-transform', menu === 'product' && 'rotate-180')} aria-hidden />
            </button>
          </div>

          <Link
            href="/templates"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            onMouseEnter={() => setMenu(null)}
          >
            قالب‌های آماده
          </Link>
          <Link
            href="/plans"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            onMouseEnter={() => setMenu(null)}
          >
            پلن‌ها
          </Link>

          {/* mega: منابع */}
          <div className="relative" onMouseEnter={() => { cancelClose(); setMenu('resources') }} onMouseLeave={scheduleClose}>
            <button
              type="button"
              aria-expanded={menu === 'resources'}
              onClick={() => setMenu(menu === 'resources' ? null : 'resources')}
              className={cn(
                'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                menu === 'resources' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              منابع
              <ChevronDown className={cn('h-4 w-4 transition-transform', menu === 'resources' && 'rotate-180')} aria-hidden />
            </button>
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}
          >
            <Sun className="h-5 w-5 dark:hidden" />
            <Moon className="hidden h-5 w-5 dark:block" />
          </Button>

          {isAuthenticated ? (
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/dashboard">داشبورد</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/login">ورود</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link href="/register">ثبت‌نام رایگان</Link>
              </Button>
            </>
          )}

          {/* mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="باز کردن منو">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto">
              <SheetTitle className="flex items-center gap-2 text-right">
                <BrandMark className="h-8 w-8" />
                آرشام فرم
              </SheetTitle>
              <nav className="mt-4 flex flex-col gap-4" aria-label="ناوبری موبایل">
                <section>
                  <p className="mb-1 px-3 text-xs font-bold text-muted-foreground">محصولات</p>
                  {PRODUCT_ITEMS.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
                    >
                      <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span>
                        {item.title}
                        <span className="block text-xs font-normal text-muted-foreground">{item.desc}</span>
                      </span>
                    </Link>
                  ))}
                </section>
                <section>
                  <p className="mb-1 px-3 text-xs font-bold text-muted-foreground">منابع</p>
                  {RESOURCES.map((r) => (
                    <Link
                      key={r.href}
                      href={r.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
                    >
                      <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span>
                        {r.title}
                        <span className="block text-xs font-normal text-muted-foreground">{r.desc}</span>
                      </span>
                    </Link>
                  ))}
                </section>
                <div className="border-t" />
                {isAuthenticated ? (
                  <Button asChild>
                    <Link href="/dashboard" onClick={() => setOpen(false)}>داشبورد</Link>
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button asChild variant="outline">
                      <Link href="/login" onClick={() => setOpen(false)}>ورود</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/register" onClick={() => setOpen(false)}>ثبت‌نام رایگان</Link>
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* mega menu panel — محصول */}
        <div
          className={cn(
            'absolute inset-x-0 top-full hidden md:block',
            menu === 'product' ? 'pointer-events-auto' : 'pointer-events-none',
          )}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          aria-hidden={menu !== 'product'}
        >
          <div
            className={cn(
              'mx-4 mt-2 origin-top rounded-2xl border bg-popover p-6 shadow-xl transition-all duration-150',
              menu === 'product' ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0',
            )}
          >
            <div className="grid grid-cols-3 gap-x-6 gap-y-1">
              {PRODUCT_ITEMS.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={() => setMenu(null)}
                  className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-accent"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <item.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4">
              {HIGHLIGHTS.map((h) => (
                <span key={h.label} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <h.icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {h.label}
                </span>
              ))}
              <Link href="/features" onClick={() => setMenu(null)} className="mr-auto text-xs font-bold text-primary hover:underline">
                مشاهده همه قابلیت‌ها ←
              </Link>
            </div>
          </div>
        </div>

        {/* mega menu panel — منابع */}
        <div
          className={cn(
            'absolute inset-x-0 top-full hidden md:block',
            menu === 'resources' ? 'pointer-events-auto' : 'pointer-events-none',
          )}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          aria-hidden={menu !== 'resources'}
        >
          <div
            className={cn(
              'mx-4 mt-2 origin-top rounded-2xl border bg-popover p-6 shadow-xl transition-all duration-150',
              menu === 'resources' ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0',
            )}
          >
            <div className="grid grid-cols-[2fr_1fr] gap-6">
              {/* links grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {RESOURCES.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    onClick={() => setMenu(null)}
                    className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-accent"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <r.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-bold">{r.title}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{r.desc}</span>
                    </span>
                  </Link>
                ))}
              </div>

              {/* contact card */}
              <div className="rounded-xl border bg-card p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  <Mail className="h-4 w-4 text-primary" aria-hidden />
                  ارتباط با ما
                </p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  برای پرسش‌ها، گزارش مشکل یا همکاری با تیم آرشام فرم در تماس باشید.
                </p>
                <nav className="mt-3 space-y-2" aria-label="کانال‌های ارتباطی">
                  <FooterContactLinks />
                </nav>
                <Link
                  href="/about"
                  onClick={() => setMenu(null)}
                  className="mt-4 block rounded-lg bg-primary/10 px-3 py-2 text-center text-xs font-bold text-primary transition-colors hover:bg-primary/20"
                >
                  اطلاعات کامل تماس در «درباره ما» ←
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
