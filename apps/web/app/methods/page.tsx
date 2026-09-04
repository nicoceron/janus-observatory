import type { Metadata } from 'next';

import independentValidation from '../../../../data/generated/collapse/independent-validation.json';
import { collapseDataset, observabilityDataset } from '../../lib/canonical';
import { InnerPage } from '../components/InnerPage';
import styles from '../components/InformationPages.module.css';

export const metadata: Metadata = {
  title: 'Methods',
  description:
    'Evidence labels, canonical data flow, observatory boundaries, collapse-model status, rights, and release limitations for Janus Observatory.',
  alternates: { canonical: '/methods' },
  openGraph: {
    title: 'Methods · Janus Observatory',
    description:
      'How Janus Observatory separates reported facts, transcriptions, derived outputs, interpretations, and fictional artifacts.',
    url: '/methods',
  },
};

const validationRows = independentValidation.scenarios.map((scenario) => {
  const comparisonsWithTargets = scenario.comparisons.filter(
    (comparison) => comparison.reported !== null,
  );
  const comparisonsWithoutTargets = scenario.comparisons.filter(
    (comparison) => comparison.verdict === 'not_validated',
  );

  return {
    scenarioId: scenario.scenarioId,
    passed: comparisonsWithTargets.filter((comparison) => comparison.verdict === 'pass').length,
    withTargets: comparisonsWithTargets.length,
    withoutTargets: comparisonsWithoutTargets.length,
  };
});

const comparisonCount = validationRows.reduce((total, row) => total + row.withTargets, 0);
const passedComparisonCount = validationRows.reduce((total, row) => total + row.passed, 0);
const notValidatedCount = validationRows.reduce((total, row) => total + row.withoutTargets, 0);

export default function MethodsPage() {
  return (
    <InnerPage
      eyebrow="Methods · version 0.2"
      lede="What the Observatory knows, how it knows it, and where the evidence stops."
      title="Transparent before spectacular."
    >
      <section className={styles.section}>
        <h2>Scenario status</h2>
        <div className={styles.sectionBody}>
          <p>
            Project Janus scenarios are self-consistent possibilities for the technosphere—not
            forecasts, probabilities, or a ranking. Spatial layout, color, and order in this site do
            not encode likelihood.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Canonical data path</h2>
        <div className={styles.sectionBody}>
          <ol className={styles.flow}>
            <li>
              <strong>Reported source</strong>
              <span>Versioned scholarly paper, exact table or figure locator.</span>
            </li>
            <li>
              <strong>Transcription</strong>
              <span>Normalized JSON preserves units, significant digits, ellipses, and notes.</span>
            </li>
            <li>
              <strong>Runtime validation</strong>
              <span>
                Zod schemas reject missing records, malformed cells, and incomplete provenance.
              </span>
            </li>
            <li>
              <strong>Presentation</strong>
              <span>
                Components consume canonical records; scientific values are not component literals.
              </span>
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Observatory model</h2>
        <div className={styles.sectionBody}>
          <p>
            This release is a categorical lookup, not a speculative telescope simulator. It resolves
            all ten scenarios across five observing concepts from {observabilityDataset.title}. A
            blank figure cell is displayed as “no signature listed.” It never becomes “no
            technology.”
          </p>
          <p>
            Distance and integration remain locked to the source study preset because no validated
            continuous model is available. Atmosphere values come from Table 1. No PDF-digitized
            spectrum is presented as raw spectral data.
          </p>
          <div className={styles.factStrip}>
            <div>
              <span>Scenarios</span>
              <strong>10</strong>
            </div>
            <div>
              <span>Mission concepts</span>
              <strong>5</strong>
            </div>
            <div>
              <span>Output type</span>
              <strong>Categorical</strong>
            </div>
          </div>
          <div className={styles.actions}>
            <a href="/observatory">Open Observatory</a>
            <a href="/atlas/data?format=json" download>
              Download provenance JSON
            </a>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Collapse and recovery</h2>
        <div className={styles.sectionBody}>
          <p>
            The repository contains the paper’s reported parameters and selected aggregate outcomes:
            {` ${collapseDataset.simulation.monteCarloRunsPerScenario}`} runs per scenario over{' '}
            {collapseDataset.simulation.windowYears} years. The paper links the authors’ public{' '}
            <a
              data-telemetry-event="source_link"
              data-telemetry-value="JANUS-CODE-01"
              href="https://github.com/celiablanco/technocycles/tree/910770dbe9224a9f7b1e003fdc7c000c2d78a5c2"
            >
              technocycles repository at audited commit 910770d
            </a>
            . Its notebook fixes the main Monte Carlo seed at 12345, uses 54321 for sensitivity
            batches, and commits an aggregate CSV. It does not commit per-run trajectories or
            declare a software/data license, so neither code nor CSV is bundled or used as canonical
            runtime data. The Observatory implementation remains independent and must never be
            labeled official Janus code.
          </p>
          <div className={styles.validationPanel}>
            <p className={styles.validationEyebrow}>Independent validation report</p>
            <h3>Reimplemented evidence, outside the canonical release.</h3>
            <p>
              The generated experiment report is explicitly <code>reimplemented</code> and{' '}
              <code>noncanonical</code>. Its overall{' '}
              <code>{independentValidation.overallVerdict}</code> means that {passedComparisonCount}{' '}
              of {comparisonCount} metric/scenario comparisons with a published target met the
              recorded tolerance. It does not turn an absent source target into evidence:{' '}
              {notValidatedCount} comparisons remain <code>not_validated</code>.
            </p>
            <div className={styles.factStrip}>
              <div>
                <span>Evidence kind</span>
                <strong>{independentValidation.evidenceKind}</strong>
              </div>
              <div>
                <span>Canonical status</span>
                <strong>{independentValidation.canonicalStatus}</strong>
              </div>
              <div>
                <span>Large ensemble</span>
                <strong>
                  {independentValidation.ensembleSizes.large.toLocaleString('en')} runs
                </strong>
              </div>
            </div>
            <p>
              This is an independent check against published comparison targets—not an official
              author replication. The authors’ code and aggregate data remain unbundled, and no
              unavailable per-run source trajectories are implied.
            </p>
            <div
              className={styles.tableScroller}
              role="region"
              aria-label="Independent collapse validation by scenario"
              tabIndex={0}
            >
              <table className={styles.accessTable}>
                <thead>
                  <tr>
                    <th scope="col">Scenario</th>
                    <th scope="col">Published targets</th>
                    <th scope="col">No published target</th>
                    <th scope="col">Bounded result</th>
                  </tr>
                </thead>
                <tbody>
                  {validationRows.map((row) => (
                    <tr key={row.scenarioId}>
                      <th scope="row">{row.scenarioId}</th>
                      <td>{row.withTargets}</td>
                      <td>{row.withoutTargets}</td>
                      <td>
                        {row.passed === row.withTargets
                          ? `${row.passed}/${row.withTargets} pass`
                          : `${row.passed}/${row.withTargets} pass · review required`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.actions}>
              <a href="/api/downloads/independent-validation" download>
                Download independent report
              </a>
              <a
                data-telemetry-event="source_link"
                data-telemetry-value="JANUS-PAPER-05"
                href="https://arxiv.org/pdf/2604.13774v1#page=7"
                rel="noreferrer"
                target="_blank"
              >
                Published targets · Table 4, p.7 ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Evidence vocabulary</h2>
        <div className={styles.sectionBody}>
          <dl className={styles.glossary}>
            <div>
              <dt>reported</dt>
              <dd>Directly stated in a source.</dd>
            </div>
            <div>
              <dt>transcribed</dt>
              <dd>Normalized from a source into canonical data.</dd>
            </div>
            <div>
              <dt>derived</dt>
              <dd>Deterministic calculation from sourced inputs.</dd>
            </div>
            <div>
              <dt>reimplemented</dt>
              <dd>Independent model based on a published method.</dd>
            </div>
            <div>
              <dt>editorial</dt>
              <dd>Observatory explanation or classification.</dd>
            </div>
            <div>
              <dt>interpretive</dt>
              <dd>Art-directed extrapolation from scenario prose.</dd>
            </div>
            <div>
              <dt>fictional</dt>
              <dd>In-world artifact or narrative content.</dd>
            </div>
            <div>
              <dt>model_generated</dt>
              <dd>AI output; never canonical.</dd>
            </div>
          </dl>
        </div>
      </section>

      <aside className={styles.notice}>
        Scientific review artifacts and reviewer sign-off remain a release gate for treating this
        implementation as a reviewed canonical data release.
      </aside>
    </InnerPage>
  );
}
