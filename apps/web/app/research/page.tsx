import type { Metadata } from 'next';
import Link from 'next/link';

import { readResearchRuntimeConfig } from '@janus/agent';

import collapseValidation from '../../../../data/generated/collapse/independent-validation.json';
import researchIndex from '../../../../data/generated/research/index.json';
import releaseIdentity from '../../../../data/generated/runtime/release-identity.json';
import { InnerPage } from '../components/InnerPage';
import { ResearchCompanion } from './ResearchCompanion';
import styles from './Research.module.css';

export const metadata: Metadata = {
  title: 'Research Companion',
  description:
    'Ask bounded questions about Project Janus using an allowlisted corpus, deterministic tools, and paragraph-level source citations.',
  alternates: { canonical: '/research' },
};

const supportedQuestions = [
  'Why can S9 be technologically extensive while HWO lists no signature?',
  'Which mission concepts list signatures for S4?',
  'What is reported about collapse and recovery in S4?',
  'Compare reported S4 collapse metrics with the fixed 20,000-run independent replay.',
  'Compare the reported population and energy endpoints for S5 and S9.',
];

export default function ResearchPage() {
  const runtime = readResearchRuntimeConfig(process.env);

  return (
    <InnerPage
      eyebrow="Research companion · bounded evidence workflow"
      lede="Search the allowlisted Janus corpus, preserve what the instruments did not evaluate, and keep every factual paragraph tied to a resolvable source. The Story, Observatory, and Atlas never depend on this service."
      title="Evidence first. Answers second."
    >
      <div className={styles.releaseStrip} aria-label="Research release status">
        <div>
          <span>Lexical corpus</span>
          <strong>{researchIndex.chunkCount} passage records</strong>
        </div>
        <div>
          <span>Scenario coverage</span>
          <strong>{researchIndex.scenarioCoverage.length} of 10</strong>
        </div>
        <div>
          <span>Canonical release</span>
          <strong>
            {releaseIdentity.independentHumanReview === 'approved'
              ? 'independently approved'
              : 'independent review pending'}
          </strong>
        </div>
        <div>
          <span>Independent replay</span>
          <strong>
            {collapseValidation.status === 'validated_experiment_report'
              ? 'fixed 20,000-run preset verified'
              : 'held closed'}
          </strong>
        </div>
      </div>

      <ResearchCompanion
        enabled={runtime.previewEnabled}
        maximumCharacters={runtime.maxQuestionChars}
        suggestions={supportedQuestions}
      />

      <section className={styles.editorialGrid} aria-labelledby="research-boundary-title">
        <div className={styles.sectionLead}>
          <p>Runtime boundary</p>
          <h2 id="research-boundary-title">One short workflow. No autonomous research swarm.</h2>
        </div>
        <div className={styles.boundaryList}>
          <article>
            <span>01</span>
            <div>
              <h3>Route</h3>
              <p>
                Reject probability rankings and requests outside the Janus evidence boundary before
                any provider call.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Retrieve</h3>
              <p>
                Search verified-open papers and candidate canonical summaries. Unknown-rights
                scenario PDFs never enter the public corpus.
              </p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>Audit</h3>
              <p>
                Validate every citation marker against retrieved source pages. Invalid or uncited
                provider output falls back to deterministic evidence.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.twoColumn}>
        <article className={styles.paperPanel}>
          <p className={styles.kicker}>Allowed at runtime</p>
          <h2>Small, explicit tools</h2>
          <p>
            Corpus search and passage fetch surround six typed domain tools: scenario lookup,
            two-to-three-scenario comparison, the categorical observability matrix, the published
            observer lookup, reported collapse metrics, and a fixed 20,000-run independent replay.
            One bounded round may make at most six domain calls. Each answer carries call names,
            statuses, and deterministic SHA-256 receipt hashes. There is no arbitrary web, SQL,
            filesystem, code execution, account mutation, or free-parameter simulation.
          </p>
        </article>
        <article className={styles.darkPanel}>
          <p className={styles.kicker}>Release gate</p>
          <h2>{runtime.previewEnabled ? 'Preview enabled' : 'Prompt surface held closed'}</h2>
          <p>
            <code>JANUS_RESEARCH_PREVIEW_ENABLED</code> controls the prompt surface; the lexical,
            deterministic path can run without provider credentials. Live generation separately
            requires the server-only live-call flag, valid credentials, and deployment canaries.
            Hybrid retrieval additionally requires a matching prebuilt index and embedding service.
            Shared multi-replica request budgets remain a deployment gate.
          </p>
        </article>
      </section>

      <section className={styles.appendixBand}>
        <div>
          <p className={styles.kicker}>Independent research</p>
          <h2>Reported values and reimplementation never share a label.</h2>
        </div>
        <p>
          The resilience experiment independently implements the paper equations and compares its
          ensembles only with prose-reported aggregates. Its outputs remain noncanonical and its
          year-step choices remain explicit implementation decisions.
        </p>
        <Link className={styles.textLink} href="/research/resilience">
          Inspect resilience validation →
        </Link>
      </section>

      <section className={styles.footerLinks} aria-label="Research documentation links">
        <Link href="/research/concordia">Concordia deliberation appendix</Link>
        <Link href="/methods">Methods and limitations</Link>
        <Link href="/sources">Source and rights ledger</Link>
        <Link href="/api/health">Release health</Link>
      </section>
    </InnerPage>
  );
}
