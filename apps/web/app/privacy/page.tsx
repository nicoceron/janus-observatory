import type { Metadata } from 'next';

import { InnerPage } from '../components/InnerPage';
import styles from '../components/InformationPages.module.css';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What Janus Observatory stores, what optional operational telemetry contains, and how the Research Companion handles questions.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy · Janus Observatory',
    description:
      'A cookieless core experience with bounded operational metrics and no default storage of Research questions.',
    url: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <InnerPage
      eyebrow="Privacy · minimal collection"
      lede="The core experience has no account or advertising profile and remains usable without third-party runtime services."
      title="Observe the scenarios—not the visitor."
    >
      <section className={styles.section}>
        <h2>Core experience</h2>
        <div className={styles.sectionBody}>
          <p>
            Story, Observatory, Atlas, Methods, Sources, and Accessibility work without signing in.
            Janus Observatory does not set analytics cookies. The Motion control stores only one
            preference—System, Reduced, or Full—in this browser&apos;s local storage.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Optional operational telemetry</h2>
        <div className={styles.sectionBody}>
          <p>
            A deployment may explicitly enable cookieless telemetry to measure Core Web Vitals,
            route-level use, chapter completion, instrument selection, comparison use, fallback
            mode, and source-link engagement. Records contain only bounded identifiers from a fixed
            allowlist plus device tier, reduced-motion state, and WebGL fallback state.
          </p>
          <p>
            The telemetry endpoint rejects arbitrary text and query strings. It does not accept page
            prose, Research questions, provider reasoning, account identifiers, or persistent user
            IDs. Network addresses may be hashed ephemerally for abuse control and are not written
            into the event record.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Research Companion</h2>
        <div className={styles.sectionBody}>
          <p>
            The core site never depends on AI. When the Research preview is enabled, a question is
            sent to the Janus server so it can retrieve bounded evidence and produce a cited answer.
            Live provider calls remain separately gated; if enabled, the question and selected
            evidence are transmitted to the configured provider to generate the answer.
          </p>
          <p>
            Questions are not stored by default. Operational traces may retain model and data
            versions, stage and allowlisted tool names, source IDs, token counts, latency, cache
            status, and error codes. Raw provider reasoning is never returned to the browser or
            intentionally logged.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>External services and sources</h2>
        <div className={styles.sectionBody}>
          <p>
            The decorative home-page solar-system motion is rendered locally from project-owned SVG
            and the admitted poster. It makes no request to the original Spline host. Reduced motion
            omits the animated overlay while preserving the local poster, copy, and every scientific
            control.
          </p>
          <p>
            Source and artifact links open other third-party sites with their own privacy practices.
            Janus Observatory does not embed rights-restricted artifacts merely to keep visitors on
            this site.
          </p>
        </div>
      </section>

      <aside className={styles.notice}>
        Deployment operators must disclose any additional hosting, logging, or analytics service
        before enabling it; this page describes the repository implementation only.
      </aside>
    </InnerPage>
  );
}
