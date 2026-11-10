/**
 * Site-wide configuration — single source of truth for brand, SEO base URL
 * and public contact channels.
 *
 * Values marked `NEXT_PUBLIC_*` are read at build time on both client and
 * server; empty defaults mean «not configured» and the UI gracefully hides
 * those channels. Fill them in `.env.local` / Vercel Project Settings.
 */

function env(name: string): string {
  const v = process.env[name]
  return typeof v === 'string' ? v.trim() : ''
}

/** Production base URL — aflab.vercel.app is the canonical default. */
export const SITE_URL =
  env('NEXT_PUBLIC_SITE_URL') || 'https://aflab.vercel.app'

export const SITE_NAME = 'آرشام فرم'
export const SITE_TAGLINE = 'سامانه طراحی پرسشنامه و آزمون آنلاین'

export interface ContactChannel {
  id: string
  label: string
  /** Display value, e.g. the e-mail address or @handle. */
  value: string
  /** Absolute href (mailto:, https://t.me/…, …). */
  href: string
}

/** Read public contact channels from env — only non-empty ones are returned. */
export function getContactChannels(): ContactChannel[] {
  const channels: ContactChannel[] = []

  const email = env('NEXT_PUBLIC_SUPPORT_EMAIL')
  if (email) channels.push({ id: 'email', label: 'ایمیل پشتیبانی', value: email, href: `mailto:${email}` })

  const phone = env('NEXT_PUBLIC_CONTACT_PHONE')
  if (phone) channels.push({ id: 'phone', label: 'تلفن تماس', value: phone, href: `tel:${phone.replace(/[^\d+]/g, '')}` })

  const telegram = env('NEXT_PUBLIC_TELEGRAM')
  if (telegram) {
    const handle = telegram.replace(/^@/, '')
    channels.push({ id: 'telegram', label: 'تلگرام', value: `@${handle}`, href: `https://t.me/${handle}` })
  }

  const whatsapp = env('NEXT_PUBLIC_WHATSAPP')
  if (whatsapp) {
    const digits = whatsapp.replace(/\D/g, '')
    channels.push({ id: 'whatsapp', label: 'واتس‌اپ', value: whatsapp, href: `https://wa.me/${digits}` })
  }

  const instagram = env('NEXT_PUBLIC_INSTAGRAM')
  if (instagram) {
    const handle = instagram.replace(/^@/, '')
    channels.push({ id: 'instagram', label: 'اینستاگرام', value: `@${handle}`, href: `https://instagram.com/${handle}` })
  }

  const xTwitter = env('NEXT_PUBLIC_X_TWITTER')
  if (xTwitter) {
    const handle = xTwitter.replace(/^@/, '')
    channels.push({ id: 'x', label: 'ایکس (توییتر)', value: `@${handle}`, href: `https://x.com/${handle}` })
  }

  return channels
}

/** Optional one-line support availability note, e.g. «شنبه تا پنجشنبه، ۹ تا ۱۷». */
export function getSupportHours(): string {
  return env('NEXT_PUBLIC_SUPPORT_HOURS')
}
