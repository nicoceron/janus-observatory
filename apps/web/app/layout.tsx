import type { Metadata } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';

import './globals.css';

const body = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Janus Observatory',
    template: '%s · Janus Observatory',
  },
  description:
    'A source-backed interactive atlas of self-consistent technological-civilization scenarios.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${body.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
