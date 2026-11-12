import type { Metadata } from 'next';
import { Suspense } from 'react';

import assetLedger from '../../../../data/assets/ledger.json';
import { InnerPage } from '../components/InnerPage';
import { WorldGallery } from './WorldGallery';
import { AtlasExplorer } from './AtlasExplorer';
import styles from './atlas.module.css';

export const metadata: Metadata = {
  title: 'Atlas',
  description:
    'Explore the ten Project Janus futures, compare up to three side by side, and download the data with sources.',
  alternates: { canonical: '/atlas' },
  openGraph: {
    title: 'Atlas · Janus Observatory',
    description:
      'Explore ten possible futures of human civilization and compare them side by side.',
    url: '/atlas',
  },
};

const artifacts = assetLedger.entries.filter(({ kind }) => kind === 'artifact');

export default function AtlasPage() {
  return (
    <InnerPage
      lede="Ten possible civilizations. Explore their worlds, then compare what changes—and what another observer could see."
      title="Choose a different future."
    >
      <WorldGallery />
      <Suspense fallback={<p>Loading the atlas…</p>}>
        <AtlasExplorer />
      </Suspense>

      <section className={styles.downloadSection} id="downloads" aria-labelledby="downloads-title">
        <header className={styles.sectionHeader}>
          <h2 id="downloads-title">Take the data with you.</h2>
          <div className={styles.headerAside}>
            <p>
              Every value on this site, each with the page and table it came from. Papers and
              artworks we don’t have permission to share are left out.
            </p>
          </div>
        </header>
        <div className={styles.downloadPanel}>
          <div className={styles.downloadIntro}>
            <h3>Janus Observatory dataset, version 1.0</h3>
            <p>
              All ten futures, transcribed from the published studies. An independent review of the
              transcription is still to come.
            </p>
          </div>
          <div className={styles.downloadAction}>
            <span className={styles.downloadMeta}>Everything, with sources</span>
            <strong>JSON</strong>
            <a href="/atlas/data?format=json" download>
              Download JSON ↓
            </a>
          </div>
          <div className={styles.downloadAction}>
            <span className={styles.downloadMeta}>One row per future</span>
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
          <h2 id="artifact-museum-title">Objects from possible worlds.</h2>
          <div className={styles.headerAside}>
            <p>
              Artists imagined these objects and stories inside the Janus futures. They’re fiction,
              not evidence. Works whose creators reserve all rights are linked, never copied here.
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
      </section>
    </InnerPage>
  );
}
