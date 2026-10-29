import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverMinification: true,
    serverActions: {
      bodySizeLimit: '55mb',
    },
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
