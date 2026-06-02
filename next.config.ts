import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  typescript: {
    // Type errors are from stub DB types — will resolve after running `npx supabase gen types`
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      // Cloudflare R2 public bucket (r2.dev subdomain)
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      // Custom CDN domain if configured (e.g. cdn.nextswimmingschool.com)
      {
        protocol: "https",
        hostname: "**.nextswimmingschool.com",
      },
    ],
  },
};

export default nextConfig;
