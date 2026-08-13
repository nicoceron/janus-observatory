'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState, type CSSProperties } from 'react';
import { max, scaleLinear, scaleLog } from 'd3';

import { allScenarioProfiles, scientificNotation } from '../../lib/canonical';

type ScenarioId = (typeof allScenarioProfiles)[number]['id'];

const maxComparisons = 3;

type MetricKey = 'population' | 'energy' | 'detectability' | 'system';

const metricCopy: Record<
  MetricKey,
  { button: string; label: string; note: string; scale: 'log' | 'linear' }
> = {
  population: {
    button: 'Population',
    label: 'Population after 1,000 years',
    note: 'Reported total across all bodies. Logarithmic visual scale.',
    scale: 'log',
  },
  energy: {
    button: 'Annual energy',
    label: 'Annual energy use',
    note: 'Reported joules per year across all bodies. Logarithmic visual scale.',
    scale: 'log',
  },
  detectability: {
    button: 'Detectability',
    label: 'Mission concepts with a listed signature',
    note: 'Count of filled Figure 6 cells. It is not a technology score or detection probability.',
    scale: 'linear',
  },
  system: {
    button: 'System reach',
    label: 'Listed system technosignature categories',
    note: 'Count of categories present in Table 8. It is not a distance or capability score.',
    scale: 'linear',
  },
};

function metricValue(metric: MetricKey, profile: (typeof allScenarioProfiles)[number]) {
  switch (metric) {
    case 'population':
      return profile.growth.population;
    case 'energy':
      return profile.growth.annualEnergyUseJ;
    case 'detectability':
      return profile.observations.filter(({ result }) => result.signatures.length > 0).length;
    case 'system':
      return profile.system.length;
  }
}

function metricDisplay(metric: MetricKey, value: number) {
  if (metric === 'population') return scientificNotation(value);
  if (metric === 'energy') return `${scientificNotation(value)} J / year`;
  if (metric === 'detectability') return `${value} / 5 mission cells`;
  return `${value} categories`;
}

function MetricExplorer() {
  const [metric, setMetric] = useState<MetricKey>('population');
  const rows = useMemo(
    () => allScenarioProfiles.map((profile) => ({ profile, value: metricValue(metric, profile) })),
    [metric],
  );
  const maximum = max(rows, ({ value }) => value) ?? 1;
  const minimum = Math.min(...rows.map(({ value }) => value).filter((value) => value > 0));
  const widthScale =
    metricCopy[metric].scale === 'log'
      ? scaleLog().domain([minimum, maximum]).range([12, 100])
      : scaleLinear().domain([0, maximum]).range([0, 100]);

  return (
    <section className="metricExplorer" aria-labelledby="metric-explorer-title">
      <header>
        <p className="eyebrow">Analytical lens · all ten scenarios</p>
        <h2 id="metric-explorer-title">Compare the possibility space</h2>
        <p>
          Switch one sourced dimension at a time. The view deliberately refuses to calculate an
          overall civilization rank.
        </p>
      </header>
      <div className="metricControls" role="group" aria-label="Comparison metric">
        {(Object.keys(metricCopy) as MetricKey[]).map((key) => (
          <button
            aria-pressed={metric === key}
            key={key}
            onClick={() => setMetric(key)}
            type="button"
          >
            {metricCopy[key].button}
          </button>
        ))}
      </div>
      <div
        className="metricChart"
        role="group"
        aria-labelledby="metric-chart-title metric-chart-note"
      >
        <div className="metricChartHeading">
          <h3 id="metric-chart-title">{metricCopy[metric].label}</h3>
          <p id="metric-chart-note">{metricCopy[metric].note}</p>
        </div>
        <ol>
          {rows.map(({ profile, value }) => (
            <li key={profile.id}>
              <Link href={`/atlas/${profile.id.toLowerCase()}`}>
                <span className="metricScenarioId">{profile.id}</span>
                <span className="metricScenarioName">{profile.morphology.mythMetaphor}</span>
              </Link>
              <span className="metricBarTrack" aria-hidden="true">
                <span
                  className="metricBar"
                  style={
                    {
                      '--metric-accent': profile.accent,
                      width: `${widthScale(Math.max(value, minimum))}%`,
                    } as CSSProperties
                  }
                />
              </span>
              <strong>{metricDisplay(metric, value)}</strong>
            </li>
          ))}
        </ol>
      </div>
      <details className="metricDataTable">
        <summary>Open structured metric table</summary>
        <div
          aria-label={`${metricCopy[metric].label} structured table; scroll horizontally if needed`}
          className="comparisonScroller"
          tabIndex={0}
        >
          <table>
            <caption>{metricCopy[metric].label} for all scenarios</caption>
            <thead>
              <tr>
                <th scope="col">Scenario</th>
                <th scope="col">Value</th>
                <th scope="col">Scale note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ profile, value }) => (
                <tr key={profile.id}>
                  <th scope="row">
                    {profile.id} · {profile.morphology.mythMetaphor}
                  </th>
                  <td>{metricDisplay(metric, value)}</td>
                  <td>{metricCopy[metric].note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function validScenarioIds(value: string | null): ScenarioId[] {
  if (!value) return ['S1', 'S4', 'S9'];
  const known = new Set(allScenarioProfiles.map(({ id }) => id));
  return value
    .split(',')
    .filter((id): id is ScenarioId => known.has(id as ScenarioId))
    .slice(0, maxComparisons);
}

function replaceCompareQuery(ids: ScenarioId[]) {
  const url = new URL(window.location.href);
  if (ids.length > 0) url.searchParams.set('compare', ids.join(','));
  else url.searchParams.delete('compare');
  window.history.replaceState({}, '', url);
}

export function AtlasExplorer() {
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<ScenarioId[]>(() =>
    validScenarioIds(searchParams.get('compare')),
  );
  const selected = useMemo(
    () => selectedIds.map((id) => allScenarioProfiles.find((profile) => profile.id === id)!),
    [selectedIds],
  );

  function toggleScenario(id: ScenarioId) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((candidate) => candidate !== id)
      : selectedIds.length < maxComparisons
        ? [...selectedIds, id]
        : selectedIds;
    setSelectedIds(next);
    replaceCompareQuery(next);
  }

  return (
    <>
      <section className="atlasPicker" aria-labelledby="atlas-picker-title">
        <div className="atlasPickerIntro">
          <p className="eyebrow">Comparison workspace</p>
          <h2 id="atlas-picker-title">Select up to three scenarios.</h2>
          <p>
            Fields stay separate; the Atlas does not collapse technology, resilience, or
            detectability into a score.
          </p>
          <span aria-live="polite">
            {selectedIds.length} of {maxComparisons} selected
          </span>
        </div>
        <div className="atlasScenarioGrid">
          {allScenarioProfiles.map((profile) => {
            const selected = selectedIds.includes(profile.id);
            const disabled = !selected && selectedIds.length >= maxComparisons;
            return (
              <article
                className={selected ? 'atlasScenario atlasScenarioSelected' : 'atlasScenario'}
                key={profile.id}
                style={{ '--scenario-accent': profile.accent } as CSSProperties}
              >
                <div>
                  <span>{profile.id}</span>
                  <span>{profile.morphology.globalFactor}</span>
                </div>
                <h3>{profile.morphology.mythMetaphor}</h3>
                <p>
                  Cluster {profile.morphology.technologyCluster} ·{' '}
                  {profile.growth.growthState.replace('_', ' ')}
                </p>
                <div className="atlasScenarioActions">
                  <button
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() => toggleScenario(profile.id)}
                    type="button"
                  >
                    {selected ? 'Remove' : disabled ? 'Three selected' : 'Compare'}
                  </button>
                  <Link href={`/atlas/${profile.id.toLowerCase()}`}>Open record</Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <MetricExplorer />

      <section className="comparison" aria-labelledby="comparison-title">
        <header>
          <p className="eyebrow">Aligned canonical fields</p>
          <h2 id="comparison-title">Side-by-side, without a rank.</h2>
        </header>
        {selected.length === 0 ? (
          <p className="emptyComparison">Select at least one scenario to open the comparison.</p>
        ) : (
          <div
            aria-label="Selected scenario comparison; scroll horizontally if needed"
            className="comparisonScroller"
            tabIndex={0}
          >
            <table className="comparisonTable">
              <caption>Canonical comparison for {selectedIds.join(', ')}</caption>
              <thead>
                <tr>
                  <th scope="col">Field</th>
                  {selected.map((profile) => (
                    <th scope="col" key={profile.id}>
                      <span>{profile.id}</span>
                      <strong>{profile.morphology.mythMetaphor}</strong>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Global factor</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>{profile.morphology.globalFactor}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Technology cluster</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>{profile.morphology.technologyCluster}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Technology factors</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>{profile.morphology.technologyFactors.join(', ')}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Population</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>{scientificNotation(profile.growth.population)}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Annual energy use</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      {scientificNotation(profile.growth.annualEnergyUseJ)} J / year
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Growth state</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>{profile.growth.growthState}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">CO₂</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      {profile.atmosphere.co2?.value ?? 'Published ellipsis'} ppm
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Listed system signatures</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      {profile.system.map(({ label }) => label).join(', ') ||
                        'None listed in Table 8'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Mission cells with signatures</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      {
                        profile.observations.filter(({ result }) => result.signatures.length > 0)
                          .length
                      }{' '}
                      / 5
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Reported collapse summary</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>{profile.collapse.reportedResults.summary}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="comparisonNote">
          “Published ellipsis,” numeric zero, and “none listed” remain distinct. Detection counts
          summarize filled matrix cells for navigation only; they are not scenario scores.
        </p>
      </section>
    </>
  );
}
