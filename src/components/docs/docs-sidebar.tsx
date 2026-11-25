'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DOC_PAGES, docHref } from '@/lib/docs/content'
import { DocIcon } from '@/components/docs/doc-icon'

/**
 * Sidebar navigation for the documentation section — real internal links
 * between all doc pages (good for SEO crawling and for users).
 */
export function DocsSidebar() {
  const pathname = usePathname()
  return (
    <nav aria-label="فهرست مستندات" className="space-y-1">
      <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">مستندات</p>
      <Link
        href="/docs"
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/docs' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        <DocIcon name="BookOpen" className="h-4 w-4 shrink-0" />
        نمای کلی
      </Link>
      {DOC_PAGES.map((d) => {
        const href = docHref(d.slug)
        const active = pathname === href
        return (
          <Link
            key={d.slug}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <DocIcon name={d.icon} className="h-4 w-4 shrink-0" />
            {d.title}
          </Link>
        )
      })}
    </nav>
  )
}
