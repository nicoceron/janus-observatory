import type { Metadata } from 'next';
import Link from 'next/link';

import experiment from '../../../../../experiments/concordia/configs/experiment-matrix.json';
import { InnerPage } from '../../components/InnerPage';

export const metadata: Metadata = { title: 'Concordia experiment' };

export default function ConcordiaExperimentPage() {
  return (
    <InnerPage
      eyebrow="Research appendix · optional multi-agent experiment"
      lede="A bounded, reproducible way to test agent-generated endpoints against—never instead of—the authored Janus scenario space."
      title="Can agents reproduce any Janus dynamics?"
    >
      <section className="proseSection">
        <h2>Experiment, not forecast</h2>
        <p>
          The experiment runs one seeded policy-council job for each Janus scenario. Agents receive
          only the source-backed Table 5 morphology context. Table 9 population, energy, and growth
          endpoints stay hidden until a deterministic comparison step. A match would not validate
          the model or assign probability to a scenario.
        </p>
      </section>

      <section className="proseSection">
        <h2>Bounded council</h2>
        <div className="concordiaAgentGrid">
          {experiment.agents.map((agent) => (
            <article key={agent.name}>
              <span>MODEL ROLE</span>
              <h3>{agent.name}</h3>
              <p>{agent.goal}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="proseSection">
        <h2>Ten reproducible jobs</h2>
        <div className="concordiaRunGrid" aria-label="Concordia experiment seeds">
          {experiment.runs.map((run) => (
            <div key={run.targetScenarioId}>
              <strong>{run.targetScenarioId}</strong>
              <span>seed {run.seed}</span>
            </div>
          ))}
        </div>
        <p>
          Each run is capped at {experiment.maxSteps} steps. Raw transcripts, model identity, source
          allowlist, protocol version, seed, prompt hash, and transcript hash are written to ignored
          local artifacts for audit.
        </p>
      </section>

      <section className="proseSection">
        <h2>Comparison contract</h2>
        <ul>
          <li>Population, annual energy, and growth state remain separate dimensions.</li>
          <li>No composite similarity score and no scenario ranking are produced.</li>
          <li>
            Canonical values remain reported/transcribed; agent values remain model_generated.
          </li>
          <li>Arithmetic deltas are derived and never promoted into canonical scenario data.</li>
          <li>The core Story, Observatory, and Atlas never load this optional runtime.</li>
        </ul>
      </section>

      <aside className="pageNotice">
        The pinned gdm-concordia 2.4.0 execution path has been exercised with a mocked
        OpenAI-compatible provider. A paid live model run is intentionally not bundled as a
        scientific result.
      </aside>

      <Link className="inlineAction" href="/research">
        Return to Research Companion →
      </Link>
    </InnerPage>
  );
}
