import type { SourceRef, Sourced } from '@janus/domain/evidence';
import { scenarioIds, type ScenarioId } from '@janus/domain/scenario';
import type { Metadata } from 'next';
import Link from '../../components/AppLink';
import { notFound } from 'next/navigation';

import assetLedger from '../../../../../data/assets/ledger.json';
import {
  getScenarioProfile,
  scientificNotation,
  sourceRefHref,
  sourceRefLabel,
  sourcedDisplay,
} from '../../../lib/canonical';
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
  return value === null ? 'Published ellipsis' : `${value}${unit ? ` ${unit}` : ''}`;
}

function ExactSource({ sourceRefs }: { sourceRefs: SourceRef[] }) {
  const first = sourceRefs[0];
  if (!first) return <span>Missing source locator</span>;
  return (
    <a className={styles.recordSource} href={sourceRefHref(first)} rel="noreferrer" target="_blank">
      {sourceRefLabel(first)}
      {sourceRefs.length > 1 ? ` +${sourceRefs.length - 1} contributing rows` : ''} ↗
    </a>
  );
}

function FieldValue({ field }: { field: Sourced<unknown> }) {
  return (
    <>
      <span>{sourcedDisplay(field)}</span>
      {field.note ? <small>{field.note}</small> : null}
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
  const description = `Canonical morphology, trajectory, planetary traces, observability, collapse results, artifacts, and source locators for Project Janus scenario ${scenarioId}.`;
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
  const growthLabel =
    profile.growth.annualGrowthRate === null
      ? `${profile.growth.growthState} · no numeric rate printed`
      : `${(profile.growth.annualGrowthRate * 100).toFixed(2)}% / year`;

  return (
    <InnerPage
      eyebrow={`Atlas record · ${profile.id}`}
      lede={
        profile.morphology.canonicalSummary.value ??
        `Explore ${profile.id} and its source-linked scenario data.`
      }
      title={profile.morphology.mythMetaphor}
    >
      <nav className={styles.recordNav} aria-label="Scenario records">
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

      <section className={styles.recordHero} aria-label={`${profile.id} canonical overview`}>
        <WorldPortrait world={Number(profile.id.slice(1)) - 1} signals={worldSignals(profile)} />
        <dl className={styles.recordLedger}>
          <div>
            <dt>Scenario</dt>
            <dd>{profile.id}</dd>
          </div>
          <div>
            <dt>Morphology</dt>
            <dd>
              {profile.morphology.globalFactor} · technology cluster{' '}
              {profile.morphology.technologyCluster}
            </dd>
          </div>
          <div>
            <dt>Population · +1,000 yr</dt>
            <dd>
              <QuantityComparison dimension="population" value={profile.growth.population} />
            </dd>
          </div>
          <div>
            <dt>Annual energy</dt>
            <dd>
              <QuantityComparison dimension="energy" value={profile.growth.annualEnergyUseJ} />
            </dd>
          </div>
          <div>
            <dt>Reported endpoint</dt>
            <dd>{profile.growth.growthState}</dd>
          </div>
          <div>
            <dt>Growth rate</dt>
            <dd>{growthLabel}</dd>
          </div>
        </dl>
      </section>
      <ReferenceEarthNote />
      <a
        className={styles.recordSource}
        data-telemetry-event="source_link"
        data-telemetry-value="JANUS-PAPER-01"
        href="https://arxiv.org/pdf/2409.00067v3#page=8"
        rel="noreferrer"
        target="_blank"
      >
        Morphology source · Table 5 · page 8 ↗
      </a>

      <section className={styles.recordSection} aria-labelledby="morphology-record-title">
        <header className={styles.recordSectionHeader}>
          <div>
            <p className={styles.recordKicker}>Tables 2, 4, 5 · Section 3.2.1</p>
            <h2 id="morphology-record-title">Complete sourced morphology.</h2>
          </div>
          <p>
            Every cell below names its exact field, source row, and source column. Cluster
            alternatives remain alternatives; graphical biosphere distributions remain explicitly
            not transcribed.
          </p>
        </header>
        <div className={styles.twoColumnRecord}>
          <div>
            <h3>Canonical source summary</h3>
            <p>
              <FieldValue field={profile.morphology.canonicalSummary} />
            </p>
          </div>
          <div>
            <h3>Construction identifiers</h3>
            <dl>
              <div>
                <dt>Global factor</dt>
                <dd>
                  {profile.morphology.globalFactor}
                  <ExactSource sourceRefs={profile.morphology.fieldProvenance.globalFactor} />
                </dd>
              </div>
              <div>
                <dt>Technology cluster</dt>
                <dd>
                  {profile.morphology.technologyCluster}
                  <ExactSource sourceRefs={profile.morphology.fieldProvenance.technologyCluster} />
                </dd>
              </div>
              <div>
                <dt>Technology factors</dt>
                <dd>
                  {profile.morphology.technologyFactors.join(', ')}
                  <ExactSource sourceRefs={profile.morphology.fieldProvenance.technologyFactors} />
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div className={styles.tableScroller} tabIndex={0}>
          <table>
            <caption>Field-level morphology for {profile.id}</caption>
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Value / capture state</th>
                <th scope="col">Evidence</th>
              </tr>
            </thead>
            <tbody>
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
              ).map(([label, key]) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>
                    <FieldValue field={profile.morphology[key]} />
                  </td>
                  <td>{profile.morphology[key].evidenceKind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.tableScroller} tabIndex={0}>
          <table>
            <caption>Reported 1,000-year trajectory fields for {profile.id}</caption>
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Value</th>
                <th scope="col">Exact locator</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Population</th>
                <td>{scientificNotation(profile.growth.population)}</td>
                <td>
                  <ExactSource sourceRefs={profile.growth.fieldProvenance.population} />
                </td>
              </tr>
              <tr>
                <th scope="row">Annual energy use</th>
                <td>{scientificNotation(profile.growth.annualEnergyUseJ)} J / year</td>
                <td>
                  <ExactSource sourceRefs={profile.growth.fieldProvenance.annualEnergyUseJ} />
                </td>
              </tr>
              <tr>
                <th scope="row">Growth state</th>
                <td>{profile.growth.growthState}</td>
                <td>
                  <ExactSource sourceRefs={profile.growth.fieldProvenance.growthState} />
                </td>
              </tr>
              <tr>
                <th scope="row">Annual growth rate</th>
                <td>{growthLabel}</td>
                <td>
                  <ExactSource sourceRefs={profile.growth.fieldProvenance.annualGrowthRate} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.recordSection} aria-labelledby="observation-record-title">
        <header className={styles.recordSectionHeader}>
          <div>
            <p className={styles.recordKicker}>Published observability · Figure 6</p>
            <h2 id="observation-record-title">What each method lists.</h2>
          </div>
          <p>
            Each row is a categorical source cell. A blank remains “no signature listed by this
            method”; it does not become an absence-of-technology claim.
          </p>
        </header>
        <div className={styles.observationList}>
          {profile.observations.map((observation, index) => (
            <article className={styles.observationRow} key={observation.id}>
              <span className={styles.observationIndex}>{String(index + 1).padStart(2, '0')}</span>
              <h3>{observation.label}</h3>
              {observation.result.signatures.length > 0 ? (
                <ul>
                  {observation.result.signatures.map((signature) => (
                    <li key={signature}>{signature}</li>
                  ))}
                </ul>
              ) : (
                <p>Blank Figure 6 cell · no signature listed by this method.</p>
              )}
              <span className={styles.observationState}>
                reported · transcribed
                <br />
                {observation.short} · {observation.mode}
              </span>
              <ExactSource sourceRefs={observation.result.sourceRefs} />
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
          Exact matrix source · Figure 6 · page 10 ↗
        </a>
      </section>

      <section className={styles.recordSection} aria-labelledby="atmosphere-record-title">
        <header className={styles.recordSectionHeader}>
          <div>
            <p className={styles.recordKicker}>Future Earth atmosphere · Table 1</p>
            <h2 id="atmosphere-record-title">Canonical atmospheric inputs.</h2>
          </div>
          <p>
            Published ellipses remain null. They never silently become numeric zero, and no
            PDF-digitized spectrum is presented as authoritative raw data.
          </p>
        </header>
        <div className={styles.tableScroller} tabIndex={0}>
          <table>
            <caption>Published future-Earth atmosphere values for {profile.id}</caption>
            <thead>
              <tr>
                <th scope="col">Property</th>
                <th scope="col">Value</th>
                <th scope="col">Unit</th>
                <th scope="col">Evidence</th>
                <th scope="col">Exact locator</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(profile.atmosphere).map(([id, row]) => (
                <tr key={id}>
                  <th scope="row">{row.label}</th>
                  <td>{row.value ?? 'Published ellipsis'}</td>
                  <td>{row.unit}</td>
                  <td>reported · transcribed</td>
                  <td>
                    <ExactSource sourceRefs={row.sourceRefs} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <a
          className={styles.recordSource}
          data-telemetry-event="source_link"
          data-telemetry-value="JANUS-PAPER-03"
          href="https://arxiv.org/pdf/2511.20329v2#page=4"
          rel="noreferrer"
          target="_blank"
        >
          Exact atmosphere source · Table 1 · page 4 ↗
        </a>
      </section>

      <section className={styles.recordSection} aria-labelledby="planetary-record-title">
        <header className={styles.recordSectionHeader}>
          <div>
            <p className={styles.recordKicker}>Earth · Moon · Mars · Venus</p>
            <h2 id="planetary-record-title">Planetary reach stays multidimensional.</h2>
          </div>
          <p>
            Pollution, illumination, surface modification, satellite belts, and aerosols use their
            own source units. The Atlas does not compress them onto a misleading common scale.
          </p>
        </header>
        <div className={styles.tableScroller} tabIndex={0}>
          <table>
            <caption>Planetary technosignature magnitudes for {profile.id}</caption>
            <thead>
              <tr>
                <th scope="col">Body</th>
                <th scope="col">Signature</th>
                <th scope="col">Value</th>
                <th scope="col">Unit</th>
                <th scope="col">Source note</th>
                <th scope="col">Exact locator</th>
              </tr>
            </thead>
            <tbody>
              {profile.planetary.map((row) => (
                <tr key={`${row.signatureId}-${row.body}`}>
                  <th scope="row">{row.body}</th>
                  <td>{row.signatureLabel}</td>
                  <td>{displayNullable(row.value)}</td>
                  <td>{row.unit}</td>
                  <td>{row.annotations?.join(' ') || 'No additional table annotation'}</td>
                  <td>
                    <ExactSource sourceRefs={row.sourceRefs} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <a
          className={styles.recordSource}
          data-telemetry-event="source_link"
          data-telemetry-value="JANUS-PAPER-01"
          href="https://arxiv.org/pdf/2409.00067v3#page=14"
          rel="noreferrer"
          target="_blank"
        >
          Exact planetary source · Table 6 · page 14 ↗
        </a>
      </section>

      <section className={styles.recordSection} aria-labelledby="trajectory-record-title">
        <header className={styles.recordSectionHeader}>
          <div>
            <p className={styles.recordKicker}>System evidence + reported trajectory</p>
            <h2 id="trajectory-record-title">Different evidence classes.</h2>
          </div>
          <p>
            System signatures are reported in Table 8. Collapse values below are reported outcomes
            from an independent published model; they are not a timeline inferred from Table 9.
          </p>
        </header>
        <div className={styles.twoColumnRecord}>
          <div>
            <h3>System signatures listed</h3>
            {profile.system.length > 0 ? (
              <ul>
                {profile.system.map((item) => (
                  <li key={item.id}>
                    {item.label}
                    <ExactSource sourceRefs={item.sourceRefs} />
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                None listed in Table 8.
                <ExactSource sourceRefs={profile.systemCellProvenance} />
              </p>
            )}
          </div>
          <div>
            <h3>Reported collapse/recovery outcome</h3>
            <p>{profile.collapse.reportedResults.summary}</p>
            <ExactSource sourceRefs={profile.collapse.fieldProvenance.reportedResults.summary} />
            <dl>
              <div>
                <dt>Mean duty cycle</dt>
                <dd>
                  {profile.collapse.reportedResults.meanDutyCycle ?? 'Not transcribed from prose'}
                  <ExactSource
                    sourceRefs={profile.collapse.fieldProvenance.reportedResults.meanDutyCycle}
                  />
                </dd>
              </div>
              <div>
                <dt>Mean collapse count</dt>
                <dd>
                  {profile.collapse.reportedResults.meanCollapseCount ??
                    'Figure-only / not transcribed'}
                  <ExactSource
                    sourceRefs={profile.collapse.fieldProvenance.reportedResults.meanCollapseCount}
                  />
                </dd>
              </div>
              <div>
                <dt>Precision</dt>
                <dd>
                  {profile.collapse.reportedResults.precision.replaceAll('_', ' ')}
                  <ExactSource
                    sourceRefs={profile.collapse.fieldProvenance.reportedResults.precision}
                  />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className={styles.recordSection} aria-labelledby="artifact-record-title">
        <header className={styles.recordSectionHeader}>
          <div>
            <p className={styles.recordKicker}>Artifact museum · fictional</p>
            <h2 id="artifact-record-title">In-world objects, rights intact.</h2>
          </div>
          <p>
            These creative works are not scientific evidence. Rights-restricted works stay
            link-only; open-license works remain attributed and are not silently repurposed as
            scenario textures.
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
                  <span className={styles.artifactId}>{artifact.artifactId}</span>
                  <h3>{artifact.title}</h3>
                  <p>{artifact.creator}</p>
                  <p>
                    {open ? artifact.requiredCreditText : 'All rights reserved · no local copy.'}
                  </p>
                  <span className={styles.rightsBadge}>
                    {open
                      ? `${artifact.license} · linked exhibit`
                      : 'Link only · rights restricted'}
                  </span>
                  <a
                    data-telemetry-event="source_link"
                    data-telemetry-value={artifact.id}
                    href={destination}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open public record ↗
                  </a>
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyComparison}>
            No creative artifact record is currently admitted for {profile.id}. The Atlas leaves the
            museum position empty instead of inventing one.
          </p>
        )}
      </section>

      <div className={styles.sourceFooter}>
        <a
          data-telemetry-event="source_link"
          data-telemetry-value="JANUS-PAPER-01"
          href="https://arxiv.org/pdf/2409.00067v3#page=8"
          rel="noreferrer"
          target="_blank"
        >
          Scenario paper · Tables 5, 6, 8, 9 ↗
        </a>
        <a
          data-telemetry-event="source_link"
          data-telemetry-value="JANUS-PAPER-03"
          href="https://arxiv.org/pdf/2511.20329v2#page=4"
          rel="noreferrer"
          target="_blank"
        >
          Observing paper · Table 1, Figure 6 ↗
        </a>
        <a
          data-telemetry-event="source_link"
          data-telemetry-value="JANUS-PAPER-05"
          href="https://arxiv.org/pdf/2604.13774v1#page=7"
          rel="noreferrer"
          target="_blank"
        >
          Collapse paper · Table 4, reported outcomes ↗
        </a>
      </div>
    </InnerPage>
  );
}
