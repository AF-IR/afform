import { Skeleton } from '@/components/ui/skeleton'

/**
 * Soft skeleton for docs/use-cases pages — mirrors the final layout so the
 * arriving content swaps in place instead of jumping (prefers-reduced-motion
 * is respected by the fade-up keyframes in globals.css).
 */
export function ContentPageSkeleton({ withSidebar = false }: { withSidebar?: boolean }) {
  return (
    <div
      aria-busy="true"
      aria-label="در حال بارگذاری صفحه"
      className={withSidebar ? 'flex gap-10' : ''}
    >
      {withSidebar && (
        <div className="hidden w-60 shrink-0 space-y-2 md:block">
          <Skeleton className="h-4 w-20" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" style={{ animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  )
}
