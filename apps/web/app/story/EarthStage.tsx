'use client';

import { Canvas, useThree } from '@react-three/fiber';
import Image from 'next/image';
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  allScenarioProfiles,
  collapseDataset,
  getScenarioProfile,
  sourceRefHref,
} from '../../lib/canonical-core';
import { trackPublicInteraction } from '../../lib/telemetry';
import type { StoryVisualState } from './story-content';
import { worldArtProfiles } from './world-art';
import { CinematicScene } from './scene/CinematicScene';
import { getOffworldContext } from './offworld-context';

type EarthStageProps = {
  state: StoryVisualState;
  reducedMotion: boolean;
  branchProgress?: number;
  observerProgress?: number;
  className?: string;
  onReady?: (mode: 'fallback' | 'poster' | 'spatial') => void;
  onRecoveryChange?: (active: boolean) => void;
  interactiveIntent?: boolean;
};

type EarthDeviceTier = 'low' | 'medium' | 'high';
type EarthTextureTier = '1k' | '2k' | '4k';
type EarthTexturePaths = [day: string, night: string, bumpRoughnessClouds: string];

type EarthRenderTier = {
  deviceTier: EarthDeviceTier;
  textureTier: EarthTextureTier;
  texturePaths: EarthTexturePaths;
  dprCap: number;
  anisotropyCap: number;
};

type EarthRenderCapabilities = {
  viewportWidth: number;
  devicePixelRatio: number;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  coarsePointer: boolean;
};

const earthTexturePathsByTier: Record<EarthTextureTier, EarthTexturePaths> = {
  '1k': [
    '/assets/planets/earth-day-1024.webp',
    '/assets/planets/earth-night-1024.webp',
    '/assets/planets/earth-bump-roughness-clouds-1024.webp',
  ],
  '2k': [
    '/assets/planets/earth-day-2048.webp',
    '/assets/planets/earth-night-2048.webp',
    '/assets/planets/earth-bump-roughness-clouds-2048.webp',
  ],
  '4k': [
    '/assets/planets/earth-day-4096.jpg',
    '/assets/planets/earth-night-4096.jpg',
    '/assets/planets/earth-bump-roughness-clouds-4096.jpg',
  ],
};

function selectEarthRenderTier({
  viewportWidth,
  devicePixelRatio,
  deviceMemory,
  hardwareConcurrency,
  coarsePointer,
}: EarthRenderCapabilities): EarthRenderTier {
  const memoryIsLow = deviceMemory !== undefined && deviceMemory <= 4;
  const concurrencyIsLow = hardwareConcurrency !== undefined && hardwareConcurrency <= 4;
  const lowTier = viewportWidth <= 820 || coarsePointer || memoryIsLow || concurrencyIsLow;

  if (lowTier) {
    return {
      deviceTier: 'low',
      textureTier: '1k',
      texturePaths: earthTexturePathsByTier['1k'],
      dprCap: 1,
      anisotropyCap: 2,
    };
  }

  const hasHighCapacity =
    deviceMemory !== undefined &&
    deviceMemory >= 8 &&
    hardwareConcurrency !== undefined &&
    hardwareConcurrency >= 8;
  const displayNeedsHighResolution =
    viewportWidth >= 1600 || viewportWidth * Math.min(Math.max(devicePixelRatio, 1), 2) >= 2400;

  if (hasHighCapacity && displayNeedsHighResolution) {
    return {
      deviceTier: 'high',
      textureTier: '4k',
      texturePaths: earthTexturePathsByTier['4k'],
      dprCap: 1.5,
      anisotropyCap: 8,
    };
  }

  return {
    deviceTier: 'medium',
    textureTier: '2k',
    texturePaths: earthTexturePathsByTier['2k'],
    dprCap: 1.25,
    anisotropyCap: 4,
  };
}

function readEarthRenderTier() {
  if (typeof window === 'undefined') {
    return selectEarthRenderTier({
      viewportWidth: 1280,
      devicePixelRatio: 1,
      coarsePointer: false,
    });
  }

  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  return selectEarthRenderTier({
    viewportWidth: window.innerWidth,
    devicePixelRatio: window.devicePixelRatio,
    deviceMemory: navigatorWithMemory.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency || undefined,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
  });
}

type WebGlAvailability = 'checking' | 'supported' | 'unsupported';

function detectWebGl2Support() {
  if (typeof document === 'undefined') return false;
  try {
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

class CanvasGuard extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('en', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
}

function CollapsePanel({
  scenarioId,
  view,
  visible,
}: {
  reducedMotion: boolean;
  scenarioId: NonNullable<StoryVisualState['scenarioId']>;
  view: StoryVisualState['collapseView'];
  visible: boolean;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const profile = getScenarioProfile(scenarioId);
  const { parameters, reportedResults } = profile.collapse;

  const phases = [
    ['Growth', `r ${parameters.r}/yr`, 'fixed model parameter'],
    ['Resource pressure', `R₀ ${parameters.R0} · δ ${parameters.delta}/yr`, 'reported inputs'],
    ['Collapse survival', formatPercent(parameters.cf), 'capacity retained'],
    [
      'Recovery',
      `${parameters.rd} yr · ${formatPercent(parameters.rf)} of R₀`,
      'delay and restored stock',
    ],
  ];

  return (
    <section
      aria-label="Reported collapse and recovery evidence"
      className={`collapsePanel ${visible ? 'storyOverlayVisible' : ''}`}
      data-view={view}
      ref={panelRef}
      style={{ '--collapse-accent': profile.accent } as React.CSSProperties}
    >
      {view === 'single' ? (
        <>
          <header>
            <span>Reported model layer · {scenarioId}</span>
            <strong>Activity can stop while evidence lingers.</strong>
          </header>
          <dl className="collapsePhases">
            {phases.map(([label, value, note], index) => (
              <div className={`collapsePhase collapsePhase-${index + 1}`} key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
                <small>{note}</small>
              </div>
            ))}
          </dl>
          <div className="collapseResult">
            <span>
              Reported aggregate · {collapseDataset.simulation.monteCarloRunsPerScenario} runs
            </span>
            <strong>{reportedResults.summary}</strong>
            <small>
              {collapseDataset.simulation.windowYears}-year window · hazard h {parameters.h}/yr · no
              per-run trajectory reconstructed
            </small>
          </div>
          <p className="collapsePersistenceNote">
            Signature afterglow is category-dependent. Persistence probability is not calculated in
            this story.
          </p>
        </>
      ) : (
        <>
          <header>
            <span>Reported ensemble summaries</span>
            <strong>Ten different rhythms</strong>
          </header>
          <ol className="collapseRhythms">
            {allScenarioProfiles.map((candidate) => {
              const duty = candidate.collapse.reportedResults.meanDutyCycle;
              return (
                <li
                  data-available={duty === null ? 'false' : 'true'}
                  key={candidate.id}
                  style={
                    {
                      '--rhythm-accent': candidate.accent,
                      '--reported-duty': duty ?? 0,
                    } as React.CSSProperties
                  }
                >
                  <div aria-hidden="true">
                    <i />
                    <span />
                  </div>
                  <strong>{candidate.id}</strong>
                  <span>{duty === null ? 'Not transcribed' : formatPercent(duty)}</span>
                  <small>mean duty cycle</small>
                </li>
              );
            })}
          </ol>
          <p className="collapsePanelSource">
            Reported prose values only · unavailable remains unavailable · figure bars were not
            digitized
          </p>
        </>
      )}
    </section>
  );
}

function CanvasLifecycle({
  onContextLost,
  onContextRestored,
  onReady,
}: {
  onContextLost: () => void;
  onContextRestored: () => void;
  onReady: () => void;
}) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };
    const handleContextRestored = () => {
      onContextRestored();
      invalidate();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    onReady();

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl, invalidate, onContextLost, onContextRestored, onReady]);
  return null;
}

type RendererState = 'failed' | 'loading' | 'lost' | 'poster' | 'ready' | 'restored';

export function EarthStage({
  state,
  reducedMotion,
  branchProgress = 0,
  observerProgress = 0,
  className = '',
  onReady,
  onRecoveryChange,
  interactiveIntent = false,
}: EarthStageProps) {
  const profile = state.scenarioId ? getScenarioProfile(state.scenarioId) : undefined;
  const offworld = profile && state.kind === 'scenario' ? getOffworldContext(profile) : undefined;
  const stellarStructure =
    state.kind === 'scenario' ? profile?.system.find(({ id }) => id === 'dyson_sphere') : undefined;
  const [renderTier] = useState(readEarthRenderTier);
  const posterFirst = renderTier.deviceTier === 'low' && !interactiveIntent;
  const [canvasGeneration, setCanvasGeneration] = useState(0);
  const [interactiveRequested, setInteractiveRequested] = useState(!posterFirst);
  const [rendererState, setRendererState] = useState<RendererState>(
    posterFirst ? 'poster' : 'loading',
  );
  const [webGlAvailability, setWebGlAvailability] = useState<WebGlAvailability>('checking');
  const [visible, setVisible] = useState(true);
  const wrapper = useRef<HTMLDivElement>(null);
  const webglReady = rendererState === 'ready';
  const [observerReady, setObserverReady] = useState(false);
  const handleObserverReady = useCallback(() => setObserverReady(true), []);
  const recoveryActive =
    rendererState === 'failed' || rendererState === 'lost' || rendererState === 'restored';
  const stageControlActive = recoveryActive || !interactiveRequested;

  useEffect(() => {
    if (interactiveIntent && !interactiveRequested) {
      const frame = requestAnimationFrame(() => {
        setInteractiveRequested(true);
        setRendererState('loading');
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [interactiveIntent, interactiveRequested]);

  useEffect(() => {
    onReady?.(posterFirst ? 'poster' : 'fallback');
  }, [onReady, posterFirst]);

  useEffect(() => {
    onRecoveryChange?.(stageControlActive);
  }, [onRecoveryChange, stageControlActive]);

  useEffect(
    () => () => {
      onRecoveryChange?.(false);
    },
    [onRecoveryChange],
  );

  useEffect(() => {
    if (!wrapper.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? true),
      { rootMargin: '160px' },
    );
    observer.observe(wrapper.current);
    return () => observer.disconnect();
  }, []);

  const handleCanvasFailure = useCallback(() => {
    setRendererState('failed');
    trackPublicInteraction('fallback_mode', 'webgl_initialization_failed');
    onReady?.('fallback');
  }, [onReady]);

  const handleCanvasReady = useCallback(() => {
    setRendererState('ready');
    onReady?.('spatial');
  }, [onReady]);

  const handleContextLost = useCallback(() => {
    setRendererState('lost');
    trackPublicInteraction('fallback_mode', 'webgl_context_lost');
    onReady?.('fallback');
  }, [onReady]);

  const handleContextRestored = useCallback(() => {
    setRendererState('restored');
    trackPublicInteraction('fallback_mode', 'webgl_context_restored');
    onReady?.('fallback');
  }, [onReady]);

  useEffect(() => {
    if (!interactiveRequested) return;
    const frame = window.requestAnimationFrame(() => {
      if (detectWebGl2Support()) {
        setWebGlAvailability('supported');
        return;
      }
      setWebGlAvailability('unsupported');
      handleCanvasFailure();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [canvasGeneration, handleCanvasFailure, interactiveRequested]);

  const openInteractiveStage = useCallback(() => {
    trackPublicInteraction('fallback_mode', 'low_tier_interactive_opt_in');
    setInteractiveRequested(true);
    setRendererState('loading');
    onReady?.('fallback');
  }, [onReady]);

  const retrySpatialStage = useCallback(() => {
    trackPublicInteraction('fallback_mode', 'webgl_retry');
    setWebGlAvailability('checking');
    setRendererState('loading');
    setCanvasGeneration((generation) => generation + 1);
    onReady?.('fallback');
  }, [onReady]);

  const recoveryMessage =
    rendererState === 'lost'
      ? 'Spatial rendering paused after graphics context loss. The complete 2D view remains available.'
      : rendererState === 'restored'
        ? 'The graphics context was restored. Retry to rebuild the spatial layer.'
        : 'Spatial rendering could not initialize. The complete 2D view remains available.';

  return (
    <div
      className={`earthStage ${webglReady ? 'earthStageWebglReady' : ''} ${className}`}
      data-scene-kind={state.kind}
      data-branch-state={state.branchState}
      data-branch-layout="spatial-families"
      data-branch-animation="scroll-scrubbed"
      data-branch-progress={branchProgress.toFixed(3)}
      data-observer-asset="janus-observatory-v2"
      data-observer-motion={reducedMotion ? 'reduced' : 'skeletal-authored-scroll'}
      data-observer-camera="blender-authored-optical-axis"
      data-observer-progress={observerProgress.toFixed(3)}
      data-earth-anisotropy-cap={renderTier.anisotropyCap}
      data-earth-device-tier={renderTier.deviceTier}
      data-earth-dpr-cap={renderTier.dprCap}
      data-earth-texture-tier={renderTier.textureTier}
      data-render-state={rendererState}
      data-render-loop="demand"
      data-spatial-consent={interactiveRequested ? 'granted' : 'required'}
      data-stage-visible={visible ? 'true' : 'false'}
      data-world-lifecycle={interactiveRequested ? 'persistent' : 'poster-first'}
      ref={wrapper}
      style={{ '--scene-accent': profile?.accent ?? '#b8f15c' } as React.CSSProperties}
    >
      <dl className="srOnly" data-earth-render-status="bounded">
        <div>
          <dt>Earth rendering device tier</dt>
          <dd>{renderTier.deviceTier}</dd>
        </div>
        <div>
          <dt>Earth texture tier</dt>
          <dd>{renderTier.textureTier}</dd>
        </div>
        <div>
          <dt>Canvas device-pixel-ratio cap</dt>
          <dd>{renderTier.dprCap}</dd>
        </div>
        <div>
          <dt>Texture anisotropy cap</dt>
          <dd>{renderTier.anisotropyCap}</dd>
        </div>
      </dl>
      {stellarStructure && (
        <aside className="srOnly">
          <strong>{stellarStructure.label}</strong>
          <p>
            Published system signature. Illustrative stellar cutaway, separate from Earth; not to
            scale or an instrument image.
          </p>
          <a href={sourceRefHref(stellarStructure.sourceRefs[0])}>Scenario paper · Table 7 ↗</a>
        </aside>
      )}
      {offworld && (
        <div className="offworldLabels" aria-label="Published off-world context">
          {offworld.bodies.map(({ body, signatures }) => (
            <a
              key={body}
              aria-label={`${body}: published signature`}
              data-context-body={body}
              href={sourceRefHref(signatures[0].sourceRefs[0])}
            >
              {body}
              <small>Published signature ↗</small>
            </a>
          ))}
        </div>
      )}
      {state.kind === 'observer' && (!webglReady || !observerReady) && (
        <div className="observerPoster" aria-hidden="true">
          <picture>
            <source
              media="(max-width: 760px)"
              srcSet="/assets/observer/janus-cinematic-observer-portrait-v2.webp"
            />
            {/* Authored local WebP, including a separately framed portrait derivative. */}
            <img
              alt=""
              src="/assets/observer/janus-cinematic-observer-v2.webp"
              width={1200}
              height={800}
            />
          </picture>
        </div>
      )}
      <div className="stageFallback" aria-hidden="true">
        <span className="fallbackEarth">
          <Image
            alt=""
            fill
            sizes="(max-width: 760px) 68vw, 390px"
            src="/assets/planets/earth-portrait-v1.webp"
            unoptimized
          />
        </span>
        <span className="fallbackBranchOrigin" />
        <span className="fallbackBranches">
          {allScenarioProfiles.map((scenario, index) => (
            <i
              className="fallbackFutureWorld"
              data-world-art={worldArtProfiles[scenario.id].surface}
              key={scenario.id}
              style={
                {
                  '--fallback-index': index,
                  '--fallback-accent': scenario.accent,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
        <span className="fallbackAlien" />
        <span className="fallbackTelescope" />
        <span className="fallbackTargetEarth" />
        <span className="fallbackOcular" />
      </div>
      <CollapsePanel
        reducedMotion={reducedMotion}
        scenarioId={state.scenarioId ?? 'S4'}
        view={state.collapseView}
        visible={state.kind === 'collapse'}
      />
      {!interactiveRequested && (
        <div className="stageRecovery stageInteractiveChoice">
          <p>
            The poster and complete structured story are ready. The interactive view is optional.
          </p>
          <button onClick={openInteractiveStage} type="button">
            Open interactive view
          </button>
        </div>
      )}
      {recoveryActive && (
        <div className="stageRecovery">
          <p aria-live="polite" role="status">
            {recoveryMessage}
          </p>
          <button onClick={retrySpatialStage} type="button">
            Retry spatial view
          </button>
        </div>
      )}
      {webGlAvailability === 'supported' && (
        <CanvasGuard key={canvasGeneration} onFailure={handleCanvasFailure}>
          <Canvas
            aria-hidden="true"
            camera={{ position: [0, 0, 7.2], fov: 42 }}
            className="earthCanvas"
            dpr={[1, renderTier.dprCap]}
            frameloop="demand"
            gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          >
            <Suspense fallback={null}>
              <CanvasLifecycle
                onContextLost={handleContextLost}
                onContextRestored={handleContextRestored}
                onReady={handleCanvasReady}
              />
              <CinematicScene
                onObserverReady={handleObserverReady}
                active={visible}
                branchProgress={branchProgress}
                observerProgress={observerProgress}
                reducedMotion={reducedMotion}
                state={state}
                textureAnisotropy={renderTier.anisotropyCap}
                texturePaths={renderTier.texturePaths}
              />
            </Suspense>
          </Canvas>
        </CanvasGuard>
      )}
    </div>
  );
}
