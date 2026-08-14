'use client';

import type { ScenarioId } from '@janus/domain';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  allScenarioProfiles,
  getScenarioProfile,
  instrumentCopy,
  scientificNotation,
} from '../../lib/canonical';
import { storySteps } from './story-content';

const EarthStage = dynamic(() => import('./EarthStage').then((module) => module.EarthStage), {
  ssr: false,
  loading: () => <div className="earthStageLoader">Preparing the spatial stage…</div>,
});

const worldLabelPositions: Record<ScenarioId, { left: string; top: string }> = {
  S1: { left: '12%', top: '31%' },
  S2: { left: '18%', top: '45%' },
  S3: { left: '25%', top: '59%' },
  S4: { left: '34%', top: '70%' },
  S5: { left: '44%', top: '77%' },
  S6: { left: '55%', top: '77%' },
  S7: { left: '65%', top: '70%' },
  S8: { left: '74%', top: '59%' },
  S9: { left: '82%', top: '45%' },
  S10: { left: '89%', top: '31%' },
};

function MetricReadout({ scenarioId }: { scenarioId: ScenarioId }) {
  const profile = getScenarioProfile(scenarioId);
  const detections = profile.observations.filter(
    ({ result }) => result.signatures.length > 0,
  ).length;
  const metrics = [
    ['Population', scientificNotation(profile.growth.population)],
    ['Annual energy', `${scientificNotation(profile.growth.annualEnergyUseJ)} J`],
    ['Governance', profile.morphology.globalFactor],
    ['Technology', `Cluster ${profile.morphology.technologyCluster}`],
    ['Listed methods', `${detections} / 5`],
  ];

  return (
    <dl className="storyMetricReadout" aria-label={`Canonical dimensions for ${scenarioId}`}>
      {metrics.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function WorldLabels({
  activeScenario,
  budding,
  visible,
}: {
  activeScenario?: ScenarioId;
  budding: boolean;
  visible: boolean;
}) {
  return (
    <div
      aria-label="All ten Janus scenario worlds. Their spatial separation does not encode probability."
      className={
        activeScenario
          ? `worldLabels worldLabelsFocused ${visible ? 'storyOverlayVisible' : ''}`
          : budding
            ? `worldLabels worldLabelsBudding ${visible ? 'storyOverlayVisible' : ''}`
            : `worldLabels ${visible ? 'storyOverlayVisible' : ''}`
      }
      role="group"
    >
      {allScenarioProfiles.map((profile, index) => (
        <span
          className={activeScenario === profile.id ? 'worldLabel worldLabelActive' : 'worldLabel'}
          key={profile.id}
          style={
            {
              '--label-accent': profile.accent,
              '--label-left': activeScenario
                ? activeScenario === profile.id
                  ? '31%'
                  : `${80 + (index % 2) * 6}%`
                : `${7 + index * 6}%`,
              '--label-mobile-left': activeScenario
                ? activeScenario === profile.id
                  ? '31%'
                  : `${80 + (index % 2) * 6}%`
                : worldLabelPositions[profile.id].left,
              '--label-top': activeScenario
                ? activeScenario === profile.id
                  ? '51%'
                  : `${17 + index * 6.7}%`
                : worldLabelPositions[profile.id].top,
              '--label-mobile-top': activeScenario
                ? activeScenario === profile.id
                  ? '51%'
                  : `${17 + index * 6.7}%`
                : worldLabelPositions[profile.id].top,
            } as React.CSSProperties
          }
        >
          <strong>{profile.id}</strong>
          <small>{profile.growth.growthState}</small>
        </span>
      ))}
      <span className="branchMeaning">SPATIAL SEPARATION ≠ PROBABILITY</span>
    </div>
  );
}

type SpectralFeature = {
  atmosphereKey: string;
  label: string;
  x: number;
  y: number;
};

const reflectedLightFeatures: SpectralFeature[] = [
  { atmosphereKey: 'nox', label: 'NO₂ band', x: 252, y: 208 },
  { atmosphereKey: 'co2', label: 'CO₂ bands', x: 720, y: 236 },
  { atmosphereKey: 'ch4', label: 'CH₄ band', x: 846, y: 274 },
];

const midInfraredFeatures: SpectralFeature[] = [
  { atmosphereKey: 'ch4', label: 'CH₄', x: 303, y: 235 },
  { atmosphereKey: 'cfc_11', label: 'CFC-11/12', x: 517, y: 272 },
  { atmosphereKey: 'co2', label: 'CO₂', x: 802, y: 224 },
];

function SpectralConsole({
  scenarioId,
  instrument,
  visible,
}: {
  scenarioId: ScenarioId;
  instrument: keyof typeof instrumentCopy;
  visible: boolean;
}) {
  const profile = getScenarioProfile(scenarioId);
  const observation = profile.observations.find(({ id }) => id === instrument)!;
  const hasSignatures = observation.result.signatures.length > 0;
  const isMidInfrared = instrument === 'large_interferometer_for_exoplanets';
  const features = isMidInfrared ? midInfraredFeatures : reflectedLightFeatures;
  const ticks = isMidInfrared
    ? [
        ['4', 112],
        ['8', 318],
        ['12', 524],
        ['16', 730],
        ['18.5', 860],
      ]
    : [
        ['0.2', 112],
        ['0.6', 299],
        ['1.0', 486],
        ['1.4', 673],
        ['1.8', 860],
      ];
  const trace = isMidInfrared
    ? 'M112 286 C154 276 184 251 218 263 C254 277 270 304 303 235 C326 191 344 285 379 277 C420 267 453 288 487 276 C502 270 508 236 517 272 C537 314 562 268 596 258 C635 247 667 272 705 261 C745 250 771 188 802 224 C831 258 842 239 860 244'
    : hasSignatures
      ? 'M112 238 C153 226 180 231 218 220 C246 212 251 267 276 247 C309 219 350 232 386 218 C426 202 448 227 482 217 C527 204 562 213 601 205 C645 196 676 227 720 236 C757 242 792 211 820 222 C839 230 843 278 860 264'
      : 'M112 235 C164 231 210 237 258 232 C307 228 352 235 402 231 C450 227 502 235 552 230 C605 226 654 234 704 231 C753 228 806 234 860 230';
  const readoutKeys = isMidInfrared ? ['co2', 'cfc_11', 'cfc_12', 'ch4'] : ['co2', 'nox', 'ch4'];
  const atmosphericReadouts = readoutKeys.map((key) => profile.atmosphere[key]).filter(Boolean);

  return (
    <section
      aria-label={`${observation.label} spectral readout for ${scenarioId}`}
      className={`spectralConsole ${visible ? 'storyOverlayVisible' : ''}`}
    >
      <div className="spectralChrome" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <header className="spectralHeader">
        <div>
          <span>Instrument readout</span>
          <strong>{observation.short}</strong>
        </div>
        <div>
          <span>Observing mode</span>
          <strong>{observation.mode}</strong>
        </div>
        <div>
          <span>Target</span>
          <strong>{scenarioId} · future Earth</strong>
        </div>
      </header>

      <div className="spectralPlot">
        <div className="spectralPlotTitle">
          <div>
            <span>{isMidInfrared ? 'Mid-infrared emission' : 'Reflected-light contrast'}</span>
            <strong>Explanatory spectral shape</strong>
          </div>
          <small>Not a recovered raw PSG/LIFEsim curve</small>
        </div>
        <ul className="spectralFeatureLegend" aria-label="Annotated atmospheric features">
          {features.map((feature) => {
            const datum = profile.atmosphere[feature.atmosphereKey];
            return datum && datum.value !== null ? (
              <li key={feature.label}>{feature.label}</li>
            ) : null;
          })}
        </ul>
        <svg
          aria-labelledby="spectral-plot-title spectral-plot-description"
          role="img"
          viewBox="0 0 960 390"
        >
          <title id="spectral-plot-title">{`${scenarioId} ${observation.short} explanatory spectrum`}</title>
          <desc id="spectral-plot-description">
            A qualitative wavelength diagram annotated with molecules listed in the Project Janus
            atmosphere table. It is not a retrieved or measured spectrum.
          </desc>
          <defs>
            <linearGradient id="spectral-trace-gradient" x1="0" x2="1">
              <stop offset="0" stopColor="#55d5ce" />
              <stop offset="0.52" stopColor={profile.accent} />
              <stop offset="1" stopColor="#fff0a3" />
            </linearGradient>
            <filter id="spectral-glow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>
          <g className="spectralGrid">
            {[112, 205, 299, 392, 486, 579, 673, 766, 860].map((x) => (
              <line key={`x-${x}`} x1={x} x2={x} y1="76" y2="304" />
            ))}
            {[92, 145, 198, 251, 304].map((y) => (
              <line key={`y-${y}`} x1="112" x2="860" y1={y} y2={y} />
            ))}
          </g>
          <line className="spectralAxis" x1="112" x2="860" y1="304" y2="304" />
          <line className="spectralAxis" x1="112" x2="112" y1="76" y2="304" />
          <path className="spectralTraceGlow" d={trace} />
          <path className="spectralTrace" d={trace} />
          {features.map((feature) => {
            const datum = profile.atmosphere[feature.atmosphereKey];
            if (!datum || datum.value === null) return null;
            return (
              <g className="spectralFeature" key={feature.atmosphereKey}>
                <line x1={feature.x} x2={feature.x} y1={feature.y - 48} y2={feature.y + 32} />
                <circle cx={feature.x} cy={feature.y} r="4" />
                <text x={feature.x + 9} y={feature.y - 55}>
                  {feature.label}
                </text>
              </g>
            );
          })}
          {ticks.map(([label, x]) => (
            <g className="spectralTick" key={label}>
              <line x1={x} x2={x} y1="304" y2="313" />
              <text textAnchor="middle" x={x} y="335">
                {label}
              </text>
            </g>
          ))}
          <text className="spectralAxisLabel" textAnchor="middle" x="486" y="370">
            WAVELENGTH · μm
          </text>
          <text
            className="spectralAxisLabel"
            textAnchor="middle"
            transform="rotate(-90 44 190)"
            x="44"
            y="190"
          >
            RELATIVE SIGNAL
          </text>
          <line className="spectralScanLine" x1="112" x2="112" y1="76" y2="304" />
        </svg>
      </div>

      <aside className="spectralEvidence">
        <div className="spectralVerdict">
          <span>Published matrix result</span>
          <strong>
            {hasSignatures ? observation.result.signatures.join(' · ') : 'No signature listed'}
          </strong>
          {!hasSignatures && <small>Not detected by this method ≠ no technology</small>}
        </div>
        <dl aria-label={`${scenarioId} atmospheric inputs from Table 1`}>
          {atmosphericReadouts.map((datum) => (
            <div key={datum.label}>
              <dt>{datum.label}</dt>
              <dd>
                {datum.value === null ? 'not listed' : datum.value} {datum.unit}
              </dd>
            </div>
          ))}
        </dl>
      </aside>
    </section>
  );
}

export function StoryExperience() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [branchProgress, setBranchProgress] = useState(0);
  const [observerProgress, setObserverProgress] = useState(0);
  const [readingMode, setReadingMode] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const navigationTargetRef = useRef<number | null>(null);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);
  const ratiosRef = useRef<number[]>(storySteps.map(() => 0));
  const currentStep = storySteps[activeIndex] ?? storySteps[0];
  const reducedMotion = readingMode || prefersReducedMotion;
  const observerStepIndex = storySteps.findIndex(({ id }) => id === 'observer-turn');
  const stageVisual =
    activeIndex === 0 && branchProgress > 0.001 ? storySteps[1].visual : currentStep.visual;
  const opticalProgress =
    currentStep.visual.kind === 'observer' && !reducedMotion
      ? Math.min(1, Math.max(0, (observerProgress - 0.8) / 0.2))
      : 0;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (readingMode) return;
    const elements = stepRefs.current.filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.stepIndex);
          if (Number.isInteger(index)) ratiosRef.current[index] = entry.intersectionRatio;
        });
        const navigationTarget = navigationTargetRef.current;
        if (navigationTarget !== null) {
          if (ratiosRef.current[navigationTarget] >= 0.45) {
            navigationTargetRef.current = null;
            setActiveIndex(navigationTarget);
          }
          return;
        }
        const nextIndex = ratiosRef.current.reduce(
          (best, ratio, index, ratios) => (ratio > ratios[best] ? index : best),
          0,
        );
        if (ratiosRef.current[nextIndex] > 0) setActiveIndex(nextIndex);
      },
      { threshold: Array.from({ length: 101 }, (_, index) => index / 100) },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [readingMode]);

  useEffect(() => {
    if (readingMode || prefersReducedMotion) {
      const frame = window.requestAnimationFrame(() => {
        setBranchProgress(readingMode ? 0 : activeIndex > 0 ? 1 : 0);
        setObserverProgress(activeIndex > observerStepIndex ? 1 : 0);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    let animationFrame = 0;
    const updateScrollProgress = () => {
      animationFrame = 0;
      const branchStep = stepRefs.current[1];
      if (branchStep) {
        const rect = branchStep.getBoundingClientRect();
        const revealStart = window.innerHeight * 0.66;
        const revealEnd = window.innerHeight * -0.08;
        const progress = Math.min(
          1,
          Math.max(0, (revealStart - rect.top) / (revealStart - revealEnd)),
        );
        setBranchProgress((previous) =>
          Math.abs(previous - progress) > 0.001 ? progress : previous,
        );
      }

      const observerStep = stepRefs.current[observerStepIndex];
      if (observerStep) {
        const rect = observerStep.getBoundingClientRect();
        // This intentionally uses the tall observer article as a scroll runway.
        // The viewport remains on the sticky stage while its full hidden distance
        // scrubs the character performance and subsequent camera move.
        const runwayStart = window.innerHeight * 0.1;
        const runwayDistance = Math.max(
          window.innerHeight,
          rect.height - window.innerHeight * 0.96,
        );
        const progress = Math.min(1, Math.max(0, (runwayStart - rect.top) / runwayDistance));
        setObserverProgress((previous) =>
          Math.abs(previous - progress) > 0.001 ? progress : previous,
        );
      }
    };
    const requestUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateScrollProgress);
    };

    updateScrollProgress();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [activeIndex, observerStepIndex, prefersReducedMotion, readingMode]);

  const activeObservation = useMemo(() => {
    return {
      instrument: currentStep.visual.instrument ?? 'habitable_worlds_observatory',
      scenarioId: currentStep.visual.scenarioId ?? 'S1',
      visible: currentStep.visual.kind === 'spectrum',
    };
  }, [currentStep]);

  function moveTo(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), storySteps.length - 1);
    navigationTargetRef.current = readingMode ? null : nextIndex;
    setActiveIndex(nextIndex);
    stepRefs.current[nextIndex]?.focus({ preventScroll: true });
    stepRefs.current[nextIndex]?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'center',
    });
  }

  return (
    <section
      className={readingMode ? 'story story-reading' : 'story story-guided'}
      id="story"
      aria-labelledby="story-title"
    >
      <header className="storyIntro">
        <p className="eyebrow">Guided story · all ten scenarios</p>
        <h2 id="story-title">Watch one Earth become ten possible worlds.</h2>
        <p>
          Scroll to split the planet, travel across the Janus futures, then move toward an alien
          astronomer and cut into the instrument readout.
        </p>
        <div className="storyConsent" role="group" aria-label="Story options">
          <a className="primaryButton" href="#story-scrolly">
            Begin first light
          </a>
          <button
            className="secondaryButton"
            onClick={() => setReadingMode((value) => !value)}
            type="button"
          >
            {readingMode ? 'Return to visual story' : 'Read as article'}
          </button>
          <Link className="secondaryButton" href="/atlas">
            Skip to Atlas
          </Link>
        </div>
      </header>

      <div
        className="storyScrolly"
        id="story-scrolly"
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            event.preventDefault();
            moveTo(activeIndex + 1);
          }
          if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            event.preventDefault();
            moveTo(activeIndex - 1);
          }
        }}
      >
        {!readingMode && (
          <div className="storySticky">
            <div className="storyStage" data-active-step={currentStep.id}>
              <EarthStage
                branchProgress={branchProgress}
                observerProgress={observerProgress}
                reducedMotion={reducedMotion}
                state={stageVisual}
              />

              <div
                aria-hidden="true"
                className="opticalBridge"
                data-active={opticalProgress > 0.001 ? 'true' : 'false'}
                style={
                  {
                    '--optical-progress': Math.min(1, opticalProgress * 1.35),
                    '--optical-aperture': `${(1 - opticalProgress) * 48}%`,
                    '--optical-blackout': Math.min(1, Math.max(0, (opticalProgress - 0.78) / 0.22)),
                  } as CSSProperties
                }
              >
                <span />
              </div>

              <div className="stageMeta">
                <span>Chapter {currentStep.chapter}</span>
                <span>
                  {String(activeIndex + 1).padStart(2, '0')} / {storySteps.length}
                </span>
                <span>{prefersReducedMotion ? 'Motion reduced' : currentStep.visual.kind}</span>
              </div>

              <WorldLabels
                activeScenario={currentStep.visual.scenarioId}
                budding={currentStep.visual.branchState === 'budding'}
                visible={
                  currentStep.visual.kind === 'scenario' ||
                  (currentStep.visual.kind === 'branches' && branchProgress > 0.78)
                }
              />

              <div
                className={`storyMetricsLayer ${currentStep.visual.showMetrics ? 'storyOverlayVisible' : ''}`}
              >
                <MetricReadout scenarioId={currentStep.scenarioId ?? 'S1'} />
              </div>

              <SpectralConsole
                instrument={activeObservation.instrument}
                scenarioId={activeObservation.scenarioId}
                visible={activeObservation.visible}
              />

              <div className="storyProgress" aria-hidden="true">
                {storySteps.map((step, index) => (
                  <i className={index === activeIndex ? 'active' : ''} key={step.id} />
                ))}
              </div>

              <div className="stageSource">
                <span>Project Janus scenarios are possibilities, not forecasts.</span>
                <span>3D staging is interpretive · values and observation cells are sourced</span>
              </div>

              <p className="srOnly">
                Current visual state: {currentStep.title}. {currentStep.body}
              </p>
            </div>
          </div>
        )}

        <div className="storySteps" aria-label="Story chapters">
          {storySteps.map((step, index) => (
            <article
              aria-current={index === activeIndex ? 'step' : undefined}
              className={`storyStep storyStep-${step.cardSide ?? 'left'}`}
              data-scroll-anchor={step.id === 'observer-turn' ? 'observer' : undefined}
              data-step-index={index}
              id={`story-step-${index + 1}`}
              key={step.id}
              ref={(element) => {
                stepRefs.current[index] = element;
              }}
              tabIndex={0}
            >
              <div className="storyStepCard">
                <p className="storyStepKicker">
                  {step.chapter} · {step.kicker}
                </p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                {step.sourceHref && (
                  <a
                    className="storyCitation"
                    href={step.sourceHref}
                    rel={step.sourceHref.startsWith('http') ? 'noreferrer' : undefined}
                    target={step.sourceHref.startsWith('http') ? '_blank' : undefined}
                  >
                    {step.sourceLabel} {step.sourceHref.startsWith('http') ? '↗' : '→'}
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

        {!readingMode && (
          <button className="storyRestart" onClick={() => moveTo(0)} type="button">
            Restart story
          </button>
        )}
      </div>
    </section>
  );
}
