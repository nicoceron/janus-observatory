import type { Metadata } from 'next';

import { readResearchRuntimeConfig } from '@janus/agent';

import { telemetryEnabled } from '../../lib/telemetry-shared';
import { InnerPage } from '../components/InnerPage';
import styles from '../components/InformationPages.module.css';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What Janus Observatory stores about visitors: no accounts, no ads, no cookies.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy · Janus Observatory',
    description: 'No accounts, no ads, no cookies.',
    url: '/privacy',
  },
};

export default function PrivacyPage() {
  const research = readResearchRuntimeConfig(process.env);

  return (
    <InnerPage lede="No accounts, no ads, no cookies." title="Your visit stays yours.">
      <section className={styles.section}>
        <h2>What we store</h2>
        <div className={styles.sectionBody}>
          <p>
            Nothing that identifies you, and no cookies. If you pick a motion setting on the
            Accessibility page, your browser remembers that one choice on your own device.
          </p>
          <p>
            Like any website, our host handles basic request details, such as your network address,
            to deliver pages and block abuse.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Analytics</h2>
        <div className={styles.sectionBody}>
          {telemetryEnabled ? (
            <p>
              We count anonymous page views, loading speed and which features get used—such as which
              instrument people pick—to improve the site. These counts never include anything you
              type or anything that identifies you, and your network address isn’t stored with them.
            </p>
          ) : (
            <p>We don’t run analytics on this site.</p>
          )}
        </div>
      </section>

      {research.previewEnabled ? (
        <section className={styles.section}>
          <h2>Research questions</h2>
          <div className={styles.sectionBody}>
            <p>
              If you ask the research assistant a question, it goes to our server so it can find an
              answer in the papers.
              {research.liveCallsEnabled || research.hybridRetrievalEnabled
                ? ' To search and write the answer, it is also sent to an outside AI service.'
                : ''}{' '}
              Questions aren’t stored.
            </p>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <h2>Other sites</h2>
        <div className={styles.sectionBody}>
          <p>
            Fonts, 3D models and data all load from this site. Links to papers, datasets and
            artworks open other sites, which have their own privacy practices; we link to them
            rather than embed them, so they learn nothing about your visit unless you click.
          </p>
        </div>
      </section>
    </InnerPage>
  );
}
