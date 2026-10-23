import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Janus Observatory',
    short_name: 'Janus',
    description:
      'Ten possible futures of human civilization, and what an observer on another star could see.',
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
