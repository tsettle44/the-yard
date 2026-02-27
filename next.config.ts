import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE || "self-hosted",
  },
};

export default nextConfig;
