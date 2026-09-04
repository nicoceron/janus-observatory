import type { Metadata } from 'next';
import { Suspense } from 'react';

import assetLedger from '../../../../data/assets/ledger.json';
import { collapseDataset } from '../../lib/canonical';
import { InnerPage } from '../components/InnerPage';
import { AtlasExplorer } from './AtlasExplorer';
import styles from './atlas.module.css';

export const metadata: Metadata = {
  title: 'Atlas',
  description:
    'Browse, compare, source, and download the ten Project Janus scenario records without ranking them.',
  alternates: { canonical: '/atlas' },
  openGraph: {
    title: 'Atlas · Janus Observatory',
    description:
      'A source-preserving comparison workspace for ten self-consistent technological-civilization scenarios.',
    url: '/atlas',
  },
};

const artifacts = assetLedger.entries.filter(({ kind }) => kind === 'artifact');

export default function AtlasPage() {
  return (
    <InnerPage
      eyebrow="Atlas · ten canonical scenarios"
      lede="Compare morphology, growth, atmosphere, technosignatures, observability, and reported collapse outcomes—field by field."
      title="Ten possibilities. No leaderboard."
    >
      <Suspense fallback={<p>Preparing canonical comparison…</p>}>
        <AtlasExplorer />
      </Suspense>

      <section className={styles.chronology} id="chronology" aria-labelledby="chronology-title">
        <header className={styles.sectionHeader}>
          <p>Chronology · three evidence clocks</p>
          <h2 id="chronology-title">These dates do not mean the same thing.</h2>
          <div className={styles.headerAside}>
            <p>
              The Atlas keeps reported endpoints, reported collapse-model windows, and fictional
              artifact time on separate lanes. It never infers an in-world date that the admitted
              record does not supply.
            </p>
          </div>
        </header>
        <div className={styles.chronologyGrid}>
          <article className={styles.chronologyLane}>
            <span className={styles.chronologyLabel}>reported endpoint</span>
            <strong>+1,000 years</strong>
            <p>
              Table 9 reports population, annual energy use, growth state, and growth rate at the
              shared scenario endpoint. It is a sourced projection value, not a probability.
            </p>
            <a
              data-telemetry-event="source_link"
              data-telemetry-value="JANUS-PAPER-01"
              href="https://arxiv.org/pdf/2409.00067v3#page=18"
              rel="noreferrer"
              target="_blank"
            >
              Table 9 · p.18 ↗
            </a>
          </article>
          <article className={styles.chronologyLane}>
            <span className={styles.chronologyLabel}>reported collapse-model window</span>
            <strong>0–{collapseDataset.simulation.windowYears.toLocaleString('en')} years</strong>
            <p>
              The collapse/recovery paper evaluates a model window in{' '}
              {collapseDataset.simulation.timeStepYears}-year steps. Reported aggregates describe
              ensembles; the Atlas does not invent missing per-run paths.
            </p>
            <a
              data-telemetry-event="source_link"
              data-telemetry-value="JANUS-PAPER-05"
              href="https://arxiv.org/pdf/2604.13774v1#page=7"
              rel="noreferrer"
              target="_blank"
            >
              Table 4 · p.7 ↗
            </a>
          </article>
          <article className={styles.chronologyLane}>
            <span className={styles.chronologyLabel}>fictional artifact time</span>
            <strong>Date not supplied</strong>
            <p>
              Museum objects are in-world creative works. The admitted asset ledger records their
              public IDs, creators, and rights, but no exact in-world year; the timeline leaves that
              position unresolved.
            </p>
            <a href="#artifact-museum">Open artifact museum ↓</a>
          </article>
        </div>
      </section>

      <section className={styles.downloadSection} id="downloads" aria-labelledby="downloads-title">
        <header className={styles.sectionHeader}>
          <p>Versioned exports · provenance included</p>
          <h2 id="downloads-title">Take the versioned release-candidate records with you.</h2>
          <div className={styles.headerAside}>
            <p>
              Exports contain normalized canonical data and source locators only. Restricted papers,
              unlicensed code/data, and all-rights-reserved artifacts are never redistributed in
              these files.
            </p>
          </div>
        </header>
        <div className={styles.downloadPanel}>
          <div className={styles.downloadIntro}>
            <h3>Generated release candidate 1.0.0</h3>
            <p>
              Data version recorded in the generated manifest · all ten scenarios · complete dataset
              bundle · explicit provenance · independent reviewer sign-off has not yet been
              recorded.
            </p>
          </div>
          <div className={styles.downloadAction}>
            <span className={styles.downloadMeta}>Complete nested release</span>
            <strong>JSON</strong>
            <a href="/atlas/data?format=json" download>
              Download JSON ↓
            </a>
          </div>
          <div className={styles.downloadAction}>
            <span className={styles.downloadMeta}>Exact generated 1.0.0 scenario rows</span>
            <strong>CSV</strong>
            <a href="/atlas/data?format=csv" download>
              Download CSV ↓
            </a>
          </div>
        </div>
      </section>

      <section
        className={styles.museum}
        id="artifact-museum"
        aria-labelledby="artifact-museum-title"
      >
        <header className={styles.sectionHeader}>
          <p>Artifact museum · fictional evidence layer</p>
          <h2 id="artifact-museum-title">Objects from possible worlds.</h2>
          <div className={styles.headerAside}>
            <p>
              Creative artifacts sit apart from scientific records. Open-license works may be linked
              with attribution; all-rights-reserved works remain link-only and are never bundled,
              excerpted, or used as visual textures without permission.
            </p>
          </div>
        </header>
        <div className={styles.museumList}>
          {artifacts.map((artifact, index) => {
            const destination = artifact.directFileUrls[0] ?? artifact.sourceUrl;
            const open = artifact.admissionStatus === 'approved';
            return (
              <article className={styles.museumItem} key={artifact.id}>
                <span className={styles.museumIndex}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.artifactId}>{artifact.artifactId}</span>
                <h3>{artifact.title}</h3>
                <p>
                  {artifact.scenarioId} · {artifact.creator}
                </p>
                <p>{open ? artifact.requiredCreditText : 'All rights reserved · no local copy.'}</p>
                <span className={styles.rightsBadge}>
                  {open ? `${artifact.license} · linked exhibit` : 'Link only · rights restricted'}
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
      </section>
    </InnerPage>
  );
}
