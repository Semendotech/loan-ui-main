import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Turbopack is the default in Next.js 16; no custom webpack needed
  turbopack: {},
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
