import type { MetadataRoute } from 'next'

/** Production default: aflab.vercel.app (override with NEXT_PUBLIC_SITE_URL). */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aflab.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',   // داشبورد خصوصی کاربران
          '/api',         // خطوط API
          '/f/',          // فرم‌های عمومی (داده اختصاصی هر فرم)
          '/auth',        // کال‌بک احراز هویت
          '/forgot-password', // صفحات حاوی توکن بازیابی
          '/reset-password',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
