import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  output: 'export',
  // Speed up static generation
  staticPageGenerationTimeout: 300,
};

export default nextConfig;
