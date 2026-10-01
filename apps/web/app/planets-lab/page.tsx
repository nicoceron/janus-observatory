import { notFound } from 'next/navigation';
import { allScenarioProfiles } from '../../lib/canonical-core';
import { presentSignals, worldSignals } from '../../lib/world-signals';
import { Lab } from './Lab';

export const metadata = { title: 'Planet lab', robots: { index: false } };

/** Development-only review surface for the low-poly worlds. */
export default function PlanetLab() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Lab signals={[presentSignals, ...allScenarioProfiles.map(worldSignals)]} />;
}
