import { WorldExplore } from './voyage/WorldExplore';
import type { Metadata } from 'next';
import Link from './components/AppLink';
import type { CSSProperties } from 'react';
import {
  allScenarioProfiles,
  scientificNotation,
  sourceRefHref,
  sourceRefLabel,
  growthDataset,
  observabilityDataset,
  collapseDataset,
} from '../lib/canonical-core';
import { Voyage } from './voyage/Voyage';
import { CivilizationChart, SignalMatrix } from './voyage/Charts';
import { worlds } from './voyage/worlds';
import { systemPortrait } from '../lib/system-portrait';
import { worldSignals } from '../lib/world-signals';
import { chapterTitles } from '../lib/chapter-titles';
import s from './voyage/voyage.module.css';

export const metadata: Metadata = {
  title: 'First light · Ten possible futures',
  description:
    'Travel through ten possible futures of human civilization from the Project Janus research, then look back at Earth the way an astronomer on another star would.',
  alternates: { canonical: '/' },
};
const headlines = [
  ['Order.', 'At a cost.'],
  ['The frontier', 'never closes.'],
  ['Enough', 'for everyone.'],
  ['A different', 'kind of wealth.'],
  ['Life,', 'redesigned.'],
  ['Perfectly', 'on the edge.'],
  ['After the fall,', 'roots.'],
  ['History', 'on repeat.'],
  ['They have', 'already left.'],
  ['One origin.', 'Two destinies.'],
];
const compact = (v: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

export default function Home() {
  const systems = allScenarioProfiles.map(systemPortrait);
  const charts = allScenarioProfiles.map((p, i) => ({
    id: p.id,
    title: p.morphology.mythMetaphor,
    population: p.growth.population,
    energy: p.growth.annualEnergyUseJ,
    color: worlds[i].color,
    populationDisplay: compact(p.growth.population),
    energyDisplay: scientificNotation(p.growth.annualEnergyUseJ),
  }));
  const signals = allScenarioProfiles.map((p) => ({
    id: p.id,
    title: p.morphology.mythMetaphor,
    signals: p.observations.map((o) => ({
      id: o.id,
      short: o.name,
      label: o.plainLabel,
      status: o.result.status,
      features: o.result.signatures,
      href: sourceRefHref(o.result.sourceRefs[0]),
      source: sourceRefLabel(o.result.sourceRefs[0]),
    })),
  }));
  return (
    <main id="main">
      <Voyage
        systems={systems.map((system) => system.art)}
        signals={allScenarioProfiles.map(worldSignals)}
        chapterTitles={chapterTitles}
      >
        <section
          id="first-light"
          data-chapter="0"
          tabIndex={-1}
          className={`${s.chapter} ${s.hero}`}
        >
          <div className={s.heroCopy}>
            <h1 data-intro>
              Ten futures.
              <br />
              One <em>question.</em>
            </h1>
            <p className={s.heroQuestion} data-intro>
              Would anyone know
              <br />
              we were here?
            </p>
            <p className={s.heroDescription} data-intro>
              Travel through the possible futures of our civilization. Then look back through alien
              eyes.
            </p>
            <a className={s.begin} href="#possibilities" data-intro>
              <span className={s.beginCircle}>↓</span>
              <span>Begin the journey</span>
            </a>
          </div>
        </section>
        <section id="possibilities" data-chapter="1" tabIndex={-1} className={s.chapter}>
          <div className={s.copy}>
            <h2>
              The future
              <br />
              has <em>branches.</em>
            </h2>
            <p className={s.lede}>There is no single road from here.</p>
            <p>
              Project Janus is a research effort that imagined ten futures for Earth and the Solar
              System, each worked through carefully enough to hold together. Some civilizations
              grow. Some settle into balance. Some collapse and find another way.
            </p>
            <p className={s.highlight}>
              These are possibilities, not predictions—and they aren’t ranked by how likely they
              are.
            </p>
            <a className={s.source} href={sourceRefHref(growthDataset.source)}>
              Read the scenario study ↗
            </a>
          </div>
        </section>
        {allScenarioProfiles.map((profile, i) => (
          <section
            key={profile.id}
            id={profile.id.toLowerCase()}
            data-chapter={i + 2}
            data-world={profile.id}
            tabIndex={-1}
            className={`${s.chapter} ${s.worldChapter}`}
            style={{ '--world-color': worlds[i].color } as CSSProperties}
          >
            <div className={s.worldAnnotation}>
              <WorldExplore world={i} system={systemPortrait(profile).art} />
            </div>
            <div className={s.copySlot} data-copy-slot>
              <div className={s.copy} data-chapter-copy>
                <div className={s.worldIndex}>
                  <span>{profile.id}</span>
                  <p>{profile.morphology.mythMetaphor}</p>
                </div>
                <h2>
                  {headlines[i][0]}
                  <br />
                  <em>{headlines[i][1]}</em>
                </h2>
                <p>{profile.morphology.canonicalSummary.value}</p>
                <dl className={s.worldStats}>
                  <div>
                    <dt>Population in 1,000 years</dt>
                    <dd>{compact(profile.growth.population)}</dd>
                  </div>
                  <div>
                    <dt>Energy used per year</dt>
                    <dd>
                      {profile.growth.annualEnergyUseJ.toExponential().split('e+')[0]}
                      <span>
                        {' '}
                        × 10
                        <sup>
                          {profile.growth.annualEnergyUseJ.toExponential().split('e+')[1]}
                        </sup>{' '}
                        J
                      </span>
                    </dd>
                  </div>
                </dl>
                <div className={s.worldLinks}>
                  <Link href={`/atlas/${profile.id.toLowerCase()}`}>
                    Explore this civilization ↗
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ))}
        <section
          id="observer"
          data-chapter="12"
          tabIndex={-1}
          className={`${s.chapter} ${s.observerChapter}`}
        >
          <div className={s.copy}>
            <h2>
              Now, become
              <br />
              <em>the stranger.</em>
            </h2>
            <p className={s.lede}>
              You know a civilization is there.
              <br />
              Your telescope does not.
            </p>
            <p>
              Leave the surface behind. From a distance, the detail of a world becomes a little
              light—and the instrument you choose determines what survives the journey.
            </p>
            <p className={s.highlight}>
              What exists and what can be observed are different questions.
            </p>
            <a className={s.textLink} href="#invisible" data-voyage-jump="invisible">
              Look through the telescope <span aria-hidden="true">↗</span>
            </a>
            <a className={s.source} href={sourceRefHref(observabilityDataset.source)}>
              Read the observing study ↗
            </a>
          </div>
        </section>
        <section
          id="invisible"
          data-chapter="13"
          tabIndex={-1}
          className={`${s.chapter} ${s.opticalChapter}`}
        >
          <div className={s.copy}>
            <h2>
              A quiet world.
              <br />
              <em>A vast civilization.</em>
            </h2>
            <p className={s.lede}>Back to S9, where the machines have moved out beyond Earth.</p>
            <p>
              Point an optical space telescope at this system and the study lists nothing it could
              detect. The civilization’s work is spread across other worlds, at a scale only much
              sharper instruments could resolve.
            </p>
            <p className={s.highlight}>
              Seeing nothing with one instrument doesn’t mean nothing is there.
            </p>
            <a className={s.textLink} href="#observer" data-voyage-jump="observer">
              <span aria-hidden="true">↙</span> Step back from the eyepiece
            </a>
            <Link
              className={s.textLink}
              href="/observatory?scenario=S9&instrument=solar_gravitational_lens"
            >
              Try a different instrument ↗
            </Link>
            <a className={s.source} href={sourceRefHref(observabilityDataset.source)}>
              Source: the observing study ↗
            </a>
          </div>
        </section>
        <section
          id="signals"
          data-chapter="14"
          data-layout="article"
          tabIndex={-1}
          className={`${s.chapter} ${s.fullChapter}`}
        >
          <div className={s.sectionIntro}>
            <h2>
              One sky.
              <br />
              <em>Different evidence.</em>
            </h2>
            <p>
              An atmosphere. A radio beacon. A changed surface. Each instrument picks up different
              clues. Pick a world to see what each one could detect.
            </p>
          </div>
          <SignalMatrix worlds={signals} />
          <a className={s.source} href={sourceRefHref(observabilityDataset.source)}>
            Source: the observing study, Figure 6 ↗
          </a>
        </section>
        <section
          id="endurance"
          data-chapter="15"
          data-layout="article"
          tabIndex={-1}
          className={`${s.chapter} ${s.fullChapter}`}
        >
          <div className={s.sectionIntro}>
            <h2>
              Growth is only
              <br />
              <em>part of the story.</em>
            </h2>
            <p>
              Population and energy use vary enormously between these futures. Bigger isn’t better
              here: these are the study’s numbers, not scores or predictions.
            </p>
          </div>
          <CivilizationChart worlds={charts} />
          <a className={s.source} href={sourceRefHref(growthDataset.source)}>
            Source: the scenario study, Table 9 ↗
          </a>
          <div className={s.enduranceNote}>
            <h3>Civilizations breathe.</h3>
            <p>
              A separate Janus study simulates how each future might collapse and recover over a
              thousand years. Any snapshot is one moment in a longer history—and signs of technology
              can outlast the activity that made them.
            </p>
            <a href={sourceRefHref(collapseDataset.source)}>Read the collapse study ↗</a>
            <Link href="/research/resilience">See our rebuild of the model ↗</Link>
          </div>
        </section>
        <section
          id="beyond"
          data-chapter="16"
          tabIndex={-1}
          className={`${s.chapter} ${s.epilogue}`}
        >
          <div className={s.closingPortrait} data-closing-portrait aria-hidden="true" />
          <div className={s.copy}>
            <h2>
              The universe
              <br />
              doesn’t owe us
              <br />
              <em>an obvious answer.</em>
            </h2>
            <p>
              We have one known example of a technological civilization. The Janus scenarios widen
              the questions we can ask—and remind us how much a distant glance can miss.
            </p>
            <Link className={s.bigLink} href="/atlas?compare=S1,S4,S9">
              Enter the atlas <span>↗</span>
            </Link>
            <Link
              className={s.textLink}
              href="/observatory?scenario=S9&instrument=habitable_worlds_observatory"
            >
              Take a seat at the observatory ↗
            </Link>
          </div>
        </section>
        <footer className={s.footer}>
          <div className={s.footerBrand}>Janus Observatory</div>
          <div>
            <p>
              An independent interpretation of Project Janus. The worlds and the observer are
              artwork, not data. Designed and built by <a href="https://dardo.studio/">Dardo</a>.
            </p>
            <nav aria-label="More about this site">
              <Link href="/research">Research</Link>
              <Link href="/methods">Methods</Link>
              <Link href="/sources">Sources &amp; credits</Link>
              <Link href="/accessibility">Accessibility</Link>
              <Link href="/privacy">Privacy</Link>
            </nav>
            <a href="#first-light" className={s.textLink}>
              Back to the top ↑
            </a>
          </div>
        </footer>
      </Voyage>
    </main>
  );
}
