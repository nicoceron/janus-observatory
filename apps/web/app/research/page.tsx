import type { Metadata } from 'next';
import Link from '../components/AppLink';

import { readResearchRuntimeConfig } from '@janus/agent';

import sourceCatalog from '../../../../data/sources/catalog.json';
import { InnerPage } from '../components/InnerPage';
import { ResearchCompanion } from './ResearchCompanion';
import styles from './Research.module.css';

export const metadata: Metadata = {
  title: 'Research',
  description:
    'The Project Janus studies behind Janus Observatory, and our own rebuild of the collapse-and-recovery model.',
  alternates: { canonical: '/research' },
};

const suggestedQuestions = [
  'Why would an optical telescope detect nothing in S9?',
  'Which instruments could detect S4?',
  'How does S4 collapse and recover?',
  'Compare population and energy use in S5 and S9.',
];

/** What each paper in the series contributes, in a sentence a visitor can use. */
const paperRoles: Record<string, string> = {
  '10.1016/j.techfore.2025.124194':
    'The ten futures themselves: how each civilization works, how large it grows and the marks it leaves.',
  '10.1016/j.actaastro.2025.01.048':
    'How far energy use and growth can go before they run into physical limits.',
  '10.3847/2041-8213/ae23c6':
    'What five future instruments could detect in each future, seen from another star.',
  '10.18278/sesa.5.4.12': 'How power and freedom might work as civilization spreads into space.',
  '10.48550/arXiv.2604.13774':
    'How often each future collapses, how it recovers, and what that means for being seen.',
};

function shortTitle(title: string) {
  return title.replace(/^Projections of Earth.s Technosphere:\s*/, '');
}

function byline(creators: string[]) {
  const [first, ...rest] = creators;
  const surname = first.split(' ').at(-1);
  return rest.length > 0 ? `${surname} and colleagues` : surname;
}

export default function ResearchPage() {
  const runtime = readResearchRuntimeConfig(process.env);

  return (
    <InnerPage
      lede="Janus Observatory is built on Project Janus, a series of studies imagining how human civilization might look in 1,000 years—and what it would look like from far away."
      title="The research behind the story."
    >
      <section className={styles.studies} aria-labelledby="studies-title">
        <h2 id="studies-title">The studies</h2>
        <ol>
          {sourceCatalog.papers.map((paper) => (
            <li key={paper.doi}>
              <a href={paper.canonicalUrl} rel="noreferrer" target="_blank">
                <span className={styles.studyTitle}>{shortTitle(paper.title)}</span>
                <span className={styles.studyRole}>{paperRoles[paper.doi]}</span>
                <span className={styles.studyMeta}>
                  {byline(paper.creators)} · {paper.license} ↗
                </span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.appendixBand}>
        <div>
          <h2>Our rebuild of the collapse model.</h2>
        </div>
        <div>
          <p>
            To explore how the futures collapse and recover, we rebuilt the collapse study’s model
            from the equations in the paper and checked it against every number the paper states in
            its text. It’s our own version, not the authors’ code, and it never replaces their
            results.
          </p>
          <Link className={styles.textLink} href="/research/resilience">
            See how the rebuild compares
          </Link>
        </div>
      </section>

      {runtime.previewEnabled ? (
        <ResearchCompanion
          maximumCharacters={runtime.maxQuestionChars}
          suggestions={suggestedQuestions}
        />
      ) : null}

      <nav className={styles.footerLinks} aria-label="More about the evidence">
        <Link href="/methods">How we built this</Link>
        <Link href="/sources">Every source and credit</Link>
        <Link href="/atlas#downloads">Download the data</Link>
      </nav>
    </InnerPage>
  );
}
