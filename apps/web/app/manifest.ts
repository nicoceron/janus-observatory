import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Janus Observatory',
    short_name: 'Janus',
    description:
      'Explore ten self-consistent technological futures through source-backed story, observatory, and atlas views.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07100e',
    theme_color: '#07100e',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
