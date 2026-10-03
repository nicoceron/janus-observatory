import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Space_Grotesk, Chakra_Petch } from 'next/font/google';
import type { ReactNode } from 'react';

import { MotionPreference } from './components/MotionPreference';
import { OperationalTelemetry } from './components/OperationalTelemetry';
import { siteDescription, siteOrigin } from '../lib/site';
import './globals.css';

const body = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400'],
  display: 'swap',
});

const display = Chakra_Petch({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600'],
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
    title: 'Janus Observatory · Ten futures, one system',
    description: siteDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Janus Observatory · Ten futures, one system',
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
      <body className={`${body.variable} ${mono.variable} ${display.variable}`}>
        {children}
        <MotionPreference />
        <OperationalTelemetry />
      </body>
    </html>
  );
}
