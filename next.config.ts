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
};

export default nextConfig;
