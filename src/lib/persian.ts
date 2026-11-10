/** Persian (fa-IR) formatting helpers — digits, numbers, dates (Jalali via Intl). */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)])
}

export function faNumber(n: number | null | undefined, opts?: Intl.NumberFormatOptions): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  try {
    return new Intl.NumberFormat('fa-IR', opts).format(n)
  } catch {
    return String(n)
  }
}

export function faDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric', month: 'long', day: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(d)
  } catch {
    return iso
  }
}

export function faRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const diffMs = Date.now() - d.getTime()
    const rtf = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' })
    const min = Math.round(diffMs / 60000)
    if (Math.abs(min) < 60) return rtf.format(-min, 'minute')
    const hours = Math.round(min / 60)
    if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour')
    const days = Math.round(hours / 24)
    if (Math.abs(days) < 30) return rtf.format(-days, 'day')
    return faDate(iso)
  } catch {
    return iso ?? '—'
  }
}

export function faDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${toFaDigits(m)}:${String(sec).padStart(2, '0')}`
}
