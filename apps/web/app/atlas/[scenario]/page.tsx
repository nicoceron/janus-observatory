import type { SourceRef, Sourced } from '@janus/domain/evidence';
import { scenarioIds, type ScenarioId } from '@janus/domain/scenario';
import type { Metadata } from 'next';
import Link from '../../components/AppLink';
import { notFound } from 'next/navigation';

import assetLedger from '../../../../../data/assets/ledger.json';
import { getScenarioProfile, sourceRefHref, sourceRefLabel } from '../../../lib/canonical';
import { growthLabel, morphologyRows, plainReading } from '../../../lib/plain-labels';
import { WorldPortrait } from '../../components/WorldPortrait';
import { worldSignals } from '../../../lib/world-signals';
import { QuantityComparison, ReferenceEarthNote } from '../../components/QuantityComparison';
import { InnerPage } from '../../components/InnerPage';
import styles from '../atlas.module.css';

type ScenarioPageProps = { params: Promise<{ scenario: string }> };

export const dynamicParams = false;

function parseScenario(value: string): ScenarioId | null {
  const candidate = value.toUpperCase();
  return scenarioIds.includes(candidate as ScenarioId) ? (candidate as ScenarioId) : null;
}

function displayNullable(value: number | null, unit?: string) {
  return value === null ? 'Not given' : `${value}${unit ? ` ${unit}` : ''}`;
}

const precisionLabels: Record<string, string> = {
  exact_text: 'Exact, from the paper’s text',
  approximate_text: 'Approximate, from the paper’s text',
  figure_only: 'Only shown in a chart',
};

function ExactSource({ sourceRefs }: { sourceRefs: SourceRef[] }) {
  const first = sourceRefs[0];
  if (!first) return null;
  return (
    <a className={styles.recordSource} href={sourceRefHref(first)} rel="noreferrer" target="_blank">
      {sourceRefLabel(first)} ↗
    </a>
  );
}

function FieldValue({ field }: { field: Sourced<unknown> }) {
  const reading = plainReading(field);
  return (
    <>
      <span>{reading.value}</span>
      {reading.paper ? <small>In the paper: {reading.paper}</small> : null}
      <ExactSource sourceRefs={field.sourceRefs} />
    </>
  );
}

export function generateStaticParams() {
  return scenarioIds.map((scenario) => ({ scenario: scenario.toLowerCase() }));
}

export async function generateMetadata({ params }: ScenarioPageProps): Promise<Metadata> {
  const scenarioId = parseScenario((await params).scenario);
  if (!scenarioId) return {};
  const profile = getScenarioProfile(scenarioId);
  const title = `${scenarioId} · ${profile.morphology.mythMetaphor}`;
  const description = `${profile.morphology.mythMetaphor}, Project Janus future ${scenarioId}: what it is like, how large it grows, what telescopes could see, and how it weathers collapse, with sources.`;
  return {
    title,
    description,
    alternates: { canonical: `/atlas/${scenarioId.toLowerCase()}` },
    openGraph: {
      title: `${title} · Janus Observatory`,
      description,
      url: `/atlas/${scenarioId.toLowerCase()}`,
    },
  };
}

export default async function ScenarioPage({ params }: ScenarioPageProps) {
  const scenarioId = parseScenario((await params).scenario);
  if (!scenarioId) notFound();
  const profile = getScenarioProfile(scenarioId);
  const artifacts = assetLedger.entries.filter(
    ({ kind, scenarioId: artifactScenario }) =>
      kind === 'artifact' && artifactScenario === scenarioId,
  );
  const growthRate =
    profile.growth.annualGrowthRate === null
      ? 'No rate given'
      : `${(profile.growth.annualGrowthRate * 100).toFixed(2)}% a year`;

  return (
    <InnerPage
      eyebrow={profile.id}
      lede={profile.morphology.canonicalSummary.value ?? `Explore ${profile.id}.`}
      title={profile.morphology.mythMetaphor}
    >
      <nav className={styles.recordNav} aria-label="Other futures">
        {scenarioIds.map((id) => (
          <Link
            aria-current={id === profile.id ? 'page' : undefined}
            href={`/atlas/${id.toLowerCase()}`}
            key={id}
          >
            {id}
          </Link>
        ))}
      </nav>

      <section className={styles.recordHero} aria-label={`${profile.id} at a glance`}>
        <WorldPortrait world={Number(profile.id.slice(1)) - 1} signals={worldSignals(profile)} />
        <dl className={styles.recordLedger}>
          <div>
            <dt>Population in 1,000 years</dt>
            <dd>
              <QuantityComparison dimension="population" value={profile.growth.population} />
            </dd>
          </div>
          <div>
            <dt>Energy used per year</dt>
            <dd>
              <QuantityComparison dimension="energy" value={profile.growth.annualEnergyUseJ} />
            </dd>
          </div>
          <div>
            <dt>Trend</dt>
            <dd>{growthLabel(profile.growth.growthState)}</dd>
          </div>
          <div>
            <dt>Growth rate</dt>
            <dd>{growthRate}</dd>
          </div>
        </dl>
      </section>
      <ReferenceEarthNote />
      <a
        className={styles.recordSource}
        data-telemetry-event="source_link"
        data-telemetry-value="JANUS-PAPER-01"
        href="https://arxiv.org/pdf/2409.00067v3#page=18"
        rel="noreferrer"
        target="_blank"
      >
        Source: the scenario study, Table 9 ↗
      </a>

      <section className={styles.recordSection} aria-labelledby="morphology-record-title">
        <header className={styles.recordSectionHeader}>
          <h2 id="morphology-record-title">What this future is like.</h2>
          <p>
            How the scenario study describes this civilization. Where it offers more than one
            option, both are shown. Each line links to the table it came from.
          </p>
        </header>
        <div className={styles.tableScroller} tabIndex={0}>
          <table>
            <caption>Profile of {profile.id}</caption>
            <tbody>
              {morphologyRows.map(([label, key]) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>
                    <FieldValue field={profile.morphology[key]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.recordSection} aria-labelledby="observation-record-title">
        <header className={styles.recordSectionHeader}>
          <h2 id="observation-record-title">What a telescope could see.</h2>
          <p>
            Five instruments, from the observing study. “Nothing listed” means the study lists no
            sign for that instrument—not that this civilization has no technology.
          </p>
        </header>
        <div className={styles.observationList}>
          {profile.observations.map((observation, index) => (
            <article className={styles.observationRow} key={observation.id}>
              <span className={styles.observationIndex}>{String(index + 1).padStart(2, '0')}</span>
              <h3>{observation.plainLabel}</h3>
              {observation.result.signatures.length > 0 ? (
                <ul>
                  {observation.result.signatures.map((signature) => (
                    <li key={signature}>{signature}</li>
                  ))}
                </ul>
              ) : (
                <p>Nothing listed for this instrument.</p>
              )}
              <span className={styles.observationState}>
                {observation.label}
                <br />
                {observation.mode}
              </span>
            </article>
          ))}
        </div>
        <a
          className={styles.recordSource}
          data-telemetry-event="source_link"
          data-telemetry-value="JANUS-PAPER-03"
          href="https://arxiv.org/pdf/2511.20329v2#page=10"
          rel="noreferrer"
          target="_blank"
        >
          Source: the observing study, Figure 6 ↗
        </a>
      </section>

      <section className={styles.recordSection} aria-labelledby="planetary-record-title">
        <header className={styles.recordSectionHeader}>
          <h2 id="planetary-record-title">Marks on each world.</h2>
          <p>
            Pollution, night lights, reshaped land, satellites and haze on Earth, the Moon, Mars and
            Venus, compared with Earth today. Each kind of mark keeps its own units; we don’t squash
            them onto one scale.
          </p>
        </header>
        <div className={styles.tableScroller} tabIndex={0}>
          <table>
            <caption>Marks on each world in {profile.id}</caption>
            <thead>
              <tr>
                <th scope="col">World</th>
                <th scope="col">Mark</th>
                <th scope="col">Amount</th>
                <th scope="col">Measured as</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {profile.planetary.map((row) => (
                <tr key={`${row.signatureId}-${row.body}`}>
                  <th scope="row">{row.body}</th>
                  <td>
                    {row.signatureLabel}
                    {row.annotations?.length ? <small>{row.annotations.join(' ')}</small> : null}
                  </td>
                  <td>{displayNullable(row.value)}</td>
                  <td>{row.unit}</td>
                  <td>
                    <ExactSource sourceRefs={row.sourceRefs} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.recordSection} aria-labelledby="trajectory-record-title">
        <header className={styles.recordSectionHeader}>
          <h2 id="trajectory-record-title">Beyond Earth, and over time.</h2>
          <p>
            Signs of technology across the Solar System come from the scenario study. Collapse and
            recovery come from a separate study that simulates each future for 1,000 years.
          </p>
        </header>
        <div className={styles.twoColumnRecord}>
          <div>
            <h3>Signs beyond Earth</h3>
            {profile.system.length > 0 ? (
              <ul>
                {profile.system.map((item) => (
                  <li key={item.id}>{item.label}</li>
                ))}
              </ul>
            ) : (
              <p>None listed.</p>
            )}
            <ExactSource sourceRefs={profile.systemCellProvenance} />
          </div>
          <div>
            <h3>Collapse and recovery</h3>
            <p>{profile.collapse.reportedResults.summary}</p>
            <dl>
              <div>
                <dt>Time spent active</dt>
                <dd>
                  {profile.collapse.reportedResults.meanDutyCycle === null
                    ? 'Not stated in the text'
                    : `${Math.round(profile.collapse.reportedResults.meanDutyCycle * 100)}% on average`}
                </dd>
              </div>
              <div>
                <dt>Collapses</dt>
                <dd>
                  {profile.collapse.reportedResults.meanCollapseCount === null
                    ? 'Only shown in a chart'
                    : `About ${profile.collapse.reportedResults.meanCollapseCount} on average`}
                </dd>
              </div>
              <div>
                <dt>How precise</dt>
                <dd>
                  {precisionLabels[profile.collapse.reportedResults.precision] ??
                    profile.collapse.reportedResults.precision}
                </dd>
              </div>
            </dl>
            <ExactSource sourceRefs={profile.collapse.fieldProvenance.reportedResults.summary} />
          </div>
        </div>
      </section>

      <section className={styles.recordSection} aria-labelledby="atmosphere-record-title">
        <header className={styles.recordSectionHeader}>
          <h2 id="atmosphere-record-title">The air on this Earth.</h2>
          <p>
            The gases and temperature the observing study gives this future’s Earth. Where the paper
            leaves a value out, we show “Not given” rather than zero.
          </p>
        </header>
        <details className={styles.recordDetails}>
          <summary>Show the atmosphere table</summary>
          <div className={styles.tableScroller} tabIndex={0}>
            <table>
              <caption>Atmosphere of Earth in {profile.id}</caption>
              <thead>
                <tr>
                  <th scope="col">Gas or property</th>
                  <th scope="col">Value</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(profile.atmosphere).map(([id, row]) => (
                  <tr key={id}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value ?? 'Not given'}</td>
                    <td>{row.unit}</td>
                    <td>
                      <ExactSource sourceRefs={row.sourceRefs} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className={styles.recordSection} aria-labelledby="artifact-record-title">
        <header className={styles.recordSectionHeader}>
          <h2 id="artifact-record-title">Objects from this world.</h2>
          <p>
            Stories and objects artists made inside this future. They’re fiction, not evidence.
            Works whose creators reserve all rights are linked, never copied here.
          </p>
        </header>
        {artifacts.length > 0 ? (
          <div className={styles.museumList}>
            {artifacts.map((artifact, index) => {
              const destination = artifact.directFileUrls[0] ?? artifact.sourceUrl;
              const open = artifact.admissionStatus === 'approved';
              return (
                <article className={styles.museumItem} key={artifact.id}>
                  <span className={styles.museumIndex}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={styles.artifactId}>{artifact.scenarioId}</span>
                  <h3>{artifact.title}</h3>
                  <p>{artifact.creator}</p>
                  <span className={styles.rightsBadge}>
                    {open ? artifact.license : 'All rights reserved'}
                  </span>
                  <a
                    data-telemetry-event="source_link"
                    data-telemetry-value={artifact.id}
                    href={destination}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View the original ↗
                  </a>
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyComparison}>
            No artists’ objects are listed for {profile.id} yet.
          </p>
        )}
      </section>

      <div className={styles.sourceFooter}>
        <a
          data-telemetry-event="source_link"
          data-telemetry-value="JANUS-PAPER-01"
          href="https://arxiv.org/abs/2409.00067v3"
          rel="noreferrer"
          target="_blank"
        >
          The scenario study ↗
        </a>
        <a
          data-telemetry-event="source_link"
          data-telemetry-value="JANUS-PAPER-03"
          href="https://arxiv.org/abs/2511.20329v2"
          rel="noreferrer"
          target="_blank"
        >
          The observing study ↗
        </a>
        <a
          data-telemetry-event="source_link"
          data-telemetry-value="JANUS-PAPER-05"
          href="https://arxiv.org/abs/2604.13774v1"
          rel="noreferrer"
          target="_blank"
        >
          The collapse study ↗
        </a>
      </div>
    </InnerPage>
  );
}
