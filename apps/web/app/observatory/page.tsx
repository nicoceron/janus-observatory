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
      eyebrow="Observatory · categorical evidence engine"
      lede="Change the scenario or the observing method. The underlying civilization does not change—only the evidence available to the observer does."
      title="No single instrument is enough."
    >
      <Suspense fallback={<p>Preparing the observing matrix…</p>}>
        <ObservatoryExplorer />
      </Suspense>
    </InnerPage>
  );
}
