import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Shared skeleton screens — soft loading placeholders so pages never "jump"
 * in when data arrives (server components show these during streaming).
 */

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="در حال بارگذاری داشبورد">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="در حال بارگذاری">
      <Skeleton className="h-9 w-44" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Card key={i} className="fade-up" style={{ animationDelay: `${i * 55}ms` }}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="در حال بارگذاری">
      <Skeleton className="h-9 w-64" />
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <Card>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="در حال بارگذاری">
      <Skeleton className="h-9 w-56" />
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="space-y-0">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3.5 last:border-b-0">
                <Skeleton className="h-4 w-28 shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="hidden h-4 w-20 sm:block" />
                <Skeleton className="hidden h-4 w-16 md:block" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function PublicFormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-5" aria-busy="true" aria-label="در حال بارگذاری فرم">
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
      {[0, 1, 2].map((i) => (
        <Card key={i} className="fade-up" style={{ animationDelay: `${i * 80}ms` }}>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
