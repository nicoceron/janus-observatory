import type { Metadata } from 'next';
import Link from '../../components/AppLink';

import validation from '../../../../../data/generated/collapse/independent-validation.json';
import { InnerPage } from '../../components/InnerPage';
import styles from '../Research.module.css';

export const metadata: Metadata = {
  title: 'Independent resilience validation',
  description:
    'Inspect the noncanonical independent reimplementation of the published Janus collapse-recovery equations and its validation limits.',
  alternates: { canonical: '/research/resilience' },
};

function metric(
  comparisons: Array<{ metric: string; reported: number | null; ours: number; verdict: string }>,
  id: string,
) {
  return comparisons.find(({ metric: candidate }) => candidate === id);
}

function number(value: number | null | undefined, digits = 3) {
  return value === null || value === undefined ? 'not stated in prose' : value.toFixed(digits);
}

export default function ResilienceResearchPage() {
  const available = validation.status === 'validated_experiment_report';

  return (
    <InnerPage
      eyebrow="Research appendix · independent reimplementation"
      lede="A separate experiments-track implementation of the CC BY collapse-recovery equations, validated against only the aggregates the paper reports in prose. It is not author code and it never replaces canonical reported values."
      title="Collapse results need two labels."
    >
      <aside className={styles.scientificNotice}>
        <strong>
          {available ? 'Validation report passed.' : 'Independent output held closed.'}
        </strong>
        <p>
          {available
            ? 'The current report records ten passing scenario comparisons under its documented tolerances. This supports an appendix, not an “official Janus simulation” claim.'
            : 'No validated independent report is available in this build.'}
        </p>
      </aside>

      {available ? (
        <section className={styles.validationSection} aria-labelledby="validation-table-title">
          <div className={styles.sectionLead}>
            <p>Reported versus reimplemented</p>
            <h2 id="validation-table-title">Null stays null. Approximate stays approximate.</h2>
          </div>
          <div className={styles.tableScroll} tabIndex={0}>
            <table>
              <caption>
                Large-ensemble independent outputs beside available prose-reported targets. Missing
                targets are not inferred from figure heights.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Scenario</th>
                  <th scope="col">Independent duty cycle</th>
                  <th scope="col">Reported duty cycle</th>
                  <th scope="col">Independent collapses</th>
                  <th scope="col">Reported collapses</th>
                  <th scope="col">Comparison</th>
                </tr>
              </thead>
              <tbody>
                {validation.scenarios.map((scenario) => {
                  const duty = metric(scenario.comparisons, 'mean_duty_cycle');
                  const collapses = metric(scenario.comparisons, 'mean_collapse_count');
                  return (
                    <tr key={scenario.scenarioId}>
                      <th scope="row">{scenario.scenarioId}</th>
                      <td>{number(scenario.largeEnsemble.mean_duty_cycle)}</td>
                      <td>{number(duty?.reported)}</td>
                      <td>{number(scenario.largeEnsemble.mean_collapse_count, 2)}</td>
                      <td>{number(collapses?.reported, 2)}</td>
                      <td>{scenario.worstVerdict}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className={styles.twoColumn}>
        <article className={styles.paperPanel}>
          <p className={styles.kicker}>What is reported</p>
          <h2>Paper parameters and prose aggregates</h2>
          <p>
            The canonical layer transcribes Table 4 parameters and exact or safely rounded values
            from the paper prose. Figure-only values remain null.
          </p>
        </article>
        <article className={styles.darkPanel}>
          <p className={styles.kicker}>What is independent</p>
          <h2>Equations, step semantics, seeded ensembles</h2>
          <p>
            The experiment implements Equations 1–3 from the publication. Hazard tie-breaking,
            recovery timing, uncertainty distributions, and extinction behavior are explicit
            independent choices covered by its ADR and tests.
          </p>
        </article>
      </section>

      <section className={styles.limitations}>
        <p className={styles.kicker}>Limits that remain</p>
        <ul>
          {validation.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/research">Return to Research Companion</Link>
        <Link href="/methods">Read methods and caveats</Link>
        <Link href="/sources">Resolve canonical sources</Link>
      </div>
    </InnerPage>
  );
}
