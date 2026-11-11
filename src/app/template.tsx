/**
 * Route transition wrapper — every navigation re-mounts this template, giving
 * the whole site a soft fade/slide instead of a sudden jump.
 * Pure CSS (no JS) with prefers-reduced-motion support.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>
}
