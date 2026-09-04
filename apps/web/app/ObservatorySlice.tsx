'use client';

import { observingMissionIds, type ObservingMissionId } from '@janus/domain/scientific-dataset';
import Image from 'next/image';
import { useMemo, useState, type CSSProperties } from 'react';

import {
  earthAtmosphere,
  getScenarioProfile,
  instrumentCopy,
  scientificNotation,
  verticalSliceProfiles,
} from '../lib/canonical-core';

type SliceScenarioId = 'S1' | 'S4' | 'S9';

const sliceScenarioIds: SliceScenarioId[] = ['S1', 'S4', 'S9'];

const scenarioInterpretation: Record<
  SliceScenarioId,
  { archetype: string; body: string; note: string }
> = {
  S1: {
    archetype: 'Centralized growth',
    body: 'Strong Earth signals with additional Mars surface features',
    note: 'Editorial shorthand from versioned table values.',
  },
  S4: {
    archetype: 'Low-technology stability',
    body: 'Low-intensity Earth technosignatures',
    note: 'Low intensity does not mean no technology.',
  },
  S9: {
    archetype: 'Machine-led expansion',
    body: 'Earth is quiet while Venus, Mars, and the wider system carry activity',
    note: 'A method can miss Earth while another resolves off-world structures.',
  },
};

export function ObservatorySlice() {
  const [scenarioId, setScenarioId] = useState<SliceScenarioId>('S1');
  const [instrumentId, setInstrumentId] = useState<ObservingMissionId>(
    'habitable_worlds_observatory',
  );
  const [showData, setShowData] = useState(false);

  const profile = useMemo(() => getScenarioProfile(scenarioId), [scenarioId]);
  const instrument = instrumentCopy[instrumentId];
  const observation = profile.observations.find(({ id }) => id === instrumentId);

  if (!observation) throw new Error(`Canonical observation data is missing for ${instrumentId}.`);

  const growthLabel =
    profile.growth.annualGrowthRate === null
      ? profile.growth.growthState[0]?.toUpperCase() + profile.growth.growthState.slice(1)
      : `${(profile.growth.annualGrowthRate * 100).toFixed(2)}% annual growth`;

  const atmosphericRows = ['mean_temperature', 'co2', 'ch4', 'nox', 'cfc_11', 'cfc_12']
    .map((id) => earthAtmosphere.rows.find((row) => row.id === id))
    .filter((row): row is (typeof earthAtmosphere.rows)[number] => Boolean(row));

  return (
    <section className="observatory" id="observatory" aria-labelledby="observatory-title">
      <header className="observatoryIntro">
        <p className="eyebrow">First light · published categorical matrix</p>
        <h2 id="observatory-title">Choose the observer. Change the evidence.</h2>
        <div>
          <p>
            The same civilization looks different through each instrument. Select a future and scan
            it with the five-method ladder from the observing-strategies paper.
          </p>
          <button
            className="dataToggle"
            onClick={() => setShowData((value) => !value)}
            type="button"
          >
            {showData ? 'Hide structured data' : 'Open structured data'}
          </button>
        </div>
      </header>

      <div className="observatoryShell" style={{ '--signal': profile.accent } as CSSProperties}>
        <aside className="scenarioPicker" aria-label="Scenario selection">
          <p className="controlLabel">01 · Future</p>
          <div className="choiceList">
            {sliceScenarioIds.map((id) => {
              const candidate = verticalSliceProfiles.find((item) => item.id === id);
              if (!candidate) return null;
              return (
                <button
                  aria-pressed={scenarioId === id}
                  className="scenarioChoice"
                  key={id}
                  onClick={() => setScenarioId(id)}
                  type="button"
                >
                  <span>{id}</span>
                  <strong>{candidate.morphology.mythMetaphor}</strong>
                  <small>{scenarioInterpretation[id].archetype}</small>
                </button>
              );
            })}
          </div>

          <dl className="scenarioFacts">
            <div>
              <dt>Population</dt>
              <dd>{scientificNotation(profile.growth.population)}</dd>
            </div>
            <div>
              <dt>Energy</dt>
              <dd>{scientificNotation(profile.growth.annualEnergyUseJ)} J / year</dd>
            </div>
            <div>
              <dt>Trajectory</dt>
              <dd>{growthLabel}</dd>
            </div>
          </dl>
        </aside>

        <div className="scanStage" aria-live="polite">
          <div className="scanHeader">
            <span>Target · Sol system</span>
            <span>Scenario · {scenarioId}</span>
          </div>
          <div className="systemView">
            <Image
              alt=""
              aria-hidden="true"
              className="observatoryPoster"
              fill
              priority={false}
              sizes="(max-width: 860px) 100vw, 50vw"
              src="/assets/observer/janus-observer-poster-v1.webp"
            />
            <span className="scanLine" aria-hidden="true" />
            <span className="srOnly">
              Interpretive observer view pointed toward {scenarioId}. The structured result below is
              the authoritative categorical evidence.
            </span>
          </div>
          <div className="resultPanel">
            <span className="resultStatus">
              {observation.result.status === 'reported_listed'
                ? 'Published matrix · signature listed'
                : 'Published matrix · blank cell'}
            </span>
            {observation.result.signatures.length > 0 ? (
              <>
                <strong>
                  {observation.result.signatures.length === 1
                    ? 'One signature listed'
                    : `${observation.result.signatures.length} signatures listed`}
                </strong>
                <ul>
                  {observation.result.signatures.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              </>
            ) : (
              <strong>No signature listed for this method</strong>
            )}
            <p>{observation.result.caveat}</p>
            <span className="resultContext">{scenarioInterpretation[scenarioId].body}</span>
          </div>
        </div>

        <aside className="instrumentPicker" aria-label="Instrument selection">
          <p className="controlLabel">02 · Instrument</p>
          <div className="instrumentList">
            {observingMissionIds.map((id, index) => (
              <button
                aria-pressed={instrumentId === id}
                className="instrumentChoice"
                data-telemetry-event="instrument_select"
                data-telemetry-value={id}
                key={id}
                onClick={() => setInstrumentId(id)}
                type="button"
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{instrumentCopy[id].short}</strong>
                <small>{instrumentCopy[id].mode}</small>
              </button>
            ))}
          </div>
          <div className="instrumentReadout">
            <span>Active concept</span>
            <strong>{instrument.label}</strong>
          </div>
        </aside>
      </div>

      {showData && (
        <div className="dataView" id="observatory-data">
          <div className="dataViewIntro">
            <p className="eyebrow">Structured alternative · {scenarioId}</p>
            <h3>Published values behind the view</h3>
            <p>{scenarioInterpretation[scenarioId].note}</p>
          </div>
          <div className="tableScroller">
            <table>
              <caption>Selected Earth atmosphere values from ApJL Table 1</caption>
              <thead>
                <tr>
                  <th scope="col">Property</th>
                  <th scope="col">Value</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {atmosphericRows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.label}</th>
                    <td>{row.values[scenarioId] ?? 'Published ellipsis / not listed'}</td>
                    <td>{row.unit}</td>
                    <td>reported · transcribed</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tableScroller">
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
                    <td>
                      {item.result.status === 'reported_listed'
                        ? 'Signature listed under source assumptions'
                        : 'No signature listed; not an absence-of-technology claim'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="sourceStrip">
        <span>Source · Haqq-Misra, Kopparapu &amp; Profitiliotis</span>
        <a href="https://arxiv.org/abs/2511.20329v2" rel="noreferrer" target="_blank">
          ApJL Figure 6 ↗
        </a>
        <span>Scenario values · TFSC Tables 5, 6, 8 &amp; 9</span>
      </div>
    </section>
  );
}
