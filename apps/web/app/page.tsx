import { WorldExplore } from './voyage/WorldExplore';
import type { Metadata } from 'next';
import Link from './components/AppLink';
import type { CSSProperties } from 'react';
import {
  allScenarioProfiles,
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
import s from './voyage/voyage.module.css';

export const metadata: Metadata = {
  title: 'First light · Ten possible futures',
  description:
    'A journey through ten possible civilizations. Explore Project Janus, then see our world through another observer’s eyes.',
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
const energy = (v: number) => v.toExponential();

export default function Home() {
  const systems = allScenarioProfiles.map(systemPortrait);
  const charts = allScenarioProfiles.map((p, i) => ({
    id: p.id,
    title: p.morphology.mythMetaphor,
    population: p.growth.population,
    energy: p.growth.annualEnergyUseJ,
    color: worlds[i].color,
    populationDisplay: compact(p.growth.population),
    energyDisplay: energy(p.growth.annualEnergyUseJ),
  }));
  const signals = allScenarioProfiles.map((p) => ({
    id: p.id,
    title: p.morphology.mythMetaphor,
    signals: p.observations.map((o) => ({
      id: o.id,
      short: o.short,
      label: o.label,
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
              Project Janus explores ten self-consistent futures of Earth and the Solar System. Some
              civilizations grow. Some stabilize. Some collapse and find another way.
            </p>
            <p className={s.highlight}>
              These are possibilities, not forecasts. They carry no probability ranking and are not
              equally weighted probabilities.
            </p>
            <a className={s.source} href={sourceRefHref(growthDataset.source)}>
              Project Janus ↗
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
                    <dt>Population</dt>
                    <dd>{compact(profile.growth.population)}</dd>
                  </div>
                  <div>
                    <dt>Energy / year</dt>
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
              Observing strategies ↗
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
            <p className={s.lede}>Return to S9. The machines have moved beyond Earth.</p>
            <p>
              The published optical space telescope (HWO) comparison does not reveal the scale of
              that civilization. Its technological activity exists elsewhere in the system.
            </p>
            <p className={s.highlight}>
              No detected signature by this method does not mean no technology.
            </p>
            <a className={s.textLink} href="#observer" data-voyage-jump="observer">
              <span aria-hidden="true">↙</span> Step back from the eyepiece
            </a>
            <Link
              className={s.textLink}
              href="/observatory?scenario=S9&instrument=solar_gravitational_lens"
            >
              Change the way you look ↗
            </Link>
            <a className={s.source} href={sourceRefHref(observabilityDataset.source)}>
              Published comparison ↗
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
              An atmosphere. A radio beacon. A changed surface. Each instrument asks a different
              question. Select a world to follow its reported signatures.
            </p>
          </div>
          <SignalMatrix worlds={signals} />
          <a className={s.source} href={sourceRefHref(observabilityDataset.source)}>
            Source: Figure 6 ↗
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
              Population and energy use span very different scales across the Janus scenarios. These
              are reported scenario values, not a ranking of success or a forecast.
            </p>
          </div>
          <CivilizationChart worlds={charts} />
          <a className={s.source} href={sourceRefHref(growthDataset.source)}>
            Source: Table 9 ↗
          </a>
          <div className={s.enduranceNote}>
            <h3>Civilizations breathe.</h3>
            <p>
              The collapse and recovery study explores activity over time. A civilization’s present
              state is only one part of its history; technological signatures can persist beyond the
              activity that made them.
            </p>
            <a href={sourceRefHref(collapseDataset.source)}>Read the published model ↗</a>
            <Link href="/research/resilience">Explore the independent reimplementation ↗</Link>
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
          <div className={s.footerBrand}>JANUS</div>
          <div>
            <p>
              An independent interpretation of Project Janus. Worlds and observer are illustrative.
            </p>
            <p>
              Designed and built by <a href="https://dardo.studio/">Dardo</a>.
            </p>
            <nav aria-label="Research and credits">
              <Link href="/sources">Sources & credits ↗</Link>
              <Link href="/methods">Methods ↗</Link>
              <Link href="/research">Research companion ↗</Link>
              <Link href="/accessibility">Accessibility ↗</Link>
            </nav>
            <a href="#first-light" className={s.textLink}>
              Return to first light ↑
            </a>
          </div>
        </footer>
      </Voyage>
    </main>
  );
}
