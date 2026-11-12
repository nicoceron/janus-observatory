import type { Metadata } from 'next';
import { Suspense } from 'react';

import { InnerPage } from '../components/InnerPage';
import { ObservatoryExplorer } from './ObservatoryExplorer';

export const metadata: Metadata = {
  title: 'Observatory',
  description:
    'Look back at our Solar System from another star. Pick one of ten possible futures and five instruments, and see what each could detect.',
  alternates: { canonical: '/observatory' },
  openGraph: {
    title: 'Observatory · Janus Observatory',
    description: 'Keep the civilization, change the telescope: see what survives the distance.',
    url: '/observatory',
  },
};

export default function ObservatoryPage() {
  return (
    <InnerPage
      lede="Imagine looking back at our Solar System from another star. Keep the same possible civilization in view and change instruments to discover how the available evidence changes."
      title="See what survives the distance."
    >
      <Suspense fallback={<p>Loading the observatory…</p>}>
        <ObservatoryExplorer />
      </Suspense>
    </InnerPage>
  );
}
