import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV === 'development';
const hstsEnabled = process.env.JANUS_ENABLE_HSTS === 'true';
const httpsUpgradeEnabled = process.env.JANUS_ENABLE_HTTPS_UPGRADE === 'true';
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self' blob:" + (isDevelopment ? ' ws: wss:' : ''),
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(httpsUpgradeEnabled ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', '192.168.80.205'],
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 90],
  },
  reactStrictMode: true,
  transpilePackages: ['@janus/agent', '@janus/domain'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          ...(hstsEnabled
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]
            : []),
        ],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
