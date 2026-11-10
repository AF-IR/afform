import Link from 'next/link'
import { Mail, Phone, Send, MessageCircle, Instagram, Twitter } from 'lucide-react'
import { getContactChannels, getSupportHours } from '@/lib/site'

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  phone: Phone,
  telegram: Send,
  whatsapp: MessageCircle,
  instagram: Instagram,
  x: Twitter,
}

/**
 * Renders the public contact channels configured via NEXT_PUBLIC_* env vars.
 * When a channel is not configured it is simply omitted — no fake data.
 */
export function FooterContactLinks({ compact = false }: { compact?: boolean }) {
  const channels = getContactChannels()
  const hours = getSupportHours()

  if (channels.length === 0) {
    return (
      <p className="text-xs leading-6 text-muted-foreground">
        راه‌های ارتباطی از طریق صفحه «درباره ما» در دسترس است.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {channels.map((c) => {
        const Icon = CHANNEL_ICON[c.id] ?? Mail
        return (
          <a
            key={c.id}
            href={c.href}
            target={c.href.startsWith('mailto:') || c.href.startsWith('tel:') ? undefined : '_blank'}
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="font-medium text-foreground">{c.label}:</span>{' '}
              <span dir="ltr" className="inline-block">{c.value}</span>
            </span>
          </a>
        )
      })}
      {!compact && hours && (
        <p className="pt-1 text-xs text-muted-foreground">ساعات پاسخ‌گویی: {hours}</p>
      )}
      {!compact && (
        <Link href="/about" className="block pt-1 text-xs font-bold text-primary hover:underline">
          درباره آرشام فرم ←
        </Link>
      )}
    </div>
  )
}
