import type { MetadataRoute } from 'next'
import { DOC_PAGES } from '@/lib/docs/content'
import { USE_CASES } from '@/lib/use-cases/data'

/** Production default: aflab.vercel.app (override with NEXT_PUBLIC_SITE_URL). */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://aflab.vercel.app'

/**
 * All public, indexable pages — every entry is a real server-rendered route
 * (no hash/fragment URLs). Private areas (dashboard, /f/, /api, /auth) are
 * deliberately excluded and blocked via robots.txt.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/features`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/templates`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/plans`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    // documentation hub + every doc page
    { url: `${SITE_URL}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    ...DOC_PAGES.map((d) => ({
      url: `${SITE_URL}/docs/${d.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    // use-case landing pages
    { url: `${SITE_URL}/use-cases`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...USE_CASES.map((u) => ({
      url: `${SITE_URL}/use-cases/${u.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
