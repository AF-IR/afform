import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

/** Production default: aflab.vercel.app (override with NEXT_PUBLIC_SITE_URL). */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aflab.vercel.app'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#131318' },
  ],
}

const BRAND_ICONS = {
  icon: [
    { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    { url: '/logo-192.png', sizes: '192x192', type: 'image/png' },
    { url: '/brand/logo-mark.svg', type: 'image/svg+xml' },
  ],
  apple: '/apple-touch-icon.png',
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'آرشام فرم | سامانه طراحی پرسشنامه و آزمون آنلاین',
    template: '%s | آرشام فرم',
  },
  description:
    'آرشام فرم: بدون کدنویسی فرم بسازید، آزمون برگزار کنید و پاسخ‌ها را در داشبورد تحلیل کنید. پرسشنامه، نظرسنجی، آزمون آنلاین و فرم‌های جمع‌آوری اطلاعات با لینک اختصاصی.',
  keywords: ['فرم ساز', 'پرسشنامه آنلاین', 'آزمون آنلاین', 'نظرسنجی', 'آرشام فرم', 'Arsham Form'],
  manifest: '/manifest.webmanifest',
  icons: BRAND_ICONS,
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    url: siteUrl,
    siteName: 'آرشام فرم',
    title: 'آرشام فرم | فرم بساز، آزمون برگزار کن، پاسخ‌ها را تحلیل کن',
    description:
      'پلتفرم آنلاین طراحی پرسشنامه، آزمون و فرم جمع‌آوری اطلاعات — بدون نیاز به دانش برنامه‌نویسی.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'آرشام فرم' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'آرشام فرم | سامانه طراحی پرسشنامه و آزمون آنلاین',
    description: 'فرم بساز، آزمون برگزار کن، پاسخ‌ها را تحلیل کن.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="top-center" richColors dir="rtl" />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
