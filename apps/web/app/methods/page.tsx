import type { Metadata } from 'next';

import independentValidation from '../../../../data/generated/collapse/independent-validation.json';
import { collapseDataset } from '../../lib/canonical';
import Link from '../components/AppLink';
import { InnerPage } from '../components/InnerPage';
import styles from '../components/InformationPages.module.css';

export const metadata: Metadata = {
  title: 'Methods',
  description:
    'Where every number on Janus Observatory comes from, what the Observatory can and can’t tell you, and where the evidence runs out.',
  alternates: { canonical: '/methods' },
  openGraph: {
    title: 'Methods · Janus Observatory',
    description: 'How Janus Observatory turns published research into a story you can check.',
    url: '/methods',
  },
};

const comparisons = independentValidation.scenarios.flatMap((scenario) => scenario.comparisons);
const comparisonCount = comparisons.filter((comparison) => comparison.reported !== null).length;
const passedComparisonCount = comparisons.filter(
  (comparison) => comparison.reported !== null && comparison.verdict === 'pass',
).length;
const notValidatedCount = comparisons.filter(
  (comparison) => comparison.verdict === 'not_validated',
).length;

export default function MethodsPage() {
  return (
    <InnerPage
      lede="Where every number on this site comes from, what the Observatory can and can’t tell you, and where the evidence runs out."
      title="How we know what we show."
    >
      <section className={styles.section}>
        <h2>Possibilities, not predictions</h2>
        <div className={styles.sectionBody}>
          <p>
            Project Janus describes ten futures for human civilization, each worked through so its
            economy, politics, technology and environment fit together. They are possibilities, not
            forecasts. The researchers don’t say how likely any of them is, and nothing on this
            site—order, color or layout—hints at it either.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Where the numbers come from</h2>
        <div className={styles.sectionBody}>
          <ol className={styles.flow}>
            <li>
              <strong>A published paper</strong>
              <span>
                Every value starts at a specific table or figure in a Project Janus paper.
              </span>
            </li>
            <li>
              <strong>Careful copying</strong>
              <span>
                We copy each value with its units and precision, and keep blanks blank instead of
                turning them into zeros.
              </span>
            </li>
            <li>
              <strong>Automatic checks</strong>
              <span>
                Before the site is built, checks reject any value that is missing, malformed or
                without a source.
              </span>
            </li>
            <li>
              <strong>The site</strong>
              <span>
                Pages draw every scientific number from that checked dataset. None are typed into
                the design by hand.
              </span>
            </li>
          </ol>
          <div className={styles.actions}>
            <Link href="/atlas#downloads">Download the data</Link>
            <Link href="/sources">See every source</Link>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>What the Observatory shows</h2>
        <div className={styles.sectionBody}>
          <p>
            The Observatory doesn’t simulate a telescope. For each of the ten futures, it shows what
            the{' '}
            <a
              data-telemetry-event="source_link"
              data-telemetry-value="JANUS-PAPER-03"
              href="https://arxiv.org/abs/2511.20329v2"
              rel="noreferrer"
              target="_blank"
            >
              observing study
            </a>{' '}
            found five proposed instruments could detect, looking at a world like ours from another
            star.
          </p>
          <p>
            When an instrument has nothing listed, that only means the study lists no sign it could
            pick up. It never means the civilization has no technology.
          </p>
          <p>
            Distance and observing time stay fixed at the study’s own choices, because there’s no
            tested way to vary them. Atmosphere values come straight from the study’s tables; we
            don’t show spectra traced from figures in the PDF.
          </p>
          <div className={styles.factStrip}>
            <div>
              <span>Futures</span>
              <strong>10</strong>
            </div>
            <div>
              <span>Instruments</span>
              <strong>5</strong>
            </div>
            <div>
              <span>Each result</span>
              <strong>Listed or not</strong>
            </div>
          </div>
          <div className={styles.actions}>
            <Link href="/observatory">Open the Observatory</Link>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Collapse and recovery</h2>
        <div className={styles.sectionBody}>
          <p>
            A separate Janus study runs each future{' '}
            {collapseDataset.simulation.monteCarloRunsPerScenario.toLocaleString('en')} times over{' '}
            {collapseDataset.simulation.windowYears.toLocaleString('en')} years to see how often it
            collapses and how it recovers. The authors published their{' '}
            <a
              data-telemetry-event="source_link"
              data-telemetry-value="JANUS-CODE-01"
              href="https://github.com/celiablanco/technocycles/tree/910770dbe9224a9f7b1e003fdc7c000c2d78a5c2"
            >
              code
            </a>
            , but without a license that would let us reuse it, so we link to it rather than copy
            it.
          </p>
          <p>
            To explore the model ourselves, we rebuilt it from the equations in the paper. Our
            version matches {passedComparisonCount} of the {comparisonCount} results the paper
            states in its text, within set tolerances. For {notValidatedCount} more, the paper only
            shows a chart, so there is no exact number to check against. It’s our own rebuild, not
            the authors’ code, and it never replaces the paper’s numbers.
          </p>
          <div className={styles.actions}>
            <Link href="/research/resilience">See the rebuild</Link>
            <a href="/api/downloads/independent-validation" download>
              Download the full check
            </a>
            <a
              data-telemetry-event="source_link"
              data-telemetry-value="JANUS-PAPER-05"
              href="https://arxiv.org/abs/2604.13774v1"
              rel="noreferrer"
              target="_blank"
            >
              Read the collapse study ↗
            </a>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Labels in the data</h2>
        <div className={styles.sectionBody}>
          <p>In the downloads, every value carries a label saying where it came from.</p>
          <dl className={styles.glossary}>
            <div>
              <dt>reported</dt>
              <dd>Stated directly in a paper.</dd>
            </div>
            <div>
              <dt>transcribed</dt>
              <dd>Copied from a paper into our dataset, with units and precision kept.</dd>
            </div>
            <div>
              <dt>derived</dt>
              <dd>Calculated by us from published numbers, the same way every time.</dd>
            </div>
            <div>
              <dt>reimplemented</dt>
              <dd>Produced by our own rebuild of a published model.</dd>
            </div>
            <div>
              <dt>editorial</dt>
              <dd>Our explanation or grouping.</dd>
            </div>
            <div>
              <dt>interpretive</dt>
              <dd>Artwork imagined from a scenario’s description.</dd>
            </div>
            <div>
              <dt>fictional</dt>
              <dd>A creative work set inside a scenario.</dd>
            </div>
            <div>
              <dt>model_generated</dt>
              <dd>Written by an AI. Never used as fact.</dd>
            </div>
          </dl>
        </div>
      </section>

      <aside className={styles.notice}>
        An independent scientific review of our transcription is still to come. Until then, check
        any number that matters to you against the paper it links to.
      </aside>
    </InnerPage>
  );
}
