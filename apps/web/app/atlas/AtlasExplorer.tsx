'use client';

import { max, scaleLog } from 'd3';
import type { SourceRef, Sourced } from '@janus/domain';
import Link from '../components/AppLink';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, type CSSProperties } from 'react';

import {
  allScenarioProfiles,
  scientificNotation,
  sourceRefHref,
  sourceRefLabel,
  sourcedDisplay,
} from '../../lib/canonical-core';
import styles from './atlas.module.css';
import {
  QuantityComparison,
  ReferenceEarthNote,
  readableNumber,
} from '../components/QuantityComparison';

type ScenarioId = (typeof allScenarioProfiles)[number]['id'];
type LensKey = 'population' | 'energy' | 'observability' | 'system';
type NumericLensKey = Extract<LensKey, 'population' | 'energy'>;

const maxComparisons = 3;

const lensCopy: Record<LensKey, { button: string; label: string; note: string }> = {
  population: {
    button: 'Population',
    label: 'Population after 1,000 years',
    note: 'Reported total across all bodies. Logarithmic visual scale.',
  },
  energy: {
    button: 'Annual energy',
    label: 'Annual energy use',
    note: 'Reported joules per year across all bodies. Logarithmic visual scale.',
  },
  observability: {
    button: 'Observing matrix',
    label: 'Five mission cells, kept separate',
    note: 'Every Figure 6 cell is shown independently. A blank cell remains “no signature listed,” not a lower score and not evidence of no technology.',
  },
  system: {
    button: 'System signatures',
    label: 'Listed system technosignature categories',
    note: 'Category labels are reproduced from Table 8. They are not collapsed into a capability or reach score.',
  },
};

function normalizeLensKey(value: string | null): LensKey {
  if (value === 'detectability') return 'observability';
  if (value !== null && Object.prototype.hasOwnProperty.call(lensCopy, value)) {
    return value as LensKey;
  }
  return 'population';
}

function numericLensValue(lens: NumericLensKey, profile: (typeof allScenarioProfiles)[number]) {
  return lens === 'population' ? profile.growth.population : profile.growth.annualEnergyUseJ;
}

function numericLensDisplay(lens: NumericLensKey, value: number) {
  return lens === 'population'
    ? scientificNotation(value)
    : `${scientificNotation(value)} J / year`;
}

function categoricalLensDisplay(
  lens: Exclude<LensKey, NumericLensKey>,
  profile: (typeof allScenarioProfiles)[number],
) {
  if (lens === 'observability') {
    return profile.observations
      .map(
        ({ result, short }) =>
          `${short}: ${
            result.signatures.length > 0
              ? result.signatures.join(', ')
              : 'no signature listed in Figure 6'
          }`,
      )
      .join('; ');
  }
  return (
    profile.system.map(({ label }) => label).join('; ') || 'No system signature listed in Table 8'
  );
}

function lensSourceRefs(lens: LensKey, profile: (typeof allScenarioProfiles)[number]): SourceRef[] {
  switch (lens) {
    case 'population':
      return profile.growth.fieldProvenance.population;
    case 'energy':
      return profile.growth.fieldProvenance.annualEnergyUseJ;
    case 'observability':
      return profile.observations.flatMap(({ result }) => result.sourceRefs);
    case 'system':
      return profile.systemCellProvenance;
  }
}

function validScenarioIds(value: string | null): ScenarioId[] {
  if (!value) return ['S1', 'S4', 'S9'];
  const known = new Set(allScenarioProfiles.map(({ id }) => id));
  const unique = new Set(
    value.split(',').filter((id): id is ScenarioId => known.has(id as ScenarioId)),
  );
  return [...unique].slice(0, maxComparisons);
}

function sourceLink(dataset: string, label: string) {
  return (
    <a className={styles.fieldSource} href={`/sources#${dataset}`}>
      {label} <span aria-hidden="true">↗</span>
    </a>
  );
}

function ExactLocator({ sourceRefs }: { sourceRefs: SourceRef[] }) {
  const first = sourceRefs[0];
  if (!first) return <span>Missing locator</span>;
  return (
    <a className={styles.fieldSource} href={sourceRefHref(first)} rel="noreferrer" target="_blank">
      {sourceRefLabel(first)}
      {sourceRefs.length > 1 ? ` +${sourceRefs.length - 1} source rows` : ''}{' '}
      <span aria-hidden="true">↗</span>
    </a>
  );
}

function SourcedCell({ field }: { field: Sourced<unknown> }) {
  return (
    <>
      <span>{sourcedDisplay(field)}</span>
      <ExactLocator sourceRefs={field.sourceRefs} />
    </>
  );
}

function ProvenancedCell({ value, sourceRefs }: { value: string; sourceRefs: SourceRef[] }) {
  return (
    <>
      <span>{value}</span>
      <ExactLocator sourceRefs={sourceRefs} />
    </>
  );
}

export function AtlasExplorer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedIds = validScenarioIds(searchParams.get('compare'));
  const lens = normalizeLensKey(searchParams.get('lens'));
  const selected = useMemo(
    () => selectedIds.map((id) => allScenarioProfiles.find((profile) => profile.id === id)!),
    [selectedIds],
  );

  function replaceParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [name, value] of Object.entries(updates)) {
      if (value) next.set(name, value);
      else next.delete(name);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function toggleScenario(id: ScenarioId) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((candidate) => candidate !== id)
      : selectedIds.length < maxComparisons
        ? [...selectedIds, id]
        : selectedIds;
    replaceParams({ compare: next.length > 0 ? next.join(',') : undefined });
  }

  const numericLens: NumericLensKey = lens === 'energy' ? 'energy' : 'population';
  const numericRows = allScenarioProfiles.map((profile) => ({
    profile,
    value: numericLensValue(numericLens, profile),
  }));
  const maximum = max(numericRows, ({ value }) => value) ?? 1;
  const minimum = Math.min(...numericRows.map(({ value }) => value).filter((value) => value > 0));
  const widthScale = scaleLog().domain([minimum, maximum]).range([8, 100]);

  return (
    <>
      <section className={styles.indexSection} aria-labelledby="atlas-picker-title">
        <header className={styles.sectionHeader}>
          <p>Scenario index · Table 5 + Table 9</p>
          <h2 id="atlas-picker-title">Select up to three futures.</h2>
          <div className={styles.headerAside}>
            <p>
              This is an editorial index, not a deck of scores. Scenario order follows S1–S10;
              trajectory labels reproduce the reported 1,000-year endpoint state.
            </p>
            <span aria-live="polite">
              {selectedIds.length} of {maxComparisons} selected
            </span>
          </div>
        </header>

        <div className={styles.scenarioIndex}>
          <div className={styles.indexLabels} aria-hidden="true">
            <span>Scenario</span>
            <span>Reported endpoint</span>
            <span>Construction</span>
            <span>Compare / record</span>
          </div>
          {allScenarioProfiles.map((profile, index) => {
            const isSelected = selectedIds.includes(profile.id);
            const disabled = !isSelected && selectedIds.length >= maxComparisons;
            return (
              <article
                className={
                  isSelected ? `${styles.scenarioRow} ${styles.selectedRow}` : styles.scenarioRow
                }
                key={profile.id}
                style={{ '--scenario-accent': profile.accent } as CSSProperties}
              >
                <div className={styles.scenarioIdentity}>
                  <span className={styles.rowNumber}>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <span>{profile.id}</span>
                    <h3>{profile.morphology.mythMetaphor}</h3>
                  </div>
                </div>
                <div className={styles.scenarioTrajectory}>
                  <strong>{profile.growth.growthState.replace('_', ' ')}</strong>
                  <span>{readableNumber(profile.growth.population)} total population</span>
                </div>
                <div className={styles.scenarioConstruction}>
                  <strong>{profile.morphology.globalFactor}</strong>
                  <span>
                    Cluster {profile.morphology.technologyCluster} ·{' '}
                    {profile.morphology.technologyFactors.join(', ')}
                  </span>
                </div>
                <div className={styles.scenarioActions}>
                  <button
                    aria-pressed={isSelected}
                    data-telemetry-event="comparison_update"
                    data-telemetry-value={profile.id}
                    disabled={disabled}
                    onClick={() => toggleScenario(profile.id)}
                    type="button"
                  >
                    {isSelected ? 'Remove' : disabled ? 'Three selected' : 'Compare'}
                  </button>
                  <Link href={`/atlas/${profile.id.toLowerCase()}`}>Open record</Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.metricSection} aria-labelledby="metric-explorer-title">
        <header className={styles.sectionHeader}>
          <p>Analytical lens · shareable view</p>
          <h2 id="metric-explorer-title">One dimension at a time.</h2>
          <div className={styles.headerAside}>
            <p>
              The lens keeps source dimensions separate. It deliberately refuses to calculate an
              overall civilization, resilience, risk, or detectability rank.
            </p>
          </div>
        </header>
        <div className={styles.metricControls} role="group" aria-label="Comparison lens">
          {(Object.keys(lensCopy) as LensKey[]).map((key) => (
            <button
              aria-pressed={lens === key}
              key={key}
              onClick={() => replaceParams({ lens: key })}
              type="button"
            >
              {lensCopy[key].button}
            </button>
          ))}
        </div>
        <div className={styles.metricChart} aria-labelledby="metric-chart-title metric-chart-note">
          <div className={styles.metricChartHeading}>
            <h3 id="metric-chart-title">{lensCopy[lens].label}</h3>
            <p id="metric-chart-note">{lensCopy[lens].note}</p>
          </div>
          {lens === 'population' || lens === 'energy' ? (
            <ol>
              {numericRows.map(({ profile, value }) => (
                <li className={styles.quantityRow} key={profile.id}>
                  <Link href={`/atlas/${profile.id.toLowerCase()}`}>
                    <span>{profile.id}</span>
                    <strong>{profile.morphology.mythMetaphor}</strong>
                  </Link>
                  <span className={styles.barTrack} aria-hidden="true">
                    <span
                      className={styles.bar}
                      style={
                        {
                          '--metric-accent': profile.accent,
                          width: `${widthScale(value)}%`,
                        } as CSSProperties
                      }
                    />
                  </span>
                  <QuantityComparison dimension={lens} value={value} />
                </li>
              ))}
            </ol>
          ) : lens === 'observability' ? (
            <ol className={styles.categoricalRows}>
              {allScenarioProfiles.map((profile) => (
                <li key={profile.id}>
                  <Link href={`/atlas/${profile.id.toLowerCase()}`}>
                    <span>{profile.id}</span>
                    <strong>{profile.morphology.mythMetaphor}</strong>
                  </Link>
                  <div className={styles.missionCells}>
                    {profile.observations.map(({ id, result, short }) => (
                      <div className={styles.missionCell} data-state={result.status} key={id}>
                        <strong>{short}</strong>
                        <span>
                          {result.signatures.length > 0
                            ? result.signatures.join(' · ')
                            : 'No signature listed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <ol className={styles.categoricalRows}>
              {allScenarioProfiles.map((profile) => (
                <li key={profile.id}>
                  <Link href={`/atlas/${profile.id.toLowerCase()}`}>
                    <span>{profile.id}</span>
                    <strong>{profile.morphology.mythMetaphor}</strong>
                  </Link>
                  <div className={styles.systemTags}>
                    {profile.system.length > 0 ? (
                      profile.system.map(({ id, label }) => <span key={id}>{label}</span>)
                    ) : (
                      <span>No system signature listed in Table 8</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        {(lens === 'population' || lens === 'energy') && <ReferenceEarthNote />}
        <details className={styles.metricDataTable}>
          <summary>Open structured lens table</summary>
          <div className={styles.tableScroller} tabIndex={0}>
            <table>
              <caption>{lensCopy[lens].label} for all scenarios</caption>
              <thead>
                <tr>
                  <th scope="col">Scenario</th>
                  <th scope="col">Source field(s)</th>
                  <th scope="col">Interpretation note</th>
                  <th scope="col">Exact locator</th>
                </tr>
              </thead>
              <tbody>
                {allScenarioProfiles.map((profile) => {
                  const value =
                    lens === 'population' || lens === 'energy'
                      ? numericLensDisplay(lens, numericLensValue(lens, profile))
                      : categoricalLensDisplay(lens, profile);
                  return (
                    <tr key={profile.id}>
                      <th scope="row">
                        {profile.id} · {profile.morphology.mythMetaphor}
                      </th>
                      <td>{value}</td>
                      <td>{lensCopy[lens].note}</td>
                      <td>
                        <ExactLocator sourceRefs={lensSourceRefs(lens, profile)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className={styles.comparisonSection} aria-labelledby="comparison-title">
        <header className={styles.sectionHeader}>
          <p>Aligned canonical fields</p>
          <h2 id="comparison-title">Side-by-side, without a rank.</h2>
        </header>
        {selected.length === 0 ? (
          <p className={styles.emptyComparison}>Select at least one scenario in the index.</p>
        ) : (
          <div className={styles.tableScroller} tabIndex={0}>
            <table className={styles.comparisonTable}>
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
                  <th scope="row">{sourceLink('dataset-morphology-table-5', 'Global factor')}</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.morphology.fieldProvenance.globalFactor}
                        value={profile.morphology.globalFactor}
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">
                    {sourceLink('dataset-morphology-table-5', 'Technology cluster')}
                  </th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.morphology.fieldProvenance.technologyCluster}
                        value={String(profile.morphology.technologyCluster)}
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">
                    {sourceLink('dataset-morphology-table-5', 'Technology factors')}
                  </th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.morphology.fieldProvenance.technologyFactors}
                        value={profile.morphology.technologyFactors.join(', ')}
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Canonical summary</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <SourcedCell field={profile.morphology.canonicalSummary} />
                    </td>
                  ))}
                </tr>
                {(
                  [
                    ['Economy', 'economy'],
                    ['Politics', 'politics'],
                    ['Society', 'society'],
                    ['Technosphere / biosphere relation', 'technosphere'],
                    ['Biosphere distribution', 'biosphere'],
                    ['Spatial distribution', 'spatialDistribution'],
                    ['Development', 'development'],
                    ['Connectivity / highest order', 'connectivity'],
                    ['Smallest scale', 'smallestScale'],
                  ] as const
                ).map(([label, field]) => (
                  <tr key={field}>
                    <th scope="row">{label}</th>
                    {selected.map((profile) => (
                      <td key={profile.id}>
                        <SourcedCell field={profile.morphology[field]} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="row">{sourceLink('dataset-growth-table-9', 'Population')}</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.growth.fieldProvenance.population}
                        value={scientificNotation(profile.growth.population)}
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">{sourceLink('dataset-growth-table-9', 'Annual energy use')}</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.growth.fieldProvenance.annualEnergyUseJ}
                        value={`${scientificNotation(profile.growth.annualEnergyUseJ)} J / year`}
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">{sourceLink('dataset-growth-table-9', 'Growth state')}</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.growth.fieldProvenance.growthState}
                        value={profile.growth.growthState}
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">{sourceLink('dataset-atmosphere-table-1', 'CO₂')}</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.atmosphere.co2?.sourceRefs ?? []}
                        value={
                          profile.atmosphere.co2?.value === null
                            ? 'Published ellipsis'
                            : String(profile.atmosphere.co2?.value) + ' ppm'
                        }
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">{sourceLink('dataset-system-table-8', 'System signatures')}</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.systemCellProvenance}
                        value={
                          profile.system.map(({ label }) => label).join(', ') ||
                          'None listed in Table 8'
                        }
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">
                    {sourceLink('dataset-observability-figure-6', 'Mission cells')}
                  </th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.observations.flatMap(({ result }) => result.sourceRefs)}
                        value={categoricalLensDisplay('observability', profile)}
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">{sourceLink('dataset-collapse-table-4', 'Collapse outcome')}</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.collapse.fieldProvenance.reportedResults.summary}
                        value={profile.collapse.reportedResults.summary}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className={styles.comparisonNote}>
          “Published ellipsis,” numeric zero, “none listed,” and “not evaluated” remain distinct.
          Mission cells and system categories remain separate source fields; they are never reduced
          to scenario scores.
        </p>
      </section>
    </>
  );
}
