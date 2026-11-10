import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow isolated production builds without clobbering the running dev server
  distDir: process.env.NEXT_BUILD_DIST_DIR || ".next",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
