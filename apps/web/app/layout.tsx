import type { Metadata, Viewport } from 'next';
import { Hanken_Grotesk, Newsreader } from 'next/font/google';
import type { ReactNode } from 'react';

import { MotionPreference } from './components/MotionPreference';
import { OperationalTelemetry } from './components/OperationalTelemetry';
import { siteDescription, siteOrigin } from '../lib/site';
import './globals.css';

// Text and interface: a quiet, open grotesque that stays legible at small sizes.
const body = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

// Headlines: an optical-size serif in the tradition of astronomy books and almanacs.
const display = Newsreader({
  subsets: ['latin'],
  variable: '--font-display',
  axes: ['opsz'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  applicationName: 'Janus Observatory',
  title: {
    default: 'Janus Observatory',
    template: '%s · Janus Observatory',
  },
  description: siteDescription,
  authors: [{ name: 'Janus Observatory', url: 'https://github.com/nicoceron/janus-observatory' }],
  creator: 'Janus Observatory',
  publisher: 'Janus Observatory',
  category: 'science',
  keywords: [
    'Project Janus',
    'astrobiology',
    'technosignatures',
    'SETI',
    'future scenarios',
    'scientific visualization',
  ],
  referrer: 'origin-when-cross-origin',
  formatDetection: { address: false, email: false, telephone: false },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Janus Observatory',
    title: 'Janus Observatory · Ten futures, one question',
    description: siteDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Janus Observatory · Ten futures, one question',
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: '#07100e',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="describedby" href={`${siteOrigin}/llms.txt`} type="text/markdown" />
      </head>
      <body className={`${body.variable} ${display.variable}`}>
        {children}
        <MotionPreference />
        <OperationalTelemetry />
      </body>
    </html>
  );
}
