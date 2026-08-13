import type { Metadata } from 'next';
import { Suspense } from 'react';

import { InnerPage } from '../components/InnerPage';
import { AtlasExplorer } from './AtlasExplorer';

export const metadata: Metadata = { title: 'Atlas' };

export default function AtlasPage() {
  return (
    <InnerPage
      eyebrow="Atlas · ten canonical scenarios"
      lede="Compare morphology, growth, atmosphere, technosignatures, observability, and reported collapse outcomes—field by field."
      title="Ten possibilities. No leaderboard."
    >
      <Suspense fallback={<p>Preparing canonical comparison…</p>}>
        <AtlasExplorer />
      </Suspense>
    </InnerPage>
  );
}
