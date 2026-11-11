'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard, LayoutTemplate, FileStack, LogOut, Menu,
  Moon, Plus, Settings, Sun, User, BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { BrandMark } from '@/components/layout/site-header'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'نمای کلی', icon: LayoutDashboard },
  { href: '/dashboard/forms', label: 'فرم‌های من', icon: FileStack },
  { href: '/dashboard/forms/new', label: 'ایجاد فرم جدید', icon: Plus },
  { href: '/dashboard/templates', label: 'قالب‌های آماده', icon: LayoutTemplate },
  { href: '/dashboard/profile', label: 'پروفایل و تنظیمات', icon: User },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1" aria-label="ناوبری داشبورد">
      {NAV.map((item) => {
        const active = item.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  async function logout() {
    setLoading(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }
  return (
    <Button variant="ghost" className={cn('w-full justify-start gap-3 text-muted-foreground hover:text-destructive', className)} onClick={logout} disabled={loading}>
      {loading ? <BarChart3 className="h-4.5 w-4.5 animate-pulse" aria-hidden /> : <LogOut className="h-4.5 w-4.5" aria-hidden />}
      خروج از حساب
    </Button>
  )
}

export function DashboardShell({
  user,
  children,
}: {
  user: { displayName: string; email: string }
  children: React.ReactNode
}) {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen w-full">
      {/* desktop sidebar (RTL: right side) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-l bg-sidebar p-4 lg:flex" aria-label="منوی داشبورد">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-2 text-base font-extrabold">
          <BrandMark />
          آرشام فرم
        </Link>
        <NavLinks />
        <div className="mt-auto space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Sun className="h-4.5 w-4.5 dark:hidden" aria-hidden />
            <Moon className="hidden h-4.5 w-4.5 dark:block" aria-hidden />
            تغییر تم
          </Button>
          <div className="rounded-lg border bg-card p-3">
            <p className="truncate text-sm font-semibold">{user.displayName}</p>
            <p className="truncate text-xs text-muted-foreground" dir="ltr">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="باز کردن منو">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-4">
                <SheetTitle className="text-right">داشبورد</SheetTitle>
                <div className="mt-2 flex h-[calc(100%-3rem)] flex-col">
                  <NavLinks onNavigate={() => setOpen(false)} />
                  <div className="mt-auto">
                    <LogoutButton />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/dashboard" className="flex items-center gap-2 font-extrabold">
              <BrandMark className="h-8 w-8" />
              آرشام فرم
            </Link>
          </div>
          <Link href="/dashboard/forms/new" aria-label="فرم جدید">
            <Button size="sm">
              <Plus className="h-4 w-4" aria-hidden />
              فرم جدید
            </Button>
          </Link>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>

        <footer className="mt-auto border-t px-6 py-3 text-center text-xs text-muted-foreground">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground">
            <Settings className="hidden h-3 w-3" aria-hidden />
            آرشام فرم — سامانه طراحی پرسشنامه و آزمون آنلاین
          </Link>
        </footer>
      </div>
    </div>
  )
}
