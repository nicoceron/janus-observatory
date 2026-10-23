'use client';

import type { Sourced } from '@janus/domain/evidence';
import { observingMissionIds, type ObservingMissionId } from '@janus/domain/scientific-dataset';
import { scaleLinear, scaleLog, scalePoint } from 'd3';
import Link from '../components/AppLink';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';

import {
  allScenarioProfiles,
  earthAtmosphere,
  getScenarioProfile,
  instrumentCopy,
  sourceRefHref,
  sourceRefLabel,
} from '../../lib/canonical-core';
import { useReducedMotionPreference } from '../components/MotionPreference';
import styles from './observatory.module.css';
import { WorldPortrait } from '../components/WorldPortrait';
import { worldSignals } from '../../lib/world-signals';
import { GuidedObservation, isLessonStep } from './GuidedObservation';
import { InstrumentExplanation } from './InstrumentExplanation';
import { ScenarioEvidence } from './ScenarioEvidence';
import learningStyles from './learning.module.css';
import { plainReading } from '../../lib/plain-labels';

type ScenarioId = (typeof allScenarioProfiles)[number]['id'];

const atmosphereChart = {
  width: 960,
  labelWidth: 218,
  plotEnd: 894,
  rowHeight: 54,
  top: 68,
} as const;

const modalityChart = {
  width: 960,
  height: 340,
  start: 82,
  end: 878,
} as const;

function isScenarioId(value: string | null): value is ScenarioId {
  return allScenarioProfiles.some(({ id }) => id === value);
}

function isInstrumentId(value: string | null): value is ObservingMissionId {
  return observingMissionIds.some((id) => id === value);
}

function formatAtmosphereValue(value: number | null, unit: string) {
  if (value === null) return 'Not given';
  return `${new Intl.NumberFormat('en', { maximumSignificantDigits: 4 }).format(value)} ${unit}`;
}

function atmospherePosition(row: (typeof earthAtmosphere.rows)[number], value: number | null) {
  if (value === null) return atmosphereChart.labelWidth;
  const values = Object.values(row.values).filter(
    (candidate): candidate is number => candidate !== null,
  );
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (minimum === maximum) return (atmosphereChart.labelWidth + atmosphereChart.plotEnd) / 2;

  const range: [number, number] = [atmosphereChart.labelWidth, atmosphereChart.plotEnd];
  if (row.id === 'mean_temperature') {
    return scaleLinear().domain([minimum, maximum]).range(range).clamp(true)(value);
  }
  return scaleLog().domain([minimum, maximum]).range(range).clamp(true)(value);
}

function AtmosphereView({ accent, scenarioId }: { accent: string; scenarioId: ScenarioId }) {
  const selectedColumn = earthAtmosphere.columns.find(({ id }) => id === scenarioId)!;
  const referenceColumns = earthAtmosphere.columns.filter(({ kind }) => kind === 'reference');
  const height = atmosphereChart.top + earthAtmosphere.rows.length * atmosphereChart.rowHeight + 26;

  return (
    <section
      className={styles.atmosphereSection}
      aria-labelledby="atmosphere-title"
      style={{ '--signal': accent } as CSSProperties}
    >
      <header className={styles.sectionHeader}>
        <h2 id="atmosphere-title">One atmosphere. Fourteen measures.</h2>
        <p>
          The air the observing study gives this future’s Earth, next to its two reference Earths.
          Each row has its own scale, so compare positions within a row, not across rows. This is
          not a spectrum and not a score.
        </p>
      </header>

      <div className={styles.atmosphereLegend} aria-label="Atmosphere chart marker legend">
        <span>
          <i className={styles.selectedMarker} aria-hidden="true" /> {selectedColumn.label}
        </span>
        {referenceColumns.map((column, index) => (
          <span key={column.id}>
            <i
              className={index === 0 ? styles.referenceCircle : styles.referenceSquare}
              aria-hidden="true"
            />{' '}
            {column.label}
          </span>
        ))}
        <span>
          <i className={styles.nullMarker} aria-hidden="true" /> Not given
        </span>
      </div>
      <p className={styles.chartHint}>Swipe sideways to see each full row.</p>

      <div aria-label="Atmosphere chart" className={styles.chartScroller} tabIndex={0}>
        <svg
          aria-labelledby="atmosphere-svg-title atmosphere-svg-description"
          className={styles.atmosphereChart}
          role="img"
          viewBox={`0 0 ${atmosphereChart.width} ${height}`}
        >
          <title id="atmosphere-svg-title">{`Atmospheric fingerprint for ${scenarioId}`}</title>
          <desc id="atmosphere-svg-description">
            Fourteen rows, each on its own scale, compare {scenarioId} with the study’s two
            reference Earths. Every row can be focused with the keyboard and reads out exact values.
            A cross means the paper gives no value, not zero.
          </desc>
          <text className={styles.chartColumnLabel} x="0" y="28">
            Gas or property
          </text>
          <text
            className={styles.chartColumnLabel}
            textAnchor="end"
            x={atmosphereChart.plotEnd}
            y="28"
          >
            Each row has its own scale
          </text>
          {earthAtmosphere.rows.map((row, index) => {
            const y = atmosphereChart.top + index * atmosphereChart.rowHeight;
            const value = row.values[scenarioId];
            const referenceValues = referenceColumns.map((column) => ({
              ...column,
              value: row.values[column.id] ?? null,
            }));
            const announcedReferences = referenceValues
              .map(
                (reference) =>
                  `${reference.label}: ${formatAtmosphereValue(reference.value, row.unit)}`,
              )
              .join('. ');
            return (
              <g
                aria-label={`${row.label}. ${selectedColumn.label}: ${formatAtmosphereValue(value, row.unit)}. ${announcedReferences}.`}
                className={styles.atmosphereRow}
                key={row.id}
                role="group"
                tabIndex={0}
              >
                <line
                  className={styles.rowRule}
                  x1="0"
                  x2={atmosphereChart.plotEnd}
                  y1={y + 22}
                  y2={y + 22}
                />
                <text className={styles.rowLabel} x="0" y={y}>
                  {row.label}
                </text>
                <text className={styles.rowUnit} x="0" y={y + 15}>
                  {row.unit}
                </text>
                <line
                  className={styles.scaleTrack}
                  x1={atmosphereChart.labelWidth}
                  x2={atmosphereChart.plotEnd}
                  y1={y}
                  y2={y}
                />
                {referenceValues.map((reference, referenceIndex) => {
                  if (reference.value === null) return null;
                  const x = atmospherePosition(row, reference.value);
                  return referenceIndex === 0 ? (
                    <circle
                      className={styles.referencePoint}
                      cx={x}
                      cy={y}
                      key={reference.id}
                      r="5"
                    />
                  ) : (
                    <rect
                      className={styles.referencePoint}
                      height="9"
                      key={reference.id}
                      width="9"
                      x={x - 4.5}
                      y={y - 4.5}
                    />
                  );
                })}
                {value === null ? (
                  <g className={styles.chartNull}>
                    <line
                      x1={atmosphereChart.labelWidth - 5}
                      x2={atmosphereChart.labelWidth + 5}
                      y1={y - 5}
                      y2={y + 5}
                    />
                    <line
                      x1={atmosphereChart.labelWidth - 5}
                      x2={atmosphereChart.labelWidth + 5}
                      y1={y + 5}
                      y2={y - 5}
                    />
                    <text x={atmosphereChart.labelWidth + 14} y={y + 4}>
                      Not given
                    </text>
                  </g>
                ) : (
                  <g
                    className={styles.scenarioPoint}
                    style={
                      {
                        '--point-x': `${atmospherePosition(row, value)}px`,
                      } as CSSProperties
                    }
                  >
                    <line y1={y - 10} y2={y + 10} />
                    <circle cy={y} r="6" />
                    <text textAnchor="middle" y={y - 14}>
                      {new Intl.NumberFormat('en', { maximumSignificantDigits: 4 }).format(value)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <details className={styles.chartData}>
        <summary>Show exact values and sources</summary>
        <div className={styles.tableScroller} tabIndex={0}>
          <table>
            <caption>Atmosphere values for {scenarioId} and the reference Earths</caption>
            <thead>
              <tr>
                <th scope="col">Gas or property</th>
                <th scope="col">Unit</th>
                <th scope="col">{scenarioId}</th>
                {referenceColumns.map((column) => (
                  <th scope="col" key={column.id}>
                    {column.label}
                  </th>
                ))}
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {earthAtmosphere.rows.map((row) => {
                const sourceRef = row.fieldProvenance.values[scenarioId][0]!;
                return (
                  <tr key={row.id}>
                    <th scope="row">{row.label}</th>
                    <td>{row.unit}</td>
                    <td>{formatAtmosphereValue(row.values[scenarioId], row.unit)}</td>
                    {referenceColumns.map((column) => (
                      <td key={column.id}>
                        {formatAtmosphereValue(row.values[column.id] ?? null, row.unit)}
                      </td>
                    ))}
                    <td>
                      <a href={sourceRefHref(sourceRef)} rel="noreferrer" target="_blank">
                        {sourceRefLabel(sourceRef)} ↗
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function ModalityView({
  scenarioId,
  instrumentId,
}: {
  scenarioId: ScenarioId;
  instrumentId: ObservingMissionId;
}) {
  const profile = allScenarioProfiles.find(({ id }) => id === scenarioId)!;
  const x = scalePoint<ObservingMissionId>()
    .domain([...observingMissionIds])
    .range([modalityChart.start, modalityChart.end]);

  return (
    <div className={styles.modalityPanel} style={{ '--signal': profile.accent } as CSSProperties}>
      <svg
        aria-labelledby="modality-svg-title modality-svg-description"
        className={styles.modalityChart}
        role="img"
        viewBox={`0 0 ${modalityChart.width} ${modalityChart.height}`}
      >
        <title id="modality-svg-title">{`What five instruments could detect in ${scenarioId}`}</title>
        <desc id="modality-svg-description">
          Five instruments. A filled circle means the observing study lists at least one sign for
          that instrument. A hollow circle means it lists none, not that the future has no
          technology. The marked circle is your selected instrument.
        </desc>
        <line
          className={styles.modalitySpine}
          x1={modalityChart.start}
          x2={modalityChart.end}
          y1="132"
          y2="132"
        />
        {profile.observations.map((item, index) => {
          const pointX = x(item.id)!;
          const hasSignatures = item.result.signatures.length > 0;
          const isSelected = item.id === instrumentId;
          return (
            <g
              aria-label={`${item.plainLabel}. ${hasSignatures ? `Listed: ${item.result.signatures.join('; ')}` : 'Nothing listed; not evidence of no technology'}.${isSelected ? ' Selected instrument.' : ''}`}
              className={isSelected ? styles.modalitySelected : styles.modalityNode}
              key={item.id}
              role="group"
              tabIndex={0}
              transform={`translate(${pointX} 0)`}
            >
              {isSelected ? (
                <path className={styles.selectionCaret} d="M -8 38 L 8 38 L 0 50 Z" />
              ) : null}
              <text className={styles.modalityIndex} textAnchor="middle" y="24">
                0{index + 1}
              </text>
              <circle className={styles.modalityHalo} cy="132" r="41" />
              {hasSignatures ? (
                <>
                  <circle className={styles.modalityCore} cy="132" r="14" />
                  <circle className={styles.modalityPulse} cy="132" r="25" />
                </>
              ) : (
                <>
                  <circle className={styles.modalityEmpty} cy="132" r="14" />
                  <line className={styles.modalityDash} x1="-7" x2="7" y1="132" y2="132" />
                </>
              )}
              <text className={styles.modalityName} textAnchor="middle" y="201">
                {item.name}
              </text>
              <text className={styles.modalityMode} textAnchor="middle" y="219">
                {item.mode}
              </text>
              <text className={styles.modalityState} textAnchor="middle" y="254">
                {hasSignatures ? 'Signs listed' : 'Nothing listed'}
              </text>
              {item.result.signatures.slice(0, 2).map((signature, signatureIndex) => (
                <text
                  className={styles.modalitySignature}
                  key={signature}
                  textAnchor="middle"
                  y={281 + signatureIndex * 18}
                >
                  {signature.length > 25 ? `${signature.slice(0, 23)}…` : signature}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
      <ol
        className={styles.modalityText}
        aria-label={`What each instrument could detect in ${scenarioId}`}
      >
        {profile.observations.map((item) => (
          <li data-selected={item.id === instrumentId} key={item.id}>
            <strong>{item.plainLabel}</strong>
            <span>{item.result.signatures.join('; ') || 'Nothing listed'}</span>
            <small>{item.result.caveat}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}

function AssumptionValue({ field }: { field: Sourced<string> }) {
  const sourceRef = field.sourceRefs[0];
  return (
    <>
      <span>{plainReading(field).value}</span>
      {sourceRef ? (
        <a href={sourceRefHref(sourceRef)} rel="noreferrer" target="_blank">
          {sourceRefLabel(sourceRef)} ↗
        </a>
      ) : null}
    </>
  );
}

export function ObservatoryExplorer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotionPreference();
  const scenarioValue = searchParams.get('scenario');
  const instrumentValue = searchParams.get('instrument');
  const lessonValue = searchParams.get('lesson');
  const lessonStep = isLessonStep(lessonValue) ? lessonValue : null;
  const firstValue = searchParams.get('first');
  const firstInstrumentId = isInstrumentId(firstValue)
    ? firstValue
    : 'habitable_worlds_observatory';
  const scenarioId: ScenarioId = isScenarioId(scenarioValue) ? scenarioValue : 'S1';
  const selectedInstrumentId: ObservingMissionId = isInstrumentId(instrumentValue)
    ? instrumentValue
    : 'habitable_worlds_observatory';
  const instrumentId =
    lessonStep === 'compare' && selectedInstrumentId === firstInstrumentId
      ? firstInstrumentId === 'deep_space_probes'
        ? 'habitable_worlds_observatory'
        : 'deep_space_probes'
      : selectedInstrumentId;
  const wasInLesson = useRef(Boolean(lessonStep));
  useEffect(() => {
    if (wasInLesson.current && !lessonStep) document.getElementById('alien-console-title')?.focus();
    wasInLesson.current = Boolean(lessonStep);
  }, [lessonStep]);
  const showData = searchParams.get('view') === 'data';
  const profile = useMemo(
    () => allScenarioProfiles.find(({ id }) => id === scenarioId)!,
    [scenarioId],
  );
  const observation = profile.observations.find(({ id }) => id === instrumentId)!;

  function replaceParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [name, value] of Object.entries(updates)) {
      if (value) next.set(name, value);
      else next.delete(name);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }
  function replaceParam(name: 'scenario' | 'instrument' | 'view', value?: string) {
    replaceParams({ [name]: value });
  }

  if (lessonStep)
    return (
      <GuidedObservation
        step={lessonStep}
        profile={profile}
        instrumentId={instrumentId}
        firstInstrumentId={firstInstrumentId}
        guess={searchParams.get('guess')}
        onChange={replaceParams}
      />
    );

  return (
    <>
      <section className={learningStyles.intro} aria-labelledby="guided-intro-title">
        <h2 id="guided-intro-title">Would you recognize a civilization?</h2>
        <p>
          Pick a future, guess what a telescope would see, then compare two instruments. It takes
          about a minute, and it shows why a quiet sky can hide a busy civilization.
        </p>
        <div className={learningStyles.actions}>
          <button
            type="button"
            onClick={() =>
              replaceParams({
                lesson: 'predict',
                scenario: isScenarioId(scenarioValue) ? scenarioValue : 'S9',
                first: undefined,
                guess: undefined,
              })
            }
          >
            Start guided observation
          </button>
          <a href="#alien-console-title">Skip to free exploration</a>
        </div>
      </section>
      <section
        aria-labelledby="alien-console-title"
        className={styles.explorer}
        data-reduced-motion={reducedMotion}
        style={
          {
            '--signal': profile.accent,
          } as CSSProperties
        }
      >
        <header className={styles.consoleHeader}>
          <div>
            <h2 id="alien-console-title" tabIndex={-1}>
              Choose how to look
            </h2>
          </div>
          <p>
            Looking at our Solar System in future {scenarioId}, from another star. Results come from
            the observing study; there are no scores.
          </p>
        </header>

        <div className={styles.controls}>
          <fieldset>
            <legend className={styles.controlLegend}>1. Pick a future</legend>
            <div className={styles.scenarioChoices}>
              {allScenarioProfiles.map((candidate) => (
                <button
                  aria-label={`${candidate.id}: ${candidate.morphology.mythMetaphor}`}
                  aria-pressed={candidate.id === scenarioId}
                  key={candidate.id}
                  onClick={() => replaceParam('scenario', candidate.id)}
                  style={{ '--choice-accent': candidate.accent } as CSSProperties}
                  type="button"
                >
                  {candidate.id}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={styles.controlLegend}>2. Pick an instrument</legend>
            <div className={styles.instrumentChoices}>
              {observingMissionIds.map((id) => (
                <button
                  aria-pressed={id === instrumentId}
                  data-telemetry-event="instrument_select"
                  data-telemetry-value={id}
                  key={id}
                  onClick={() => replaceParam('instrument', id)}
                  type="button"
                >
                  <strong>{instrumentCopy[id].plainLabel}</strong>
                  <span>{instrumentCopy[id].mode}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className={styles.actions}>
            <button
              aria-controls="observatory-data"
              aria-expanded={showData}
              onClick={() => replaceParam('view', showData ? undefined : 'data')}
              type="button"
            >
              {showData ? 'Hide the table' : 'Show as a table'}
            </button>
            <Link href={`/atlas/${scenarioId.toLowerCase()}`}>More about this future</Link>
          </div>
        </div>

        <div className={styles.viewport} data-observation-viewport>
          <WorldPortrait
            world={Number(scenarioId.slice(1)) - 1}
            signals={worldSignals(getScenarioProfile(scenarioId))}
          />
          <ScenarioEvidence scenarioId={scenarioId} instrumentId={instrumentId} />
        </div>
        <InstrumentExplanation instrumentId={instrumentId} />

        <aside className={styles.assumptions} aria-labelledby="assumption-title">
          <div className={styles.assumptionsHeader}>
            <strong id="assumption-title">What the study assumes</strong>
            <span>These are fixed to the study’s own choices.</span>
          </div>
          <dl className={styles.assumptionGrid}>
            <div>
              <dt>Distance</dt>
              <dd>
                <AssumptionValue field={observation.result.assumptions.distance} />
              </dd>
            </div>
            <div>
              <dt>Observing time</dt>
              <dd>
                <AssumptionValue field={observation.result.assumptions.integrationTime} />
              </dd>
            </div>
            <div>
              <dt>Target system</dt>
              <dd>
                <AssumptionValue field={observation.result.assumptions.host} />
              </dd>
            </div>
            <div>
              <dt>Instrument</dt>
              <dd>
                <AssumptionValue field={observation.result.assumptions.concept} />
              </dd>
            </div>
          </dl>
        </aside>
      </section>

      <AtmosphereView accent={profile.accent} scenarioId={scenarioId} />

      {showData && (
        <section className={styles.dataView} id="observatory-data" aria-labelledby="data-title">
          <header className={styles.sectionHeader}>
            <h2 id="data-title">The same results, as a table.</h2>
            <p>
              The artwork above is an illustration. This table is the exact record from the
              observing study.
            </p>
          </header>
          <div className={styles.tableScroller} tabIndex={0}>
            <table>
              <caption>What each instrument could detect in {scenarioId}</caption>
              <thead>
                <tr>
                  <th scope="col">Instrument</th>
                  <th scope="col">Listed signs</th>
                  <th scope="col">What it means</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {profile.observations.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">{item.plainLabel}</th>
                    <td>{item.result.signatures.join('; ') || 'Nothing listed'}</td>
                    <td>{item.result.caveat}</td>
                    <td>
                      <a
                        href={sourceRefHref(item.result.sourceRefs[0]!)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {sourceRefLabel(item.result.sourceRefs[0]!)} ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className={styles.matrixSection} aria-labelledby="matrix-title">
        <header className={styles.sectionHeader}>
          <h2 id="matrix-title">All ten futures, all five instruments.</h2>
          <p>Each cell is a yes-or-no from the observing study, not a score.</p>
        </header>
        <div className={styles.legend} aria-label="Legend">
          <div>
            <strong>Signs listed</strong>
            <span>The study says this instrument could pick these up, under its assumptions.</span>
          </div>
          <div>
            <strong>Nothing listed</strong>
            <span>
              The study lists no sign for this instrument. That doesn’t mean no technology.
            </span>
          </div>
        </div>
        <ModalityView instrumentId={instrumentId} scenarioId={scenarioId} />
        <div className={styles.tableScroller} tabIndex={0}>
          <table>
            <caption>What each instrument could detect, for every future</caption>
            <thead>
              <tr>
                <th scope="col">Future</th>
                {observingMissionIds.map((id) => (
                  <th scope="col" key={id}>
                    {instrumentCopy[id].name}
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
                      className={item.result.signatures.length > 0 ? styles.filled : styles.blank}
                      key={item.id}
                    >
                      {item.result.signatures.join('; ') || 'Nothing listed'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <a
          className={styles.sourceLink}
          data-telemetry-event="source_link"
          data-telemetry-value="JANUS-PAPER-03"
          href="https://arxiv.org/pdf/2511.20329v2#page=10"
          rel="noreferrer"
          target="_blank"
        >
          Source: the observing study, Figure 6 ↗
        </a>
      </section>
    </>
  );
}
