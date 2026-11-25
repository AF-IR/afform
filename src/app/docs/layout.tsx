import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { DocsSidebar } from '@/components/docs/docs-sidebar'
import { getCurrentUser } from '@/lib/auth/service'

/**
 * Shared chrome for the whole /docs section: sticky sidebar with real
 * internal links between every doc page (SEO-friendly crawl structure)
 * plus header/footer.
 */
export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  return (
    <>
      <SiteHeader isAuthenticated={Boolean(user)} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-10 px-4 py-10">
        <aside className="sticky top-24 hidden h-fit w-60 shrink-0 md:block" aria-label="فهرست مستندات">
          <DocsSidebar />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <SiteFooter />
    </>
  )
}
