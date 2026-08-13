'use client';

import type { ScenarioId } from '@janus/domain';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
}: {
  activeScenario?: ScenarioId;
  budding: boolean;
}) {
  return (
    <div
      aria-label="All ten Janus scenario worlds. Their spatial separation does not encode probability."
      className={
        activeScenario
          ? 'worldLabels worldLabelsFocused'
          : budding
            ? 'worldLabels worldLabelsBudding'
            : 'worldLabels'
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

function OcularOverlay({
  scenarioId,
  instrument,
}: {
  scenarioId: ScenarioId;
  instrument: keyof typeof instrumentCopy;
}) {
  const profile = getScenarioProfile(scenarioId);
  const observation = profile.observations.find(({ id }) => id === instrument)!;
  const hasSignatures = observation.result.signatures.length > 0;

  return (
    <div className="ocularOverlay">
      <div className="ocularReticle" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="ocularHeader">
        <span>{observation.short}</span>
        <span>{observation.mode}</span>
        <span>Target · {scenarioId}</span>
      </div>
      <div
        className="ocularEvidence"
        aria-label={`Published ${observation.label} result for ${scenarioId}`}
      >
        <span>Listed evidence</span>
        <strong>
          {hasSignatures ? observation.result.signatures.join(' · ') : 'No signature listed'}
        </strong>
        {!hasSignatures && <small>Not detected by this method ≠ no technology</small>}
      </div>
    </div>
  );
}

export function StoryExperience() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [readingMode, setReadingMode] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);
  const ratiosRef = useRef<number[]>(storySteps.map(() => 0));
  const currentStep = storySteps[activeIndex] ?? storySteps[0];
  const reducedMotion = readingMode || prefersReducedMotion;

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

  const activeObservation = useMemo(() => {
    if (
      currentStep.visual.kind !== 'ocular' ||
      !currentStep.visual.scenarioId ||
      !currentStep.visual.instrument
    ) {
      return undefined;
    }
    return {
      scenarioId: currentStep.visual.scenarioId,
      instrument: currentStep.visual.instrument,
    };
  }, [currentStep]);

  function moveTo(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), storySteps.length - 1);
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
          Scroll to split the planet, travel across the Janus futures, then move behind an alien
          astronomer and into the telescope itself.
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
              <EarthStage reducedMotion={reducedMotion} state={currentStep.visual} />

              <div className="stageMeta">
                <span>Chapter {currentStep.chapter}</span>
                <span>
                  {String(activeIndex + 1).padStart(2, '0')} / {storySteps.length}
                </span>
                <span>{prefersReducedMotion ? 'Motion reduced' : currentStep.visual.kind}</span>
              </div>

              {(currentStep.visual.kind === 'branches' ||
                currentStep.visual.kind === 'scenario') && (
                <WorldLabels
                  activeScenario={currentStep.visual.scenarioId}
                  budding={currentStep.visual.branchState === 'budding'}
                />
              )}

              {currentStep.visual.showMetrics && currentStep.scenarioId && (
                <MetricReadout scenarioId={currentStep.scenarioId} />
              )}

              {activeObservation && (
                <OcularOverlay
                  instrument={activeObservation.instrument}
                  scenarioId={activeObservation.scenarioId}
                />
              )}

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
