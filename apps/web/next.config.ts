import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 90],
  },
  reactStrictMode: true,
  transpilePackages: ['@janus/agent', '@janus/domain'],
};

export default nextConfig;
