'use client';

import { lazy, Suspense } from 'react';

const DeferredHeroSplineLayer = lazy(() =>
  import('./HeroSplineLayer').then(({ HeroSplineLayer }) => ({ default: HeroSplineLayer })),
);

export function HeroSplineBoundary() {
  return (
    <Suspense fallback={null}>
      <DeferredHeroSplineLayer />
    </Suspense>
  );
}
