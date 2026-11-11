import { Badge } from '@/components/ui/badge'
import { isSupabaseConfigured } from '@/lib/env'

/** Honest backend-mode indicator: Supabase (production) or local preview (SQLite). */
export function BackendModeBadge() {
  const supabase = isSupabaseConfigured()
  return (
    <div className="text-xs leading-5">
      {supabase ? (
        <Badge variant="default" className="bg-green-600">متصل به Supabase</Badge>
      ) : (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 max-w-56">
          <Badge variant="secondary" className="mb-1 border-amber-500/50 text-amber-700 dark:text-amber-400">
            حالت پیش‌نمایش محلی
          </Badge>
          <p>
            داده‌ها فقط در همین سرور (SQLite) ذخیره می‌شوند. برای اجرای واقعی، Supabase را طبق راهنمای استقرار تنظیم کنید.
          </p>
        </div>
      )}
    </div>
  )
}
