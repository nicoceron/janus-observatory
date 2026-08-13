import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@janus/agent', '@janus/domain'],
};

export default nextConfig;
