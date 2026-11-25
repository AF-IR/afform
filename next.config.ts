import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * CSP is applied ONLY to production builds — Next.js dev (react-refresh)
 * requires 'unsafe-eval' and would break with a strict policy.
 *
 * 'unsafe-eval' is granted because several environments (browser extensions,
 * the Vercel preview toolbar and some CDN/anti-bot injectors) evaluate JS and
 * a blocked eval was reported breaking the public form page in the field.
 * Application code itself never uses eval / new Function.
 */
const securityHeaders: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  const csp = [
    "default-src 'self'",
    // 'unsafe-inline' is required by Next.js' inline bootstrap scripts;
    // 'unsafe-eval' keeps third-party injected scripts from breaking the page
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Supabase (auth + database) is the only third-party origin the client talks to
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "worker-src 'self' blob:",
    "frame-src 'self' https://vercel.live",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  securityHeaders.push({ key: "Content-Security-Policy", value: csp });
}

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow isolated production builds without clobbering the running dev server
  distDir: process.env.NEXT_BUILD_DIST_DIR || ".next",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
