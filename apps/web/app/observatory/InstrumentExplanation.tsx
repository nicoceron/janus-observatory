import type { ObservingMissionId } from '@janus/domain/scientific-dataset';
import {
  instrumentCopy,
  observabilityDataset,
  sourceRefHref,
  sourceRefLabel,
} from '../../lib/canonical-core';
import styles from './learning.module.css';

export function InstrumentExplanation({ instrumentId }: { instrumentId: ObservingMissionId }) {
  const instrument = instrumentCopy[instrumentId];
  const refs = observabilityDataset.missionAssumptions[instrumentId].concept.sourceRefs;
  return (
    <aside className={styles.instrument} aria-label={`${instrument.plainLabel} explained`}>
      <div className={styles.methodMark} aria-hidden="true">
        <svg viewBox="0 0 180 64" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="24" cy="32" r="13" />
          <path d="M140 16v32l24-9V25Z" />
          {instrumentId === 'deep_space_probes' ? (
            <path d="M125 32H52m12-8-12 8 12 8" />
          ) : instrumentId === 'habitable_worlds_observatory' ? (
            <>
              <path d="m2 3 22 16 32 13h77m-9-7 9 7-9 7" />
              <circle cx="4" cy="5" r="3" />
            </>
          ) : instrumentId === 'solar_gravitational_lens' ? (
            <>
              <circle cx="86" cy="32" r="9" />
              <path d="M39 32Q86 3 133 32M39 32Q86 61 133 32" />
            </>
          ) : (
            <path d="M42 32q8-20 16 0t16 0 16 0 16 0 16 0h11" />
          )}
        </svg>
        <span>{instrument.mode}</span>
      </div>
      <div>
        <p className={styles.eyebrow}>How this method works · editorial explanation</p>
        <h3>{instrument.plainLabel}</h3>
        <p>{instrument.explanation}</p>
        <details>
          <summary>{instrument.label} · concept and source</summary>
          <p>
            These are observing concepts evaluated in the paper, with different capabilities and
            assumptions.
          </p>
          {refs.map((ref, index) => (
            <a key={index} href={sourceRefHref(ref)} target="_blank" rel="noreferrer">
              {sourceRefLabel(ref)} ↗
            </a>
          ))}
        </details>
      </div>
    </aside>
  );
}
