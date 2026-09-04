'use client';

import type { ObservingMissionId, ScenarioId } from '@janus/domain';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';

import { useReducedMotionPreference } from '../components/MotionPreference';
import {
  allScenarioProfiles,
  getScenarioProfile,
  scientificNotation,
} from '../../lib/canonical-core';
import { buildObserverStory, type StoryVisualState } from './story-content';
import { initialStoryState, storyReducer, type StoryMode } from './story-state';

const EarthStage = dynamic(() => import('./EarthStage').then((module) => module.EarthStage), {
  ssr: false,
  loading: () => <div className="earthStageLoader">Preparing the spatial stage…</div>,
});

const storySessionKey = 'janus-guided-story-v3';
const legacyStorySessionKey = 'janus-guided-story-v2';

type GsapRuntime = (typeof import('gsap'))['gsap'];

type StoryStateDirection = 'backward' | 'forward' | 'jump';
type TransitionKind = 'initial' | 'jump' | 'step';

let gsapRuntimePromise: Promise<GsapRuntime> | null = null;

function loadGsapRuntime() {
  gsapRuntimePromise ??= import('gsap').then((module) => module.gsap);
  return gsapRuntimePromise;
}

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothUnit(value: number) {
  const bounded = clampUnit(value);
  return bounded * bounded * (3 - 2 * bounded);
}

function stepScrollProgress(rect: DOMRect, viewportHeight: number) {
  const entryLine = viewportHeight * 0.82;
  const exitLine = viewportHeight * 0.18;
  const travel = Math.max(1, rect.height + entryLine - exitLine);
  return clampUnit((entryLine - rect.top) / travel);
}

function stepAtReadingLine(elements: HTMLElement[], ratios: number[], fallbackIndex: number) {
  const readingLine = window.innerHeight * 0.52;
  let bestIndex = fallbackIndex;
  let bestDistance = Number.POSITIVE_INFINITY;

  elements.forEach((element) => {
    const index = Number(element.dataset.stepIndex);
    if (!Number.isInteger(index) || ratios[index] <= 0) return;
    const rect = element.getBoundingClientRect();
    if (rect.top <= readingLine && rect.bottom >= readingLine) {
      const distance = Math.abs((rect.top + rect.bottom) / 2 - readingLine);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
      return;
    }
    const distance = Math.min(
      Math.abs(rect.top - readingLine),
      Math.abs(rect.bottom - readingLine),
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function stepHasReadingLine(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const readingLine = window.innerHeight * 0.52;
  return rect.top <= readingLine && rect.bottom >= readingLine;
}

function LocalStoryImage({
  alt = '',
  height,
  priority = false,
  sizes,
  src,
  width,
}: {
  alt?: string;
  height: number;
  priority?: boolean;
  sizes: string;
  src: string;
  width: number;
}) {
  return (
    // These admitted assets are already optimized WebP derivatives. Keeping the native element
    // inside this client boundary avoids shipping the Next Image runtime before story intent.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      sizes={sizes}
      src={src}
      style={{ height: '100%', inset: 0, position: 'absolute', width: '100%' }}
      width={width}
    />
  );
}

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

const scenarioPortraits: Record<ScenarioId, { src: string; description: string }> = {
  S1: {
    src: '/assets/scenarios/s1-world-v1.webp',
    description: 'an amber, densely illuminated industrial future Earth',
  },
  S2: {
    src: '/assets/scenarios/s2-world-v1.webp',
    description: 'a warm, crowded world of decentralized settlement clusters',
  },
  S3: {
    src: '/assets/scenarios/s3-world-v1.webp',
    description: 'a clear, temperate world with balanced clean infrastructure',
  },
  S4: {
    src: '/assets/scenarios/s4-world-v1.webp',
    description: 'a deeply rewilded world with sparse bioregional settlement',
  },
  S5: {
    src: '/assets/scenarios/s5-world-v1.webp',
    description: 'a pristine world ringed by precise posthuman orbital structures',
  },
  S6: {
    src: '/assets/scenarios/s6-world-v1.webp',
    description: 'a hot industrial world under heavy atmospheric engineering',
  },
  S7: {
    src: '/assets/scenarios/s7-world-v1.webp',
    description: 'a restored temperate world of forests, wetlands, and quiet settlements',
  },
  S8: {
    src: '/assets/scenarios/s8-world-v1.webp',
    description: 'a patchwork world marked by alternating damage and recovery',
  },
  S9: {
    src: '/assets/scenarios/s9-world-v1.webp',
    description: 'a dark pristine Earth with machine civilization concentrated off-world',
  },
  S10: {
    src: '/assets/scenarios/s10-world-v1.webp',
    description: 'a quiet home world left behind by departing off-world civilizations',
  },
};

const atmosphereKeys = [
  'mean_temperature',
  'co2',
  'ch4',
  'nox',
  'n2o',
  'nh3',
  'cfc_11',
  'cfc_12',
  'nf3',
  'sf6',
  'cf4',
  'so2_stratospheric',
  'na_emission',
  'laser_emission_1_064_um',
] as const;

const familyDefinitions = [
  { id: 'stable', label: 'Stability', growthState: 'stable' },
  { id: 'cycles', label: 'Collapse / recovery', growthState: 'oscillatory' },
  { id: 'growth', label: 'Continued growth', growthState: 'growing' },
] as const;

const chapterLabels: Record<string, string> = {
  '00': 'Consent',
  '01': 'Branch',
  '02': 'Worlds',
  '03': 'Observer',
  '04': 'Evidence',
  '05': 'Methods',
  '06': 'Cycles',
  '07': 'Explore',
  EP: 'Epilogue',
};

type StoredStoryState = {
  activeIndex: number;
  mode: StoryMode;
  selectedObserver: ObservingMissionId;
  version: 3;
};

type StoredStoryStateCandidate = Omit<StoredStoryState, 'selectedObserver' | 'version'> & {
  selectedObserver?: ObservingMissionId;
  version?: number;
};

function parseStoredStoryState(value: unknown, legacy: boolean): StoredStoryState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<StoredStoryStateCandidate>;
  const selectedObserverIsValid = getScenarioProfile('S1').observations.some(
    ({ id }) => id === candidate.selectedObserver,
  );
  const valid =
    typeof candidate.activeIndex === 'number' &&
    Number.isInteger(candidate.activeIndex) &&
    (candidate.mode === 'guided' || candidate.mode === 'reduced' || candidate.mode === 'reading') &&
    (legacy
      ? candidate.version === undefined || candidate.version === 2
      : candidate.version === 3) &&
    (legacy
      ? candidate.selectedObserver === undefined || selectedObserverIsValid
      : selectedObserverIsValid);
  if (!valid) return null;
  return {
    activeIndex: candidate.activeIndex!,
    mode: candidate.mode!,
    selectedObserver: candidate.selectedObserver ?? initialStoryState.selectedObserver,
    version: 3,
  };
}

function readStoredStoryState() {
  for (const [key, legacy] of [
    [storySessionKey, false],
    [legacyStorySessionKey, true],
  ] as const) {
    const stored = window.sessionStorage.getItem(key);
    if (!stored) continue;
    try {
      const parsed = parseStoredStoryState(JSON.parse(stored) as unknown, legacy);
      if (!parsed) {
        window.sessionStorage.removeItem(key);
        continue;
      }
      window.sessionStorage.setItem(storySessionKey, JSON.stringify(parsed));
      if (legacy) window.sessionStorage.removeItem(legacyStorySessionKey);
      return parsed.activeIndex > 0 ? parsed : null;
    } catch {
      window.sessionStorage.removeItem(key);
    }
  }
  return null;
}

function MetricReadout({ scenarioId }: { scenarioId: ScenarioId }) {
  const profile = getScenarioProfile(scenarioId);
  const metrics = [
    ['Population', scientificNotation(profile.growth.population)],
    ['Annual energy', `${scientificNotation(profile.growth.annualEnergyUseJ)} J`],
    ['Governance', profile.morphology.globalFactor],
    ['Technology', `Cluster ${profile.morphology.technologyCluster}`],
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
  activeScenario: ScenarioId | null;
  budding: boolean;
  visible: boolean;
}) {
  if (budding) {
    return (
      <div
        aria-label="Three conceptual scenario families. The families organize reading and do not encode probability."
        className={`familyLabels ${visible ? 'storyOverlayVisible' : ''}`}
        role="group"
      >
        {familyDefinitions.map((family, index) => {
          const members = allScenarioProfiles.filter(
            ({ growth }) => growth.growthState === family.growthState,
          );
          return (
            <div className={`familyLabel familyLabel-${family.id}`} key={family.id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{family.label}</strong>
              <small>{members.map(({ id }) => id).join(' · ')}</small>
            </div>
          );
        })}
        <span className="branchMeaning">FAMILY AND DISTANCE ≠ PROBABILITY</span>
      </div>
    );
  }

  return (
    <div
      aria-label="All ten Janus scenario worlds. Their spatial separation does not encode probability."
      className={
        activeScenario
          ? `worldLabels worldLabelsFocused ${visible ? 'storyOverlayVisible' : ''}`
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
            } as CSSProperties
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

function OcularObservation({
  gsapRuntime,
  instrument,
  reducedMotion,
  scenarioId,
  visible,
}: {
  gsapRuntime: GsapRuntime | null;
  instrument: ObservingMissionId;
  reducedMotion: boolean;
  scenarioId: ScenarioId;
  visible: boolean;
}) {
  const deckRef = useRef<HTMLElement>(null);
  const profile = getScenarioProfile(scenarioId);
  const featured = profile.observations.find(({ id }) => id === instrument);
  if (!featured) throw new Error(`Ocular state is missing ${scenarioId}/${instrument}.`);
  const hasSignal = featured.result.signatures.length > 0;

  useEffect(() => {
    if (!deckRef.current) return;
    const frames = Array.from(deckRef.current.querySelectorAll<HTMLElement>('.ocularWorldFrame'));
    const activePosition = allScenarioProfiles.findIndex(({ id }) => id === scenarioId);
    const editorialLayers = Array.from(
      deckRef.current.querySelectorAll<HTMLElement>(
        '.ocularEvidence > div, .ocularVerdict, .ocularHeader',
      ),
    );

    if (!gsapRuntime) {
      frames.forEach((frame, index) => {
        const active = frame.dataset.scenarioId === scenarioId && visible;
        frame.style.opacity = active ? '1' : '0';
        frame.style.transform = `translateX(${active ? 0 : index < activePosition ? -3 : 3}%) scale(${active ? 1 : 1.08})`;
        frame.style.visibility = active ? 'visible' : 'hidden';
        frame.style.zIndex = active ? '2' : '1';
      });
      editorialLayers.forEach((layer) => {
        layer.style.opacity = visible ? '1' : '0';
        layer.style.transform = 'translateY(0)';
        layer.style.visibility = visible ? 'visible' : 'hidden';
      });
      return;
    }

    const gsap = gsapRuntime;
    gsap.killTweensOf(frames);
    frames.forEach((frame, index) => {
      const active = frame.dataset.scenarioId === scenarioId && visible;
      const target = {
        autoAlpha: active ? 1 : 0,
        scale: active ? 1 : 1.08,
        xPercent: active ? 0 : index < activePosition ? -3 : 3,
        zIndex: active ? 2 : 1,
      };
      if (reducedMotion) gsap.set(frame, target);
      else gsap.to(frame, { ...target, duration: active ? 1.05 : 0.55, ease: 'power3.out' });
    });

    if (reducedMotion || !visible) {
      gsap.set(editorialLayers, { autoAlpha: visible ? 1 : 0, y: 0 });
      return;
    }
    const tween = gsap.fromTo(
      editorialLayers,
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06 },
    );
    return () => {
      tween.kill();
    };
  }, [gsapRuntime, reducedMotion, scenarioId, visible]);

  const evidence = [
    ['Population', scientificNotation(profile.growth.population), 'reported'],
    ['Annual energy', `${scientificNotation(profile.growth.annualEnergyUseJ)} J`, 'reported'],
    ['Technology', `Cluster ${profile.morphology.technologyCluster}`, 'transcribed'],
    ['Governance', profile.morphology.globalFactor, 'transcribed'],
  ] as const;

  return (
    <section
      aria-label={`Ocular observation of ${scenarioId}`}
      className={`ocularObservation ${visible ? 'storyOverlayVisible' : ''}`}
      ref={deckRef}
      style={{ '--observation-accent': profile.accent } as CSSProperties}
    >
      <div className="ocularWorldFrames" aria-hidden="true">
        {allScenarioProfiles.map((candidate) => (
          <div className="ocularWorldFrame" data-scenario-id={candidate.id} key={candidate.id}>
            <LocalStoryImage
              alt=""
              height={941}
              priority={candidate.id === 'S1'}
              sizes="(max-width: 760px) 100vw, 68vw"
              src={scenarioPortraits[candidate.id].src}
              width={1672}
            />
          </div>
        ))}
      </div>

      <div className="ocularHardware" aria-hidden="true">
        <i />
        <i />
        <i />
        <span />
      </div>

      <header className="ocularHeader">
        <div>
          <span>Alien ocular · target {scenarioId}</span>
          <strong>{profile.morphology.mythMetaphor}</strong>
        </div>
        <p>
          Portrait: interpretive / model-generated
          <br />
          Values: reported or transcribed
        </p>
      </header>

      <dl className="ocularEvidence" aria-label={`Canonical evidence dimensions for ${scenarioId}`}>
        {evidence.map(([label, value, evidenceKind], index) => (
          <div className={`ocularDatum ocularDatum-${index + 1}`} key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
            <small>{evidenceKind}</small>
          </div>
        ))}
      </dl>

      <div className="ocularVerdict" data-status={hasSignal ? 'listed' : 'blank'}>
        <span>{featured.short} · Figure 6</span>
        <strong>
          {hasSignal
            ? featured.result.signatures.join(' · ')
            : 'No signature listed for this method'}
        </strong>
        <small>
          {hasSignal
            ? 'Detectable in the published scenario under source assumptions.'
            : 'Method-specific blank; this is not evidence of no technology.'}
        </small>
      </div>

      <div className="ocularMethodRail" aria-label="Five published observing concepts">
        {profile.observations.map((observation) => (
          <span
            aria-current={observation.id === instrument ? 'true' : undefined}
            key={observation.id}
          >
            {observation.short}
          </span>
        ))}
      </div>

      <div className="srOnly">
        <p>
          Interpretive portrait of {scenarioId}: {scenarioPortraits[scenarioId].description}. The
          image is not an observation. The following values are reported scenario atmosphere and
          emission inputs transcribed from Table 1, not digitized spectral samples.
        </p>
        <ul>
          {atmosphereKeys.map((key) => {
            const datum = profile.atmosphere[key];
            return (
              <li key={key}>
                {datum.label}:{' '}
                {datum.value === null
                  ? 'not listed'
                  : `${datum.value.toLocaleString('en-US')} ${datum.unit}`}
              </li>
            );
          })}
        </ul>
        <p>Published method cells:</p>
        <ul>
          {profile.observations.map((observation) => (
            <li key={observation.id}>
              {observation.label}:{' '}
              {observation.result.signatures.length > 0
                ? observation.result.signatures.join(', ')
                : 'no signature listed; not evidence of no technology'}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ObservationBridge({
  gsapRuntime,
  progress,
  reducedMotion,
}: {
  gsapRuntime: GsapRuntime | null;
  progress: number;
  reducedMotion: boolean;
}) {
  const bridgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bridgeRef.current) return;
    if (!gsapRuntime) {
      bridgeRef.current.style.setProperty('--bridge-progress', String(progress));
      return;
    }
    const gsap = gsapRuntime;
    if (reducedMotion) {
      gsap.set(bridgeRef.current, { '--bridge-progress': progress });
      return;
    }
    const tween = gsap.to(bridgeRef.current, {
      '--bridge-progress': progress,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: true,
    });
    return () => {
      tween.kill();
    };
  }, [gsapRuntime, progress, reducedMotion]);

  return (
    <div
      aria-hidden="true"
      className="observationBridge"
      data-active={progress > 0.001 ? 'true' : 'false'}
      ref={bridgeRef}
    >
      <div className="observationBridgeEarth">
        <LocalStoryImage
          alt=""
          height={941}
          priority
          sizes="(max-width: 760px) 76vw, 32vw"
          src="/assets/scenarios/s1-world-v1.webp"
          width={1672}
        />
      </div>
      <div className="observationBridgeReticle">
        <i />
        <i />
      </div>
      <div className="observationBridgeStatus">
        <span>Target lock · future Earth</span>
        <span>Entering the ocular field</span>
      </div>
    </div>
  );
}

function ObserverInstrumentSelector({
  instrument,
  onChange,
  visible,
}: {
  instrument: ObservingMissionId;
  onChange: (instrument: ObservingMissionId) => void;
  visible: boolean;
}) {
  const methods = getScenarioProfile('S1').observations;
  const [announcement, setAnnouncement] = useState('HWO selected.');

  function moveSelection(event: KeyboardEvent<HTMLDivElement>, delta: -1 | 1) {
    event.preventDefault();
    event.stopPropagation();
    const currentIndex = methods.findIndex(({ id }) => id === instrument);
    const nextIndex = (currentIndex + delta + methods.length) % methods.length;
    const next = methods[nextIndex];
    onChange(next.id);
    setAnnouncement(`${next.label} selected.`);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-instrument="${next.id}"]`)?.focus();
  }

  return (
    <section
      aria-label="Choose an observing method"
      className={`observerMethodChoice ${visible ? 'storyOverlayVisible' : ''}`}
    >
      <header>
        <span>Observer mode</span>
        <strong>Choose how to look</strong>
      </header>
      <div
        aria-label="Observing method"
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowRight') moveSelection(event, 1);
          if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') moveSelection(event, -1);
          if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            const selected = methods.find(({ id }) => id === instrument)!;
            setAnnouncement(`${selected.label} confirmed for first light.`);
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onChange('habitable_worlds_observatory');
            setAnnouncement('Returned to the default Habitable Worlds Observatory path.');
          }
        }}
        role="radiogroup"
      >
        {methods.map((method) => (
          <button
            aria-checked={method.id === instrument}
            data-instrument={method.id}
            key={method.id}
            onClick={() => {
              onChange(method.id);
              setAnnouncement(`${method.label} selected.`);
            }}
            role="radio"
            tabIndex={method.id === instrument ? 0 : -1}
            type="button"
          >
            <span>{method.short}</span>
            <strong>{method.mode}</strong>
          </button>
        ))}
      </div>
      <p aria-live="polite" className="srOnly">
        {announcement}
      </p>
      <small>Arrow keys change · Enter confirms · Escape returns to HWO</small>
    </section>
  );
}

function MissionMatrixPanel({ visible }: { visible: boolean }) {
  return (
    <section
      aria-label="Structured observability matrix for all ten scenarios"
      className={`missionMatrixPanel ${visible ? 'storyOverlayVisible' : ''}`}
    >
      <header>
        <div>
          <span>All ten worlds · five lines of sight</span>
          <strong>The observing ladder</strong>
        </div>
        <small>Luminous mark = one or more signatures listed in Figure 6</small>
      </header>
      <div className="storyMatrixScroller">
        <table>
          <caption className="srOnly">Figure 6 observability matrix transcription</caption>
          <thead>
            <tr>
              <th scope="col">World</th>
              {allScenarioProfiles[0].observations.map((observation) => (
                <th scope="col" key={observation.id}>
                  <span>{observation.short}</span>
                  <small>{observation.mode}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allScenarioProfiles.map((profile) => (
              <tr key={profile.id} style={{ '--matrix-accent': profile.accent } as CSSProperties}>
                <th scope="row">
                  <span>{profile.id}</span>
                  <small>{profile.morphology.mythMetaphor}</small>
                </th>
                {profile.observations.map((observation) => {
                  const signatures = observation.result.signatures;
                  return (
                    <td
                      data-status={signatures.length > 0 ? 'listed' : 'blank'}
                      key={observation.id}
                    >
                      <span aria-hidden="true" className="matrixSignal">
                        {signatures.length > 0 ? '•' : ''}
                      </span>
                      <span className="srOnly">
                        {signatures.length > 0
                          ? signatures.join(', ')
                          : 'No signature listed for this method; not evidence of no technology'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Reported / transcribed · observing paper, Figure 6 · blank is method-specific, never “no
        technology”
      </p>
    </section>
  );
}

function HandoffPanel({
  instrument,
  visible,
}: {
  instrument: ObservingMissionId;
  visible: boolean;
}) {
  const observatoryHref = `/observatory?scenario=S9&instrument=${instrument}`;
  return (
    <section
      aria-label="Continue to the Observatory or Atlas"
      className={`handoffPanel ${visible ? 'storyOverlayVisible' : ''}`}
    >
      <header>
        <span>Authored path complete</span>
        <strong>Keep looking.</strong>
        <p>Your selected method and the quiet-atmosphere contrast can travel with you.</p>
      </header>
      <div>
        <Link href={observatoryHref}>
          <span>01 · Instrument view</span>
          <strong>Open Observatory</strong>
          <small>
            S9 · {getScenarioProfile('S9').observations.find(({ id }) => id === instrument)?.short}
          </small>
        </Link>
        <Link href="/atlas?compare=S5,S9,S4">
          <span>02 · Field comparison</span>
          <strong>Open Atlas</strong>
          <small>S5 · S9 · S4, with no ranking</small>
        </Link>
      </div>
    </section>
  );
}

function EpiloguePanel({ visible }: { visible: boolean }) {
  return (
    <section
      aria-label="Absence of evidence epilogue"
      className={`epiloguePanel ${visible ? 'storyOverlayVisible' : ''}`}
    >
      <p>One known technological world</p>
      <strong>Evidence is always shaped by where—and how—we look.</strong>
      <div>
        <Link href="/methods">Methods</Link>
        <Link href="/sources">Sources</Link>
        <Link href="/research">Research companion</Link>
        <Link href="/accessibility">Accessibility</Link>
      </div>
      <small>
        Project Janus authors · NASA / USGS / ESA source assets · independent Observatory work · no
        agency endorsement implied
      </small>
    </section>
  );
}

function DeferredEarthStage({
  reducedMotion,
  state,
}: {
  reducedMotion: boolean;
  state: StoryVisualState;
}) {
  return (
    <div
      className="earthStage earthStageDeferred"
      data-branch-state={state.branchState ?? undefined}
      data-observer-motion={reducedMotion ? 'reduced' : 'deferred'}
      data-scene-kind={state.kind}
      data-world-lifecycle="deferred-until-story-intent"
    >
      <LocalStoryImage
        alt=""
        height={720}
        priority
        sizes="(max-width: 760px) 100vw, 68vw"
        src="/assets/planets/earth-day-1440.webp"
        width={1440}
      />
      <span />
    </div>
  );
}

export function StoryExperience() {
  const [storyState, dispatch] = useReducer(storyReducer, initialStoryState);
  const [branchProgress, setBranchProgress] = useState(0);
  const [observerProgress, setObserverProgress] = useState(0);
  const [stageRequested, setStageRequested] = useState(false);
  const [stageReadiness, setStageReadiness] = useState<'core' | 'fallback' | 'poster' | 'spatial'>(
    'core',
  );
  const [stageRecoveryActive, setStageRecoveryActive] = useState(false);
  const [gsapRuntime, setGsapRuntime] = useState<GsapRuntime | null>(null);
  const [resumeState, setResumeState] = useState<StoredStoryState | null>();
  const preferenceReducedMotion = useReducedMotionPreference();
  const storyRootRef = useRef<HTMLElement>(null);
  const storyStageRef = useRef<HTMLDivElement>(null);
  const selectedInstrument = storyState.selectedObserver;
  const storySteps = useMemo(() => buildObserverStory(selectedInstrument), [selectedInstrument]);
  const storyChapters = useMemo(
    () =>
      Array.from(
        storySteps.reduce((chapters, step, index) => {
          if (!chapters.has(step.chapter)) chapters.set(step.chapter, index);
          return chapters;
        }, new Map<string, number>()),
      ).map(([chapter, firstIndex]) => ({ chapter, firstIndex })),
    [storySteps],
  );
  const navigationTargetRef = useRef<number | null>(null);
  const navigationUnlockTimerRef = useRef<number | null>(null);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);
  const ratiosRef = useRef<number[]>(storySteps.map(() => 0));
  const activeIndexRef = useRef(storyState.activeIndex);
  const previousActiveIndexRef = useRef(storyState.activeIndex);
  const previousVisualKindRef = useRef<StoryVisualState['kind'] | null>(null);
  const transitionRef = useRef<{
    direction: StoryStateDirection;
    kind: TransitionKind;
  }>({ direction: 'jump', kind: 'initial' });
  const previousScrollYRef = useRef(0);
  const readingMode = storyState.mode === 'reading';
  const reducedMotion = readingMode || preferenceReducedMotion;
  const activeIndex = storyState.activeIndex;
  const currentStep = storySteps[activeIndex] ?? storySteps[0];
  const observerStepIndex = storySteps.findIndex(({ id }) => id === 'observer-turn');

  const stageVisual = useMemo(() => {
    const source =
      activeIndex === 0 && branchProgress > 0.001 ? storySteps[1].visual : currentStep.visual;
    if (source.kind === 'observer' || source.kind === 'handoff') {
      return { ...source, instrument: selectedInstrument };
    }
    return source;
  }, [activeIndex, branchProgress, currentStep, selectedInstrument, storySteps]);

  const bridgeProgress =
    currentStep.visual.kind === 'observer' && !reducedMotion
      ? Math.min(1, Math.max(0, (observerProgress - 0.7) / 0.3))
      : 0;

  useEffect(() => {
    const root = storyRootRef.current;
    if (!root) return;
    root.dataset.motionPhase = 'settled';
    root.dataset.scrollDirection = 'idle';
    root.dataset.transitionDirection = 'jump';
    root.dataset.transitionKind = 'initial';
    root.style.setProperty('--story-step-center', '0');
  }, []);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    const previousIndex = previousActiveIndexRef.current;
    const distance = Math.abs(activeIndex - previousIndex);
    const direction: StoryStateDirection =
      distance === 0 ? 'jump' : activeIndex > previousIndex ? 'forward' : 'backward';
    const kind: TransitionKind = distance === 0 ? 'initial' : distance === 1 ? 'step' : 'jump';
    transitionRef.current = { direction, kind };

    if (storyRootRef.current) {
      storyRootRef.current.dataset.transitionDirection = direction;
      storyRootRef.current.dataset.transitionKind = kind;
    }
    previousActiveIndexRef.current = activeIndex;
  }, [activeIndex, readingMode]);

  useEffect(() => {
    const stage = storyStageRef.current;
    if (!stage) return;
    const previousKind = previousVisualKindRef.current;
    stage.dataset.sceneHandoff = `${previousKind ?? 'initial'}-to-${stageVisual.kind}`;
    previousVisualKindRef.current = stageVisual.kind;
  }, [readingMode, selectedInstrument, stageVisual.kind, stageVisual.scenarioId]);

  useEffect(() => {
    ratiosRef.current = storySteps.map(() => 0);
    stepRefs.current.length = storySteps.length;
    navigationTargetRef.current = null;
  }, [storySteps]);

  useEffect(() => {
    if (!stageRequested || reducedMotion || gsapRuntime) return;
    let active = true;
    void loadGsapRuntime()
      .then((runtime) => {
        if (active) setGsapRuntime(runtime);
      })
      .catch(() => {
        // The complete static states remain usable if the optional tweening chunk cannot load.
      });
    return () => {
      active = false;
    };
  }, [gsapRuntime, reducedMotion, stageRequested]);

  useEffect(
    () => () => {
      if (navigationUnlockTimerRef.current !== null) {
        window.clearTimeout(navigationUnlockTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const restoredState = readStoredStoryState();
    const timer = window.setTimeout(() => {
      setResumeState(restoredState);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (resumeState === undefined || !storyState.started) return;
    const stored: StoredStoryState = {
      activeIndex: storyState.activeIndex,
      mode: storyState.mode,
      selectedObserver: storyState.selectedObserver,
      version: 3,
    };
    window.sessionStorage.setItem(storySessionKey, JSON.stringify(stored));
    window.sessionStorage.removeItem(legacyStorySessionKey);
  }, [resumeState, storyState]);

  useEffect(() => {
    if (readingMode) return;
    const elements = stepRefs.current.filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.stepIndex);
          if (Number.isInteger(index)) ratiosRef.current[index] = entry.intersectionRatio;
        });
        if (storyState.started && ratiosRef.current.some((ratio) => ratio > 0)) {
          setStageRequested(true);
        }
        const navigationTarget = navigationTargetRef.current;
        if (navigationTarget !== null) {
          const target = stepRefs.current[navigationTarget];
          if (target && stepHasReadingLine(target)) {
            navigationTargetRef.current = null;
            if (navigationUnlockTimerRef.current !== null) {
              window.clearTimeout(navigationUnlockTimerRef.current);
              navigationUnlockTimerRef.current = null;
            }
            dispatch({ type: 'activate', index: navigationTarget });
          }
          return;
        }
        const nextIndex = stepAtReadingLine(elements, ratiosRef.current, activeIndexRef.current);
        if (ratiosRef.current[nextIndex] > 0) dispatch({ type: 'activate', index: nextIndex });
      },
      {
        rootMargin: '-8% 0px -8% 0px',
        threshold: Array.from({ length: 25 }, (_, index) => index / 24),
      },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [readingMode, storyState.started, storySteps]);

  useEffect(() => {
    if (readingMode || preferenceReducedMotion) {
      const frame = window.requestAnimationFrame(() => {
        setBranchProgress(readingMode ? 0 : activeIndex > 0 ? 1 : 0);
        setObserverProgress(activeIndex > observerStepIndex ? 1 : 0);
        storyRootRef.current?.style.setProperty('--story-step-center', '0');
        if (storyRootRef.current) storyRootRef.current.dataset.scrollDirection = 'idle';
      });
      return () => window.cancelAnimationFrame(frame);
    }

    let animationFrame = 0;
    const updateScrollProgress = () => {
      animationFrame = 0;
      const viewportHeight = window.innerHeight;
      const root = storyRootRef.current;
      const activeStep = stepRefs.current[activeIndexRef.current];
      if (activeStep) {
        const progress = stepScrollProgress(activeStep.getBoundingClientRect(), viewportHeight);
        const centeredProgress = progress * 2 - 1;
        root?.style.setProperty('--story-step-center', centeredProgress.toFixed(4));
      }

      const scrollY = window.scrollY;
      const delta = scrollY - previousScrollYRef.current;
      if (root) {
        if (Math.abs(delta) >= 0.5) {
          root.dataset.scrollDirection = delta > 0 ? 'forward' : 'backward';
        }
      }
      previousScrollYRef.current = scrollY;

      const branchStep = stepRefs.current[1];
      if (branchStep) {
        const rect = branchStep.getBoundingClientRect();
        const revealStart = viewportHeight * 0.68;
        const revealEnd = viewportHeight * -0.1;
        const progress = smoothUnit((revealStart - rect.top) / (revealStart - revealEnd));
        setBranchProgress((previous) =>
          Math.abs(previous - progress) > 0.0015 ? progress : previous,
        );
      }

      const observerStep = stepRefs.current[observerStepIndex];
      if (observerStep) {
        const rect = observerStep.getBoundingClientRect();
        const runwayStart = viewportHeight * 0.1;
        const runwayDistance = Math.max(viewportHeight, rect.height - viewportHeight * 0.96);
        const progress = clampUnit((runwayStart - rect.top) / runwayDistance);
        setObserverProgress((previous) =>
          Math.abs(previous - progress) > 0.0015 ? progress : previous,
        );
      }
    };
    const requestUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateScrollProgress);
    };
    const cancelProgrammaticNavigation = () => {
      navigationTargetRef.current = null;
      if (navigationUnlockTimerRef.current !== null) {
        window.clearTimeout(navigationUnlockTimerRef.current);
        navigationUnlockTimerRef.current = null;
      }
    };

    updateScrollProgress();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    window.addEventListener('touchstart', cancelProgrammaticNavigation, { passive: true });
    window.addEventListener('wheel', cancelProgrammaticNavigation, { passive: true });
    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      window.removeEventListener('touchstart', cancelProgrammaticNavigation);
      window.removeEventListener('wheel', cancelProgrammaticNavigation);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [activeIndex, observerStepIndex, preferenceReducedMotion, readingMode]);

  useEffect(() => {
    const root = storyRootRef.current;
    const stage = storyStageRef.current;
    if (!root || !stage || !gsapRuntime) return;

    const activeStep = stepRefs.current[activeIndex];
    const card = activeStep?.querySelector<HTMLElement>('.storyStepCard');
    const cardLayers = card
      ? Array.from(card.children).filter((node): node is HTMLElement => node instanceof HTMLElement)
      : [];
    const chromeLayers = [
      ...stage.querySelectorAll<HTMLElement>('.stageMeta > span, .stageSource > span'),
    ];
    const animatedLayers = [...cardLayers, ...chromeLayers];
    const gsap = gsapRuntime;

    gsap.killTweensOf(animatedLayers);
    if (reducedMotion || readingMode) {
      gsap.set(animatedLayers, { clearProps: 'opacity,transform' });
      root.dataset.motionPhase = 'settled';
      return;
    }

    const { direction, kind } = transitionRef.current;
    const directionSign = direction === 'backward' ? -1 : direction === 'forward' ? 1 : 0;
    const isJump = kind === 'jump';
    root.dataset.motionPhase = 'settling';

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { overwrite: 'auto' },
        onComplete: () => {
          root.dataset.motionPhase = 'settled';
        },
      });
      if (cardLayers.length > 0) {
        timeline.fromTo(
          cardLayers,
          {
            opacity: isJump ? 0.72 : 0.24,
            y: directionSign * (isJump ? 6 : 16),
          },
          {
            clearProps: 'opacity,transform',
            duration: isJump ? 0.28 : 0.64,
            ease: 'power3.out',
            opacity: 1,
            stagger: isJump ? 0 : 0.045,
            y: 0,
          },
          0,
        );
      }
      if (chromeLayers.length > 0) {
        timeline.fromTo(
          chromeLayers,
          { opacity: 0.42, y: directionSign * 7 },
          {
            clearProps: 'opacity,transform',
            duration: isJump ? 0.24 : 0.48,
            ease: 'power2.out',
            opacity: 1,
            stagger: 0.025,
            y: 0,
          },
          0.04,
        );
      }
    }, root);

    return () => {
      context.revert();
      root.dataset.motionPhase = 'settled';
    };
  }, [activeIndex, gsapRuntime, readingMode, reducedMotion, stageVisual.kind]);

  const activeObservation = useMemo(
    () => ({
      instrument: stageVisual.instrument ?? 'habitable_worlds_observatory',
      scenarioId: stageVisual.scenarioId ?? 'S1',
      visible: stageVisual.kind === 'ocular',
    }),
    [stageVisual],
  );

  const handleStageReady = useCallback((mode: 'fallback' | 'poster' | 'spatial') => {
    setStageReadiness(mode);
  }, []);

  const handleStageRecoveryChange = useCallback((active: boolean) => {
    setStageRecoveryActive(active);
  }, []);

  const selectObserver = useCallback((selectedObserver: ObservingMissionId) => {
    dispatch({ type: 'selectObserver', selectedObserver });
  }, []);

  function moveTo(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), storySteps.length - 1);
    const target = stepRefs.current[nextIndex];
    setStageRequested(true);
    navigationTargetRef.current = readingMode ? null : nextIndex;
    if (navigationUnlockTimerRef.current !== null) {
      window.clearTimeout(navigationUnlockTimerRef.current);
      navigationUnlockTimerRef.current = null;
    }
    if (!readingMode) {
      navigationUnlockTimerRef.current = window.setTimeout(
        () => {
          navigationTargetRef.current = null;
          navigationUnlockTimerRef.current = null;
        },
        reducedMotion ? 200 : 1800,
      );
    }
    dispatch({ type: 'activate', index: nextIndex });
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: target.dataset.scrollAnchor === 'observer' ? 'start' : 'center',
    });
  }

  function startStory(index = 0, restoredState?: StoredStoryState) {
    setStageRequested(restoredState?.mode !== 'reading');
    if (restoredState) {
      dispatch({
        type: 'restore',
        activeIndex: index,
        mode: restoredState.mode,
        selectedObserver: restoredState.selectedObserver,
        stepCount: storySteps.length,
      });
    } else {
      dispatch({ type: 'start', reducedMotion: preferenceReducedMotion });
    }
    requestAnimationFrame(() => moveTo(index));
  }

  return (
    <section
      className={readingMode ? 'story story-reading' : 'story story-guided'}
      data-story-motion={reducedMotion ? 'reduced' : undefined}
      id="story"
      aria-labelledby="story-title"
      ref={storyRootRef}
    >
      <header className="storyIntro">
        <p className="eyebrow">Guided story · chapters 0–7 + epilogue</p>
        <h2 id="story-title">Watch one Earth become ten possible worlds.</h2>
        <p>
          Scroll through one continuous Earth-to-observer journey, or read the same sourced article
          without animation. The story never captures wheel or touch input.
        </p>
        <p className="storyReadiness" aria-live="polite">
          <span aria-hidden="true" />
          {stageReadiness === 'spatial'
            ? 'Spatial stage ready'
            : stageReadiness === 'poster'
              ? 'Complete poster and DOM story ready · interactive view optional'
              : stageReadiness === 'fallback'
                ? 'Complete 2D fallback ready · spatial layer initializing'
                : 'Core article and 2D scene ready now'}
        </p>
        <div className="storyConsent" role="group" aria-label="Story options">
          <button className="primaryButton" onClick={() => startStory(0)} type="button">
            Start story
          </button>
          {resumeState && (
            <button
              className="secondaryButton"
              onClick={() => startStory(resumeState.activeIndex, resumeState)}
              type="button"
            >
              Resume at {resumeState.activeIndex + 1} / {storySteps.length}
            </button>
          )}
          <button
            className="secondaryButton"
            onClick={() => {
              if (readingMode) {
                dispatch({ type: 'visual', reducedMotion: preferenceReducedMotion });
                setStageRequested(true);
              } else {
                dispatch({ type: 'read' });
              }
            }}
            type="button"
          >
            {readingMode ? 'Return to visual story' : 'Read without animation'}
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
          if (event.defaultPrevented) return;
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
          <div
            className="storySticky"
            style={stageRecoveryActive ? { pointerEvents: 'none', zIndex: 4 } : undefined}
          >
            <div className="storyStage" data-active-step={currentStep.id} ref={storyStageRef}>
              {stageRequested ? (
                <EarthStage
                  branchProgress={branchProgress}
                  observerProgress={observerProgress}
                  onReady={handleStageReady}
                  onRecoveryChange={handleStageRecoveryChange}
                  reducedMotion={reducedMotion}
                  state={stageVisual}
                />
              ) : (
                <DeferredEarthStage reducedMotion={reducedMotion} state={stageVisual} />
              )}

              {stageVisual.kind === 'observer' && (
                <ObservationBridge
                  gsapRuntime={gsapRuntime}
                  progress={bridgeProgress}
                  reducedMotion={reducedMotion}
                />
              )}

              <ObserverInstrumentSelector
                instrument={selectedInstrument}
                onChange={selectObserver}
                visible={stageVisual.kind === 'observer'}
              />

              {activeObservation.visible && (
                <OcularObservation
                  gsapRuntime={gsapRuntime}
                  instrument={activeObservation.instrument}
                  reducedMotion={reducedMotion}
                  scenarioId={activeObservation.scenarioId}
                  visible
                />
              )}

              <div className="stageMeta">
                <span>Chapter {currentStep.chapter}</span>
                <span>
                  {String(activeIndex + 1).padStart(2, '0')} / {storySteps.length}
                </span>
                <span>{reducedMotion ? 'Motion reduced' : stageVisual.kind}</span>
              </div>

              <WorldLabels
                activeScenario={stageVisual.kind === 'scenario' ? stageVisual.scenarioId : null}
                budding={stageVisual.kind === 'branches' && stageVisual.branchState === 'budding'}
                visible={
                  stageVisual.kind === 'scenario' ||
                  (stageVisual.kind === 'branches' && branchProgress > 0.72)
                }
              />

              <div
                className={`storyMetricsLayer ${stageVisual.showMetrics ? 'storyOverlayVisible' : ''}`}
              >
                <MetricReadout scenarioId={stageVisual.scenarioId ?? 'S1'} />
              </div>

              <MissionMatrixPanel visible={stageVisual.kind === 'matrix'} />

              <HandoffPanel
                instrument={selectedInstrument}
                visible={stageVisual.kind === 'handoff'}
              />

              <EpiloguePanel visible={stageVisual.kind === 'epilogue'} />

              <nav className="storyChapterProgress" aria-label="Story progress">
                {storyChapters.map(({ chapter, firstIndex }) => (
                  <button
                    aria-current={currentStep.chapter === chapter ? 'step' : undefined}
                    aria-label={`Chapter ${chapter}: ${chapterLabels[chapter]}`}
                    key={chapter}
                    onClick={() => moveTo(firstIndex)}
                    title={`Chapter ${chapter}: ${chapterLabels[chapter]}`}
                    type="button"
                  >
                    <span>{chapter}</span>
                    <small>{chapterLabels[chapter]}</small>
                  </button>
                ))}
              </nav>

              <div className="stageSource">
                <span>Project Janus scenarios are possibilities, not forecasts.</span>
                <span>
                  {stageVisual.kind === 'collapse'
                    ? 'Reported aggregate layer · no invented trajectory'
                    : 'Interpretive staging · canonical values and source-linked evidence'}
                </span>
              </div>

              <p className="srOnly" aria-live="polite">
                Current visual state: {currentStep.title}. {currentStep.body}
              </p>
            </div>
          </div>
        )}

        <div className="storySteps" aria-label="Story chapters">
          {storySteps.map((step, index) => (
            <article
              aria-current={index === activeIndex ? 'step' : undefined}
              className={`storyStep storyStep-${step.cardSide}`}
              data-scroll-anchor={step.id === 'observer-turn' ? 'observer' : undefined}
              data-step-position={
                index === activeIndex ? 'active' : index < activeIndex ? 'past' : 'future'
              }
              data-step-index={index}
              data-telemetry-chapter={step.id}
              data-visual-kind={step.visual.kind}
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
                {step.id === 'possibility-families' && (
                  <ul className="storyFamilySummary">
                    {familyDefinitions.map((family) => (
                      <li key={family.id}>
                        <strong>{family.label}</strong>
                        <span>
                          {allScenarioProfiles
                            .filter(({ growth }) => growth.growthState === family.growthState)
                            .map(({ id }) => id)
                            .join(', ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <a
                  className="storyCitation"
                  href={step.sourceHref}
                  rel={step.sourceHref.startsWith('http') ? 'noreferrer' : undefined}
                  target={step.sourceHref.startsWith('http') ? '_blank' : undefined}
                >
                  {step.sourceLabel} {step.sourceHref.startsWith('http') ? '↗' : '→'}
                </a>
              </div>
            </article>
          ))}
        </div>

        {!readingMode && (
          <button
            className="storyRestart"
            onClick={() => {
              window.sessionStorage.removeItem(storySessionKey);
              window.sessionStorage.removeItem(legacyStorySessionKey);
              setResumeState(null);
              dispatch({ type: 'restart' });
              requestAnimationFrame(() => moveTo(0));
            }}
            type="button"
          >
            Restart story
          </button>
        )}
      </div>
    </section>
  );
}
