import type { Metadata } from 'next';

import { collapseDataset, observabilityDataset } from '../../lib/canonical';
import { InnerPage } from '../components/InnerPage';

export const metadata: Metadata = { title: 'Methods' };

export default function MethodsPage() {
  return (
    <InnerPage
      eyebrow="Methods · version 0.2"
      lede="What the Observatory knows, how it knows it, and where the evidence stops."
      title="Transparent before spectacular."
    >
      <section className="proseSection">
        <h2>Scenario status</h2>
        <p>
          Project Janus scenarios are self-consistent possibilities for the technosphere—not
          forecasts, probabilities, or a ranking. Spatial layout, color, and order in this site do
          not encode likelihood.
        </p>
      </section>

      <section className="proseSection">
        <h2>Canonical data path</h2>
        <ol className="methodFlow">
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
              Components consume generated canonical records; scientific values are not literals.
            </span>
          </li>
        </ol>
      </section>

      <section className="proseSection">
        <h2>Observatory model</h2>
        <p>
          This release is a categorical lookup, not a speculative telescope simulator. It resolves
          all ten scenarios across five observing concepts from {observabilityDataset.title}. A
          blank figure cell is displayed as “no signature listed.” It never becomes “no technology.”
        </p>
        <p>
          Atmosphere values shown in the structured view come from Table 1. No PDF-digitized
          spectrum is presented as raw spectral data.
        </p>
      </section>

      <section className="proseSection">
        <h2>Collapse and recovery</h2>
        <p>
          The repository contains the paper’s reported parameters and selected aggregate outcomes:
          {` ${collapseDataset.simulation.monteCarloRunsPerScenario}`} runs per scenario over{' '}
          {collapseDataset.simulation.windowYears} years. The paper links the authors’ public{' '}
          <a href="https://github.com/celiablanco/technocycles/tree/910770dbe9224a9f7b1e003fdc7c000c2d78a5c2">
            technocycles repository at audited commit 910770d
          </a>
          . Its notebook fixes the main Monte Carlo seed at 12345, uses 54321 for sensitivity
          batches, and commits an aggregate CSV. It does not commit per-run trajectories or declare
          a software/data license, so neither code nor CSV is bundled or used as canonical runtime
          data. A collapse reimplementation is not exposed in the product runtime and must never be
          labeled official Janus code.
        </p>
      </section>

      <section className="proseSection evidenceGlossary">
        <h2>Evidence vocabulary</h2>
        <dl>
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
      </section>

      <aside className="pageNotice">
        Scientific review artifacts and reviewer sign-off remain a release gate for treating this
        implementation as a reviewed canonical data release.
      </aside>
    </InnerPage>
  );
}
