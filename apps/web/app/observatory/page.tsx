import type { Metadata } from 'next';
import { Suspense } from 'react';

import { InnerPage } from '../components/InnerPage';
import { ObservatoryExplorer } from './ObservatoryExplorer';

export const metadata: Metadata = {
  title: 'Observatory',
  description:
    'Compare what five observing concepts list across all ten Project Janus scenarios, with categorical evidence states, assumptions, source locators, and structured equivalents.',
  alternates: { canonical: '/observatory' },
  openGraph: {
    title: 'Observatory · Janus Observatory',
    description:
      'Change the observing method, not the civilization: a source-backed categorical alien-observer console.',
    url: '/observatory',
  },
};

export default function ObservatoryPage() {
  return (
    <InnerPage
      eyebrow="THE OBSERVATORY"
      lede="Imagine looking back at our Solar System from another star. Keep the same possible civilization in view and change instruments to discover how the available evidence changes."
      title="See what survives the distance."
    >
      <Suspense fallback={<p>Preparing the observing matrix…</p>}>
        <ObservatoryExplorer />
      </Suspense>
    </InnerPage>
  );
}
