import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import {
  allScenarioProfiles,
  sourceRefHref,
  sourceRefLabel,
  growthDataset,
  observabilityDataset,
  collapseDataset,
} from '../lib/canonical-core';
import { releaseIdentity } from '../lib/release-identity';
import { Voyage } from './voyage/Voyage';
import { CivilizationChart, SignalMatrix } from './voyage/Charts';
import { worlds } from './voyage/worlds';
import { systemPortrait } from '../lib/system-portrait';
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
      <Voyage systems={systems.map((system) => system.art)}>
        <section
          id="first-light"
          data-chapter="0"
          tabIndex={-1}
          className={`${s.chapter} ${s.hero}`}
        >
          <div className={s.heroCopy}>
            <p className={s.kicker} data-intro>
              <span className={s.liveDot} /> AN EXPEDITION INTO POSSIBILITY
            </p>
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
              <span>
                Begin the journey<small>SCROLL TO EXPLORE</small>
              </span>
            </a>
          </div>
          <div className={s.heroCoordinates}>
            <span>PROJECT JANUS</span>
            <span>EARTH / SOL SYSTEM</span>
            <span>A VISUAL FIELD GUIDE</span>
          </div>
          <div className={s.heroCaption}>
            <i />
            <span>
              One world.
              <br />
              An unfinished story.
            </span>
          </div>
        </section>
        <section id="possibilities" data-chapter="1" tabIndex={-1} className={s.chapter}>
          <div className={s.copy}>
            <p className={s.kicker}>01 / THE POSSIBILITY SPACE</p>
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
              Project Janus · {growthDataset.source.sourceVersion} · Table 9 ↗
            </a>
          </div>
          <span className={s.visualNote}>TEN SCENARIOS / ARTISTIC INTERPRETATIONS</span>
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
            <div className={s.copy}>
              <div className={s.worldIndex}>
                <span>{profile.id}</span>
                <p>
                  {profile.morphology.mythMetaphor}
                  <small>PROJECT JANUS SCENARIO</small>
                </p>
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
                      <sup>{profile.growth.annualEnergyUseJ.toExponential().split('e+')[1]}</sup> J
                    </span>
                  </dd>
                </div>
              </dl>
              <div className={s.worldLinks}>
                <Link href={`/atlas/${profile.id.toLowerCase()}`}>Explore this civilization ↗</Link>
                <a href={sourceRefHref(profile.growth.fieldProvenance.population[0])}>Table 9 ↗</a>
              </div>
              {systems[i].locations.length > 0 && (
                <div
                  className={s.systemFootprint}
                  aria-label={`${profile.id} published off-world footprint`}
                >
                  <span>SELECTED OFF-WORLD FOOTPRINT</span>
                  <p>
                    {systems[i].locations.map((location) => (
                      <a key={location.body} href={sourceRefHref(location.sourceRefs[0])}>
                        {location.body === 'Moon' ? 'Luna (Moon)' : location.body}
                      </a>
                    ))}
                  </p>
                  {systems[i].extended.length > 0 && (
                    <small>
                      {systems[i].extended.map((feature) => (
                        <a key={feature.feature} href={sourceRefHref(feature.sourceRefs[0])}>
                          {feature.label}
                        </a>
                      ))}
                    </small>
                  )}
                </div>
              )}
              <a
                className={s.source}
                href={sourceRefHref(profile.morphology.canonicalSummary.sourceRefs[0])}
              >
                {profile.morphology.canonicalSummary.sourceRefs[0].sourceVersion} ·{' '}
                {sourceRefLabel(profile.morphology.canonicalSummary.sourceRefs[0])} ↗
              </a>
            </div>
            <div className={s.worldAnnotation}>
              <span>{String(i + 1).padStart(2, '0')} / 10</span>
              <p>{worlds[i].caption}</p>
              <small>ARTISTIC SYSTEM PORTRAIT · SIZES & DISTANCES NOT TO SCALE</small>
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
            <p className={s.kicker}>02 / THE OTHER SIDE OF THE LENS</p>
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
              Observing strategies · {observabilityDataset.source.sourceVersion} ↗
            </a>
          </div>
          <div className={s.worldAnnotation}>
            <span>AN OBSERVER, IMAGINED</span>
            <p>A different life. The same curiosity.</p>
            <small>FICTIONAL ORGANISM & INSTRUMENT · ORIGINAL JANUS ART</small>
          </div>
        </section>
        <section
          id="invisible"
          data-chapter="13"
          tabIndex={-1}
          className={`${s.chapter} ${s.opticalChapter}`}
        >
          <div className={s.copy}>
            <p className={s.kicker}>03 / HIDDEN IN PLAIN SIGHT</p>
            <h2>
              A quiet world.
              <br />
              <em>A vast civilization.</em>
            </h2>
            <p className={s.lede}>Return to S9. The machines have moved beyond Earth.</p>
            <p>
              The published HWO atmospheric comparison does not reveal the scale of that
              civilization. Its technological activity exists elsewhere in the system.
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
              {observabilityDataset.source.sourceVersion} · Figure 6 ↗
            </a>
          </div>
          <div className={s.targetReticle}>
            <i />
            <i />
            <span>S9 / THROUGH THE EYEPIECE</span>
            <small>ILLUSTRATIVE VIEW · NOT AN OPTICAL SIMULATION</small>
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
            <p className={s.kicker}>04 / WAYS OF SEEING</p>
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
            Transcribed from {observabilityDataset.source.sourceVersion} · Figure 6, page 10 ↗
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
            <p className={s.kicker}>05 / THE SCALE OF A CIVILIZATION</p>
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
            Transcribed from {growthDataset.source.sourceVersion} · Table 9 ↗
          </a>
          <div className={s.enduranceNote}>
            <span>01 / PERSISTENCE</span>
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
          <div className={s.copy}>
            <p className={s.kicker}>06 / THE SEARCH CONTINUES</p>
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
          <div className={s.footerBrand}>
            JANUS<span>KEEP LOOKING.</span>
          </div>
          <div>
            <p>
              An independent visual interpretation of Project Janus. Scenario scholarship is
              credited to the authors in the source ledger. Original procedural worlds and fictional
              observer and telescope: Janus Observatory, with AI-assisted code.
            </p>
            <p>
              Terrain, coastlines, structures, and scales in this journey are artistic inventions.
              They are not reconstructions or instrument simulations. Credits for additional NASA
              and other media elsewhere in the observatory are itemized in the source ledger.
            </p>
            <nav aria-label="Research and credits">
              <Link href="/sources">Sources & credits ↗</Link>
              <Link href="/methods">Methods ↗</Link>
              <Link href="/research">Research companion ↗</Link>
              <Link href="/accessibility">Accessibility ↗</Link>
            </nav>
            <p className={s.releaseNote}>
              Canonical data: {releaseIdentity.dataVersion.slice(0, 19)}… ·{' '}
              {releaseIdentity.independentHumanReview === 'pending'
                ? 'Transcribed release; independent human review pending.'
                : 'Reviewed release.'}
            </p>
            <a href="#first-light" className={s.textLink}>
              Return to first light ↑
            </a>
          </div>
        </footer>
      </Voyage>
    </main>
  );
}
