'use client';
import { createContext, useContext } from 'react';
import type { SystemPortrait } from '../../lib/system-portrait';
import { selectionName, selectionDescription, systemSelections } from './inspection';
import { bindSpatialTarget } from './spatial-targets';
import s from './voyage.module.css';
export const ExploreContext = createContext<{
  available: boolean;
  open: (world: number, selection: string, trigger: HTMLElement) => void;
}>({ available: false, open: () => {} });
export function WorldExplore({ world, system }: { world: number; system: SystemPortrait }) {
  const explore = useContext(ExploreContext);
  const destinations = systemSelections(system);
  if (!explore.available) return null;
  return (
    <div
      className={s.systemMap}
      aria-label={`Explore S${world + 1} models`}
      data-portrait="spatial"
      data-has-system={destinations.length > 1}
    >
      <nav aria-label={`S${world + 1} Solar System destinations`}>
        {destinations.map((id) => (
          <button
            key={id}
            ref={(node) => bindSpatialTarget(world, id, node)}
            className={s.bodyTarget}
            aria-label={`Inspect ${selectionName(id)}`}
            tabIndex={-1}
            onClick={(event) => explore.open(world, id, event.currentTarget)}
          >
            <span className={s.bodyName} aria-hidden="true">
              {selectionName(id)}
            </span>
            <span className="srOnly">
              {selectionDescription(world, id, system)} Distances and sizes are illustrative.
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
