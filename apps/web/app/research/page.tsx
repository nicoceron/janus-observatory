import type { Metadata } from 'next';
import Link from 'next/link';

import { InnerPage } from '../components/InnerPage';

export const metadata: Metadata = { title: 'Research Companion' };

const supportedQuestions = [
  'Why can S9 be technologically extensive while its Earth atmosphere looks preagricultural?',
  'Which mission concepts list signatures for S4?',
  'How do reported collapse/recovery outcomes differ between S4 and S9?',
  'Which facts are absent from the published corpus?',
];

export default function ResearchPage() {
  return (
    <InnerPage
      eyebrow="Research companion · preview held closed"
      lede="The canonical experience does not depend on AI. This surface stays non-interactive until retrieval, citation audit, rate limits, and release evaluations pass together."
      title="Evidence first. Answers second."
    >
      <section className="proseSection">
        <h2>Current state</h2>
        <p>
          Provider adapters and health probes exist server-side, but a public arbitrary prompt box
          is intentionally not exposed. The release gate requires a bounded corpus workflow,
          passage-level citations, supported-claim audit, prompt-injection tests, and graceful
          static fallback. Until those gates pass, use the deterministic Observatory, Atlas, and
          Sources.
        </p>
      </section>
      <section className="proseSection">
        <h2>Planned question set</h2>
        <ul>
          {supportedQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </section>
      <section className="proseSection">
        <h2>Allowed runtime tools</h2>
        <p>
          Search corpus, fetch passages, get or compare scenarios, resolve the observability matrix,
          retrieve reported collapse metrics, run explicitly labeled deterministic domain models,
          and resolve citations. No public web, arbitrary SQL, filesystem, or code execution is
          available to the companion.
        </p>
      </section>
      <section className="proseSection">
        <h2>Concordia research appendix</h2>
        <p>
          The optional multi-agent experiment is isolated from the product runtime and compares
          model-generated endpoints against withheld canonical dimensions without producing a
          scenario score or probability.
        </p>
        <Link className="inlineAction" href="/research/concordia">
          Inspect the experiment design →
        </Link>
      </section>
      <aside className="pageNotice">
        Preview status is a deliberate fail-closed state—not a provider outage and not a substitute
        for the source-linked product.
      </aside>
    </InnerPage>
  );
}
