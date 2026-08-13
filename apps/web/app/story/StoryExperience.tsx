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

function OcularOverlay({
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

  return (
    <div className={`ocularOverlay ${visible ? 'storyOverlayVisible' : ''}`}>
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
      ? Math.min(1, Math.max(0, (observerProgress - 0.86) / 0.14))
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
      visible: currentStep.visual.kind === 'ocular',
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

              <OcularOverlay
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
