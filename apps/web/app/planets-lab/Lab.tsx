'use client';
import dynamic from 'next/dynamic';
import type { WorldSignals } from '../../lib/world-signals';
const LabCanvas = dynamic(() => import('./LabCanvas'), { ssr: false });
export function Lab({ signals }: { signals: WorldSignals[] }) {
  return (
    <main style={{ position: 'fixed', inset: 0, background: '#050709' }}>
      <LabCanvas signals={signals} />
    </main>
  );
}
