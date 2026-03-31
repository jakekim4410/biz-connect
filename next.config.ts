import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverMinification: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "opctvhzbzdwxzwcihhkq.supabase.co",
      },
    ],
  },
};

export default nextConfig;