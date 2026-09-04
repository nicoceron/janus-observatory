import type { Metadata } from 'next';
import Link from 'next/link';

import experiment from '../../../../../experiments/concordia/configs/experiment-matrix.json';
import { InnerPage } from '../../components/InnerPage';

export const metadata: Metadata = {
  title: 'Concordia deliberation experiment',
  description:
    'A bounded policy-council deliberation appendix—not a scientific simulation or forecast—that compares model-generated summaries with withheld Project Janus records.',
  alternates: { canonical: '/research/concordia' },
  openGraph: {
    title: 'Concordia deliberation experiment · Janus Observatory',
    description:
      'An optional bounded-deliberation appendix with withheld targets, deterministic comparison, and explicit model-generated labels.',
    url: '/research/concordia',
  },
};

export default function ConcordiaExperimentPage() {
  return (
    <InnerPage
      eyebrow="Research appendix · bounded multi-agent deliberation"
      lede="This compares a bounded policy-council transcript with withheld Janus endpoints. It is not a physical, social, or scientific simulation, and it is not a forecast."
      title="How does a bounded agent council compare with Janus endpoints?"
    >
      <section className="proseSection">
        <h2>Deliberation only—not simulation or forecast</h2>
        <p>
          The roles exchange arguments in a bounded council. They do not execute a causal world
          model, evolve physical state, or reproduce civilization dynamics. Each job receives only
          the source-backed Table 5 morphology context; Table 9 population, energy, and growth
          endpoints stay hidden until a deterministic comparison step. Any resemblance is a
          model-generated comparison result—not model validation, a probability, or a Janus fact.
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
        <h2>Ten seeded job specifications</h2>
        <div className="concordiaRunGrid" aria-label="Concordia experiment seeds">
          {experiment.runs.map((run) => (
            <div key={run.targetScenarioId}>
              <strong>{run.targetScenarioId}</strong>
              <span>seed {run.seed}</span>
            </div>
          ))}
        </div>
        <p>
          Each job is capped at {experiment.maxSteps} council steps. The seed fixes local ordering,
          but a remote language model may still produce different text. Raw transcripts, model
          identity, source allowlist, protocol version, seed, prompt hash, and transcript hash are
          written to ignored local artifacts for audit.
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
        Deliberation boundary: this appendix has no deterministic physical transition model and
        cannot simulate or forecast a civilization. The pinned gdm-concordia 2.4.0 path has only
        been exercised with a mocked OpenAI-compatible provider; no paid live-model output is
        bundled as scientific evidence.
      </aside>

      <Link className="inlineAction" href="/research">
        Return to Research Companion →
      </Link>
    </InnerPage>
  );
}
