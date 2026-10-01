import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import type { WorldSignals } from '../../lib/world-signals';
import { useReducedMotionPreference } from '../components/MotionPreference';
import { buildCompanion, buildFeature, type Companion, type Feature } from './bodies';
import { buildLandmark, buildWorld } from './catalog';
import { atmosphereMaterial, createMaterials, disposeLayers } from './materials';
import { qualities, type WorldModel } from './model';
import { ModelView } from './ModelView';

export type QualityName = keyof typeof qualities;

/** The whole world, including rings and orbits, fits this diameter at scale 1. */
export const WORLD_ENVELOPE = 3.1;

const companions = ['Moon', 'Mars', 'Venus'];

type Entry = { model: WorldModel; users: number; timer?: ReturnType<typeof setTimeout> };
const cache = new Map<string, Entry>();

/** Release an unused model after `delay` ms unless something starts showing it again. */
function expire(key: string, entry: Entry, delay: number) {
  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    if (entry.users > 0 || cache.get(key) !== entry) return;
    cache.delete(key);
    disposeLayers(entry.model.layers);
  }, delay);
}

/**
 * Share built models between mounts. Scrolling back to a chapter reuses its world; a model nobody
 * has shown for a while is released so geometry does not accumulate across a long visit.
 */
function useModel(key: string, build: () => WorldModel): WorldModel;
function useModel(key: string | null, build: () => WorldModel): WorldModel | null;
function useModel(key: string | null, build: () => WorldModel) {
  const model = useMemo(() => {
    if (key === null) return null;
    let entry = cache.get(key);
    if (!entry) {
      entry = { model: build(), users: 0 };
      cache.set(key, entry);
    }
    return entry.model;
    // The key fully identifies the build.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    const entry = key === null ? undefined : cache.get(key);
    if (!entry || key === null) return;
    entry.users += 1;
    clearTimeout(entry.timer);
    return () => {
      entry.users -= 1;
      if (entry.users <= 0) expire(key, entry, 20000);
    };
  }, [key]);
  return model;
}

const pending: { key: string; build: () => WorldModel }[] = [];
const listeners = new Map<string, Set<() => void>>();
let pumping = false;

function subscribe(key: string, listener: () => void) {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(listener);
  return () => set.delete(listener);
}

/**
 * Build queued models in idle time, several per idle period while time remains, so scrolling never
 * waits on a whole world. A busy page still drains the queue through the callback timeout.
 */
function pump() {
  if (pumping || !pending.length || typeof window === 'undefined') return;
  pumping = true;
  const idle =
    window.requestIdleCallback ??
    ((run: (deadline: IdleDeadline) => void) =>
      window.setTimeout(
        () => run({ didTimeout: true, timeRemaining: () => 0 }),
        40,
      ) as unknown as number);
  idle(
    (deadline) => {
      pumping = false;
      let built = 0;
      while (pending.length && (built === 0 || deadline.timeRemaining() > 12)) {
        const job = pending.shift()!;
        if (cache.has(job.key)) continue;
        const entry: Entry = { model: job.build(), users: 0 };
        cache.set(job.key, entry);
        expire(job.key, entry, 90000);
        listeners.get(job.key)?.forEach((listener) => listener());
        built++;
      }
      pump();
    },
    { timeout: 400 },
  );
}

function prewarm(key: string, build: () => WorldModel, urgent = false) {
  if (cache.has(key)) return;
  const queued = pending.findIndex((job) => job.key === key);
  if (queued >= 0) {
    if (urgent) pending.unshift(...pending.splice(queued, 1));
    return;
  }
  if (urgent) pending.unshift({ key, build });
  else pending.push({ key, build });
  pump();
}

/**
 * Show the best model already built and upgrade when the requested one is ready. Only an `eager`
 * model (the world the reader is looking at) may be built during render, and then only at its
 * cheap tier; everything else streams in from the idle queue, so travelling past many worlds never
 * stalls a frame on building them.
 */
function useProgressive(
  key: (tier: QualityName) => string,
  build: (tier: QualityName) => WorldModel,
  tier: QualityName,
  eager: boolean,
) {
  const cheap: QualityName = tier === 'minimal' ? 'minimal' : 'overview';
  const wanted = key(tier),
    fallback = key(cheap);
  const watch = useCallback(
    (listener: () => void) => {
      const a = subscribe(wanted, listener),
        b = subscribe(fallback, listener);
      return () => {
        a();
        b();
      };
    },
    [wanted, fallback],
  );
  // 2: requested tier built; 1: cheap tier built; 0: nothing built yet.
  const ready = useSyncExternalStore(
    watch,
    () => (cache.has(wanted) ? 2 : cache.has(fallback) ? 1 : 0),
    () => 0,
  );
  const shown: QualityName | null = ready === 2 ? tier : ready === 1 || eager ? cheap : null;
  useEffect(() => {
    if (ready === 2) return;
    prewarm(wanted, () => build(tier), true);
    // Queue the cheap tier ahead of the full one so something appears sooner.
    if (shown === null && cheap !== tier) prewarm(fallback, () => build(cheap), true);
    // `build` is derived from the keys' inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, wanted, fallback, tier, cheap, shown]);
  return useModel(shown && key(shown), () => build(shown!));
}

export function prewarmWorld(id: string, signals: WorldSignals, quality: QualityName) {
  prewarm(`world:${id}:${quality}`, () => buildWorld(id, signals, qualities[quality]));
}

export function prewarmBody(
  scenario: string,
  signals: WorldSignals,
  selection: string,
  quality: QualityName,
) {
  prewarm(`body:${scenario}:${selection}:${quality}`, () =>
    companions.includes(selection)
      ? buildCompanion(selection as Companion, scenario, signals, qualities[quality])
      : buildFeature(selection as Feature, scenario, qualities[quality]),
  );
}

const software = new WeakMap<THREE.WebGLRenderer, boolean>();

/**
 * A software rasterizer (SwiftShader, llvmpipe and similar) is the lowest power tier: worlds and
 * bodies draw without instanced props or idle animation, so scrolling and input stay responsive.
 * Landmark studies are single small models and keep their full detail.
 */
export function lowPower(gl: THREE.WebGLRenderer) {
  let low = software.get(gl);
  if (low === undefined) {
    const context = gl.getContext();
    const info = context.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    low = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
    software.set(gl, low);
  }
  return low;
}

function useLowPower() {
  return lowPower(useThree((state) => state.gl));
}

const warmed = new WeakSet<THREE.WebGLRenderer>();

/**
 * Compile every world material once, as soon as the scene mounts, with the live scene's lights. Otherwise the first frame that draws a new material variant stalls while its program
 * compiles (hundreds of milliseconds on a software rasterizer), typically mid-travel. The warm set
 * is never disposed, so programs also survive the last world that uses them unmounting.
 */
export function useWarmShaders() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (warmed.has(gl)) return;
    warmed.add(gl);
    const geometry = new THREE.BufferGeometry();
    const corner = [0, 0, 0, 1e-4, 0, 0, 0, 1e-4, 0];
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(corner, 3));
    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3),
    );
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(9).fill(1), 3));
    const materials = createMaterials();
    const warm = new THREE.Scene();
    for (const material of Object.values(materials)) warm.add(new THREE.Mesh(geometry, material));
    const air = { rim: '#fff', rimStrength: 1, haze: '#fff', hazeOpacity: 0, height: 1 };
    warm.add(new THREE.Mesh(geometry, atmosphereMaterial(air)));
    // Prop parts: instanced, with and without per-instance tints. Software tiers draw no props.
    if (!lowPower(gl))
      for (const part of ['solid', 'sheen', 'glass', 'glow'] as const)
        for (const tinted of [false, true]) {
          const mesh = new THREE.InstancedMesh(geometry, materials[part], 1);
          if (tinted)
            mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(3), 3);
          warm.add(mesh);
        }
    gl.compileAsync(warm, camera, scene).catch(() => undefined);
  }, [gl, scene, camera]);
}

const mounted = new WeakMap<HTMLCanvasElement, Map<string, number>>();

/**
 * Publish which models a canvas is showing, for tests and diagnostics. Procedural worlds are ready
 * as soon as their model is built: there are no downloads or decoder workers to wait for.
 */
function useMounted(name: string, shown = true) {
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    if (!shown) return;
    const models = mounted.get(canvas) ?? new Map<string, number>();
    mounted.set(canvas, models);
    const write = () => {
      canvas.setAttribute('data-planet-models', JSON.stringify([...models.keys()].sort()));
      if (models.size) canvas.setAttribute('data-planet-state', 'ready');
      else canvas.removeAttribute('data-planet-state');
    };
    models.set(name, (models.get(name) ?? 0) + 1);
    write();
    return () => {
      const count = (models.get(name) ?? 1) - 1;
      if (count > 0) models.set(name, count);
      else models.delete(name);
      write();
    };
  }, [canvas, name, shown]);
}

/** A scenario Earth (or present-day Earth) at unit globe radius. */
export function LowPolyWorld({
  id,
  signals,
  quality,
  reduced,
  onSelect,
  sway,
  live,
  eager = true,
}: {
  id: string;
  signals: WorldSignals;
  quality: QualityName;
  reduced: boolean;
  onSelect?: (landmark: string) => void;
  sway?: boolean;
  /** Keep animating while idle: for the world the reader is looking at. */
  live?: boolean;
  /** Build now if nothing is cached. Background worlds pass false and stream in when built. */
  eager?: boolean;
}) {
  const low = useLowPower();
  const tier: QualityName = low ? 'minimal' : quality;
  const model = useProgressive(
    (q) => `world:${id}:${q}`,
    (q) => buildWorld(id, signals, qualities[q]),
    tier,
    eager,
  );
  useMounted(`world:${id}`, model !== null);
  if (!model) return null;
  return (
    <ModelView
      model={model}
      reduced={reduced}
      onSelect={onSelect}
      sway={sway}
      live={live && !low}
    />
  );
}

/** A companion body or system feature, scaled so its whole extent spans `size`. */
export function LowPolyBody({
  scenario,
  signals,
  selection,
  size,
  quality,
  reduced,
  live,
  eager = true,
}: {
  scenario: string;
  signals: WorldSignals;
  selection: string;
  size: number;
  quality: QualityName;
  reduced: boolean;
  live?: boolean;
  eager?: boolean;
}) {
  const low = useLowPower();
  const tier: QualityName = low ? 'minimal' : quality;
  const model = useProgressive(
    (q) => `body:${scenario}:${selection}:${q}`,
    (q) =>
      companions.includes(selection)
        ? buildCompanion(selection as Companion, scenario, signals, qualities[q])
        : buildFeature(selection as Feature, scenario, qualities[q]),
    tier,
    eager,
  );
  useMounted(`body:${scenario}:${selection}`, model !== null);
  if (!model) return null;
  return (
    <group scale={size / (2 * model.extent)}>
      <ModelView model={model} reduced={reduced} sway={false} live={live && !low} />
    </group>
  );
}

/** One landmark in isolation, centred and scaled so its largest dimension spans `size`. */
export function LowPolyLandmark({
  scenario,
  landmark,
  size,
  reduced,
}: {
  scenario: string;
  landmark: string;
  size: number;
  reduced: boolean;
}) {
  const model = useModel(`landmark:${scenario}:${landmark}`, () =>
    buildLandmark(scenario, landmark),
  );
  useMounted(`landmark:${scenario}:${landmark}`);
  const fit = model.bounds!;
  // A slow turntable keeps a standalone study alive without moving the camera.
  const turntable = useRef<THREE.Group>(null);
  const still = useReducedMotionPreference() || reduced;
  useFrame((_, delta) => {
    if (!still && turntable.current) turntable.current.rotation.y += Math.min(delta, 0.05) * 0.25;
  });
  return (
    <group ref={turntable} scale={size / fit.size}>
      <group position={fit.centre.clone().negate()}>
        <ModelView model={model} reduced={reduced} sway={false} />
      </group>
    </group>
  );
}
