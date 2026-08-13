'use client';

import type { ObservingMissionId } from '@janus/domain';
import { observingMissionIds } from '@janus/domain';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import { allScenarioProfiles, instrumentCopy, observabilityDataset } from '../../lib/canonical';

const EarthStage = dynamic(
  () => import('../story/EarthStage').then((module) => module.EarthStage),
  { ssr: false, loading: () => <div className="observatorySceneLoading">Acquiring target…</div> },
);

type ScenarioId = (typeof allScenarioProfiles)[number]['id'];

function isScenarioId(value: string | null): value is ScenarioId {
  return allScenarioProfiles.some(({ id }) => id === value);
}

function isInstrumentId(value: string | null): value is ObservingMissionId {
  return observingMissionIds.some((id) => id === value);
}

function updateUrl(scenarioId: ScenarioId, instrumentId: ObservingMissionId) {
  const url = new URL(window.location.href);
  url.searchParams.set('scenario', scenarioId);
  url.searchParams.set('instrument', instrumentId);
  window.history.replaceState({}, '', url);
}

export function ObservatoryExplorer() {
  const searchParams = useSearchParams();
  const [scenarioId, setScenarioIdState] = useState<ScenarioId>(() => {
    const value = searchParams.get('scenario');
    return isScenarioId(value) ? value : 'S1';
  });
  const [instrumentId, setInstrumentIdState] = useState<ObservingMissionId>(() => {
    const value = searchParams.get('instrument');
    return isInstrumentId(value) ? value : 'habitable_worlds_observatory';
  });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showData, setShowData] = useState(false);
  const profile = useMemo(
    () => allScenarioProfiles.find(({ id }) => id === scenarioId)!,
    [scenarioId],
  );
  const observation = profile.observations.find(({ id }) => id === instrumentId)!;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  function setScenarioId(next: ScenarioId) {
    setScenarioIdState(next);
    updateUrl(next, instrumentId);
  }

  function setInstrumentId(next: ObservingMissionId) {
    setInstrumentIdState(next);
    updateUrl(scenarioId, next);
  }

  return (
    <>
      <section
        className="alienConsole"
        style={{ '--signal': profile.accent } as CSSProperties}
        aria-labelledby="alien-console-title"
      >
        <header className="alienConsoleHeader">
          <div>
            <p>JANUS / REMOTE OBSERVATION ARRAY</p>
            <h2 id="alien-console-title">Alien telescope console</h2>
          </div>
          <dl>
            <div>
              <dt>Target</dt>
              <dd>Sol system · {scenarioId}</dd>
            </div>
            <div>
              <dt>Evidence basis</dt>
              <dd>Published Figure 6 preset</dd>
            </div>
            <div>
              <dt>Output</dt>
              <dd>Categorical · not probabilistic</dd>
            </div>
          </dl>
        </header>

        <div className="alienViewport">
          <EarthStage
            className="observatoryEarthStage"
            reducedMotion={reducedMotion}
            state={{ kind: 'observer', scenarioId, instrument: instrumentId }}
          />
          <div className="targetReticle" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="scanTelemetry" aria-hidden="true">
            <span>ACQ {scenarioId}</span>
            <span>{instrumentCopy[instrumentId].short}</span>
            <span>LOCK</span>
          </div>
          <div className="alienEvidence" aria-live="polite">
            <span className="alienEvidenceStatus">
              {observation.result.signatures.length > 0
                ? 'SIGNATURE LISTED'
                : 'NO SIGNATURE LISTED'}
            </span>
            <h3>{profile.morphology.mythMetaphor}</h3>
            <p>
              {observation.label} · {observation.mode}
            </p>
            {observation.result.signatures.length > 0 ? (
              <ul>
                {observation.result.signatures.map((signature) => (
                  <li key={signature}>{signature}</li>
                ))}
              </ul>
            ) : (
              <strong>Quiet through this method</strong>
            )}
            <small>{observation.result.caveat}</small>
          </div>
        </div>

        <div className="alienControls">
          <fieldset>
            <legend>01 · Select future</legend>
            <div className="alienScenarioChoices">
              {allScenarioProfiles.map((candidate) => (
                <button
                  aria-label={`${candidate.id}: ${candidate.morphology.mythMetaphor}`}
                  aria-pressed={candidate.id === scenarioId}
                  key={candidate.id}
                  onClick={() => setScenarioId(candidate.id)}
                  style={{ '--choice-accent': candidate.accent } as CSSProperties}
                  type="button"
                >
                  {candidate.id}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>02 · Select observing concept</legend>
            <div className="alienInstrumentChoices">
              {observingMissionIds.map((id) => (
                <button
                  aria-pressed={id === instrumentId}
                  key={id}
                  onClick={() => setInstrumentId(id)}
                  type="button"
                >
                  <strong>{instrumentCopy[id].short}</strong>
                  <span>{instrumentCopy[id].mode}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="alienConsoleActions">
            <button onClick={() => setShowData((value) => !value)} type="button">
              {showData ? 'Close data view' : 'Open data view'}
            </button>
            <Link href={`/atlas/${scenarioId.toLowerCase()}`}>Open scenario record →</Link>
          </div>
        </div>

        <aside className="alienAssumptions">
          <strong>Source assumptions</strong>
          <ul>
            {observabilityDataset.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
          <p>
            The procedural instrument and scene geometry are interpretive orientation graphics.
            Continuous distance and integration controls remain disabled until a validated model
            supports them.
          </p>
        </aside>
      </section>

      {showData && (
        <section className="observatoryDataView" aria-labelledby="observatory-data-title">
          <header>
            <p className="eyebrow">Structured alternative · {scenarioId}</p>
            <h2 id="observatory-data-title">Evidence behind the viewport</h2>
          </header>
          <div className="comparisonScroller">
            <table>
              <caption>Five-method detection matrix for {scenarioId}</caption>
              <thead>
                <tr>
                  <th scope="col">Method</th>
                  <th scope="col">Published cell</th>
                  <th scope="col">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {profile.observations.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">{item.label}</th>
                    <td>{item.result.signatures.join('; ') || 'Blank cell'}</td>
                    <td>{item.result.caveat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="matrixSection" aria-labelledby="matrix-title">
        <header>
          <p className="eyebrow">All ten scenarios · all five methods</p>
          <h2 id="matrix-title">Published Figure 6 matrix</h2>
          <p>
            Filled cells name listed signatures. Blank cells remain blank and never become an
            absence-of-technology conclusion.
          </p>
        </header>
        <div className="comparisonScroller">
          <table className="observabilityMatrix">
            <caption>Technosignatures listed by future mission concept</caption>
            <thead>
              <tr>
                <th scope="col">Scenario</th>
                {observingMissionIds.map((id) => (
                  <th scope="col" key={id}>
                    {instrumentCopy[id].short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allScenarioProfiles.map((candidate) => (
                <tr key={candidate.id}>
                  <th scope="row">
                    <Link href={`/atlas/${candidate.id.toLowerCase()}`}>
                      {candidate.id}
                      <span>{candidate.morphology.mythMetaphor}</span>
                    </Link>
                  </th>
                  {candidate.observations.map((item) => (
                    <td
                      className={item.result.signatures.length > 0 ? 'matrixFilled' : 'matrixBlank'}
                      key={item.id}
                    >
                      {item.result.signatures.length > 0 ? (
                        item.result.signatures.join('; ')
                      ) : (
                        <span>Blank cell</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
