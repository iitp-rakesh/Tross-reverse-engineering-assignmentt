import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.licdn.com",
      },
    ],
  },
};

export default nextConfig;
