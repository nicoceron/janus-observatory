import type { Metadata } from 'next';
import Link from '../../components/AppLink';

import validation from '../../../../../data/generated/collapse/independent-validation.json';
import { InnerPage } from '../../components/InnerPage';
import styles from '../Research.module.css';

export const metadata: Metadata = {
  title: 'Our rebuild of the collapse model',
  description:
    'We rebuilt the Project Janus collapse-and-recovery model from the published equations and checked it against the paper. Here is how it compares.',
  alternates: { canonical: '/research/resilience' },
};

function metric(
  comparisons: Array<{ metric: string; reported: number | null; ours: number; verdict: string }>,
  id: string,
) {
  return comparisons.find(({ metric: candidate }) => candidate === id);
}

function percent(value: number | null | undefined) {
  return value === null || value === undefined ? 'Chart only' : `${(value * 100).toFixed(1)}%`;
}

function average(value: number | null | undefined) {
  return value === null || value === undefined ? 'Chart only' : value.toFixed(1);
}

export default function ResilienceResearchPage() {
  const available = validation.status === 'validated_experiment_report';

  return (
    <InnerPage
      lede="We rebuilt the collapse study’s model from the equations in its paper, then checked our results against every number the paper states in its text. It’s our own version—not the authors’ code—and it never replaces their results."
      title="Our rebuild of the collapse model."
    >
      <aside className={styles.scientificNotice}>
        <strong>{available ? 'It matches the paper.' : 'The check isn’t available.'}</strong>
        <p>
          {available
            ? 'For all ten futures, our results agree with the numbers the paper states, within the tolerances we set. That makes it a useful companion, not an official Janus simulation.'
            : 'This version of the site doesn’t include a passing check of the rebuild.'}
        </p>
      </aside>

      {available ? (
        <section className={styles.validationSection} aria-labelledby="validation-table-title">
          <div className={styles.sectionLead}>
            <h2 id="validation-table-title">Side by side with the paper.</h2>
            <p>
              “Time active” is the share of the 1,000 years a civilization spends running rather
              than collapsed; the paper calls it the duty cycle. Where the paper only shows a chart,
              there’s no exact number to compare.
            </p>
          </div>
          <div className={styles.tableScroll} tabIndex={0}>
            <table>
              <caption>
                Averages from our {validation.ensembleSizes.large.toLocaleString('en')} runs of each
                future, next to the paper’s numbers.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Future</th>
                  <th scope="col">Time active, ours</th>
                  <th scope="col">Time active, paper</th>
                  <th scope="col">Collapses, ours</th>
                  <th scope="col">Collapses, paper</th>
                  <th scope="col">Match</th>
                </tr>
              </thead>
              <tbody>
                {validation.scenarios.map((scenario) => {
                  const duty = metric(scenario.comparisons, 'mean_duty_cycle');
                  const collapses = metric(scenario.comparisons, 'mean_collapse_count');
                  return (
                    <tr key={scenario.scenarioId}>
                      <th scope="row">{scenario.scenarioId}</th>
                      <td>{percent(scenario.largeEnsemble.mean_duty_cycle)}</td>
                      <td>{percent(duty?.reported)}</td>
                      <td>{average(scenario.largeEnsemble.mean_collapse_count)}</td>
                      <td>{average(collapses?.reported)}</td>
                      <td>{scenario.worstVerdict === 'pass' ? 'Yes' : 'Needs review'}</td>
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
          <p className={styles.kicker}>From the paper</p>
          <h2>Settings and results</h2>
          <p>
            We copy the model’s settings from the paper’s Table 4, and its results from the numbers
            it states in its text. Results it only shows in charts stay blank.
          </p>
        </article>
        <article className={styles.darkPanel}>
          <p className={styles.kicker}>Our own</p>
          <h2>The rebuilt model</h2>
          <p>
            We coded the paper’s three equations ourselves. Where the paper leaves details open—how
            ties break, exactly when recovery starts—we made our own documented choices.
          </p>
        </article>
      </section>

      <section className={styles.limitations}>
        <h2>Limits to keep in mind</h2>
        <ul>
          <li>This is our own version of the published equations, not the authors’ code.</li>
          <li>
            Where the paper leaves the timing of each yearly step open, our choices may differ from
            theirs.
          </li>
          <li>We only check numbers the paper states in its text; we never guess from charts.</li>
          <li>
            The authors’ code and summary data are linked, not copied, because they have no license.
          </li>
        </ul>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/research">All the research</Link>
        <Link href="/methods">How we built this</Link>
        <a href="/api/downloads/independent-validation" download>
          Download the full check
        </a>
      </div>
    </InnerPage>
  );
}
