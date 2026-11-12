'use client';

import { max, scaleLog } from 'd3';
import type { SourceRef, Sourced } from '@janus/domain';
import Link from '../components/AppLink';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, type CSSProperties } from 'react';

import {
  allScenarioProfiles,
  instrumentCopy,
  scientificNotation,
  sourceRefHref,
  sourceRefLabel,
} from '../../lib/canonical-core';
import styles from './atlas.module.css';
import {
  QuantityComparison,
  ReferenceEarthNote,
  readableNumber,
} from '../components/QuantityComparison';
import { growthLabel, morphologyRows, plainReading } from '../../lib/plain-labels';

type ScenarioId = (typeof allScenarioProfiles)[number]['id'];
type LensKey = 'population' | 'energy' | 'observability' | 'system';
type NumericLensKey = Extract<LensKey, 'population' | 'energy'>;

const maxComparisons = 3;

const lensCopy: Record<LensKey, { button: string; label: string; note: string }> = {
  population: {
    button: 'Population',
    label: 'Population in 1,000 years',
    note: 'Everyone, on every world they live on. Bars use a log scale: each step is ten times the last.',
  },
  energy: {
    button: 'Energy use',
    label: 'Energy used per year',
    note: 'Total energy used each year, in joules, across every world. Bars use a log scale.',
  },
  observability: {
    button: 'What telescopes see',
    label: 'What each instrument could detect',
    note: '“Nothing listed” means the observing study lists no sign for that instrument—not that the civilization has no technology.',
  },
  system: {
    button: 'Signs beyond Earth',
    label: 'Signs of technology across the Solar System',
    note: 'The kinds of off-world signs the scenario study lists for each future, in its own words. Not a score.',
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
    : `${scientificNotation(value)} joules a year`;
}

function categoricalLensDisplay(
  lens: Exclude<LensKey, NumericLensKey>,
  profile: (typeof allScenarioProfiles)[number],
) {
  if (lens === 'observability') {
    return profile.observations
      .map(
        ({ result, name }) =>
          `${name}: ${
            result.signatures.length > 0 ? result.signatures.join(', ') : 'nothing listed'
          }`,
      )
      .join('; ');
  }
  return profile.system.map(({ label }) => label).join('; ') || 'None listed';
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

function ExactLocator({ sourceRefs }: { sourceRefs: SourceRef[] }) {
  const first = sourceRefs[0];
  if (!first) return null;
  return (
    <a className={styles.fieldSource} href={sourceRefHref(first)} rel="noreferrer" target="_blank">
      {sourceRefLabel(first)} <span aria-hidden="true">↗</span>
    </a>
  );
}

function SourcedCell({ field }: { field: Sourced<unknown> }) {
  const reading = plainReading(field);
  return (
    <>
      <span>{reading.value}</span>
      {reading.paper ? <small>In the paper: {reading.paper}</small> : null}
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
          <h2 id="atlas-picker-title">Pick up to three futures to compare.</h2>
          <div className={styles.headerAside}>
            <p>
              Listed in the study’s own order, S1 to S10. The order isn’t a ranking, and nothing
              here is a score.
            </p>
            <span aria-live="polite">
              {selectedIds.length} of {maxComparisons} selected
            </span>
          </div>
        </header>

        <div className={styles.scenarioIndex}>
          <div className={styles.indexLabels} aria-hidden="true">
            <span>Future</span>
            <span>In 1,000 years</span>
            <span />
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
                  <strong>{growthLabel(profile.growth.growthState)}</strong>
                  <span>{readableNumber(profile.growth.population)} people</span>
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
                  <Link href={`/atlas/${profile.id.toLowerCase()}`}>Explore</Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.metricSection} aria-labelledby="metric-explorer-title">
        <header className={styles.sectionHeader}>
          <h2 id="metric-explorer-title">One dimension at a time.</h2>
          <div className={styles.headerAside}>
            <p>
              Look at the ten futures one measure at a time. We never fold them into an overall
              score or rank.
            </p>
          </div>
        </header>
        <div className={styles.metricControls} role="group" aria-label="Measure">
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
                    {profile.observations.map(({ id, result }) => (
                      <div className={styles.missionCell} data-state={result.status} key={id}>
                        <strong>{instrumentCopy[id].name}</strong>
                        <span>
                          {result.signatures.length > 0
                            ? result.signatures.join(', ')
                            : 'Nothing listed'}
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
                      <span>None listed</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        {(lens === 'population' || lens === 'energy') && <ReferenceEarthNote />}
        <details className={styles.metricDataTable}>
          <summary>Show as a table</summary>
          <div className={styles.tableScroller} tabIndex={0}>
            <table>
              <caption>{lensCopy[lens].label}, all ten futures</caption>
              <thead>
                <tr>
                  <th scope="col">Future</th>
                  <th scope="col">Value</th>
                  <th scope="col">Source</th>
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
          <h2 id="comparison-title">Side by side.</h2>
        </header>
        {selected.length === 0 ? (
          <p className={styles.emptyComparison}>Pick a future in the list above to see it here.</p>
        ) : (
          <div className={styles.tableScroller} tabIndex={0}>
            <table className={styles.comparisonTable}>
              <caption>Comparing {selectedIds.join(', ')}</caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="srOnly">Trait</span>
                  </th>
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
                  <th scope="row">In short</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <SourcedCell field={profile.morphology.canonicalSummary} />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Population in 1,000 years</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.growth.fieldProvenance.population}
                        value={`${readableNumber(profile.growth.population)} people`}
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Energy used per year</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.growth.fieldProvenance.annualEnergyUseJ}
                        value={`${scientificNotation(profile.growth.annualEnergyUseJ)} joules`}
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Growth</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.growth.fieldProvenance.growthState}
                        value={growthLabel(profile.growth.growthState)}
                      />
                    </td>
                  ))}
                </tr>
                {morphologyRows.map(([label, field]) => (
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
                  <th scope="row">Carbon dioxide in the air</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.atmosphere.co2?.sourceRefs ?? []}
                        value={
                          profile.atmosphere.co2?.value === null
                            ? 'Not given'
                            : `${profile.atmosphere.co2?.value?.toLocaleString('en')} ppm`
                        }
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Signs beyond Earth</th>
                  {selected.map((profile) => (
                    <td key={profile.id}>
                      <ProvenancedCell
                        sourceRefs={profile.systemCellProvenance}
                        value={profile.system.map(({ label }) => label).join(', ') || 'None listed'}
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">What telescopes see</th>
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
                  <th scope="row">Collapse and recovery</th>
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
          “Not given” means the paper leaves that value out. It isn’t zero.
        </p>
      </section>
    </>
  );
}
