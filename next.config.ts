import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/truyendoc',
  images: {
    unoptimized: true,
  },
  output: 'export',
  staticPageGenerationTimeout: 300,
};

export default nextConfig;
