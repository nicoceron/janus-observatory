import type { ObservingMissionId } from '@janus/domain/scientific-dataset';
import { allScenarioProfiles, sourceRefHref, sourceRefLabel } from '../../lib/canonical-core';
import styles from './observatory.module.css';

export function ScenarioEvidence({
  scenarioId,
  instrumentId,
}: {
  scenarioId: (typeof allScenarioProfiles)[number]['id'];
  instrumentId: ObservingMissionId;
}) {
  return (
    <div className={styles.evidenceStack} aria-live="polite" aria-atomic="true">
      {/* Shared intrinsic rows reserve room for every scenario, including wrapped text.
          Inactive results affect sizing only: they are hidden and cannot receive focus. */}
      {allScenarioProfiles.map((profile) => {
        const observation = profile.observations.find(({ id }) => id === instrumentId)!;
        const selected = profile.id === scenarioId;
        return (
          <div
            className={styles.evidencePanel}
            data-scenario-evidence={profile.id}
            aria-hidden={!selected}
            inert={!selected}
            key={profile.id}
          >
            <span className={styles.epistemic}>
              reported · transcribed · {observation.result.status.replaceAll('_', ' ')}
            </span>
            <h3>{profile.morphology.mythMetaphor}</h3>
            <p className={styles.instrumentLabel}>
              {observation.plainLabel} · {observation.short} · {observation.mode}
            </p>
            {observation.result.signatures.length > 0 ? (
              <ul className={styles.signalList}>
                {observation.result.signatures.map((signature) => (
                  <li key={signature}>{signature}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.quietResult}>No signature listed for this method.</p>
            )}
            <p className={styles.caveat}>{observation.result.caveat}</p>
            <a
              className={styles.sourceLink}
              data-telemetry-event="source_link"
              data-telemetry-value="JANUS-PAPER-03"
              href={sourceRefHref(observation.result.sourceRefs[0]!)}
              rel="noreferrer"
              target="_blank"
            >
              {sourceRefLabel(observation.result.sourceRefs[0]!)} · source exact ↗
            </a>
          </div>
        );
      })}
    </div>
  );
}
