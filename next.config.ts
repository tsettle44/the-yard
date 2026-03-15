import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE || "self-hosted",
  },
};

export default nextConfig;
