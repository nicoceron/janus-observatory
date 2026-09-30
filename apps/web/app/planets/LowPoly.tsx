import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import type { WorldSignals } from '../../lib/world-signals';
import { useReducedMotionPreference } from '../components/MotionPreference';
import { buildCompanion, buildFeature, type Companion, type Feature } from './bodies';
import { buildLandmark, buildWorld } from './catalog';
import { disposeLayers } from './materials';
import { qualities, type WorldModel } from './model';
import { ModelView } from './ModelView';

export type QualityName = keyof typeof qualities;

/** The whole world, including rings and orbits, fits this diameter at scale 1. */
export const WORLD_ENVELOPE = 3.1;

type Entry = { model: WorldModel; users: number; timer?: ReturnType<typeof setTimeout> };
const cache = new Map<string, Entry>();

/**
 * Share built models between mounts. Scrolling back to a chapter reuses its world; a model nobody
 * has shown for a while is released so geometry does not accumulate across a long visit.
 */
function useModel(key: string, build: () => WorldModel) {
  const model = useMemo(() => {
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
    const entry = cache.get(key);
    if (!entry) return;
    entry.users += 1;
    clearTimeout(entry.timer);
    return () => {
      entry.users -= 1;
      if (entry.users > 0) return;
      entry.timer = setTimeout(() => {
        if (entry.users > 0 || cache.get(key) !== entry) return;
        cache.delete(key);
        disposeLayers(entry.model.layers);
      }, 20000);
    };
  }, [key]);
  return model;
}

const mounted = new WeakMap<HTMLCanvasElement, Map<string, number>>();

/**
 * Publish which models a canvas is showing, for tests and diagnostics. Procedural worlds are ready
 * as soon as they mount: there are no downloads or decoder workers to wait for.
 */
function useMounted(name: string) {
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
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
  }, [canvas, name]);
}

/** A scenario Earth (or present-day Earth) at unit globe radius. */
export function LowPolyWorld({
  id,
  signals,
  quality,
  reduced,
  onSelect,
  sway,
}: {
  id: string;
  signals: WorldSignals;
  quality: QualityName;
  reduced: boolean;
  onSelect?: (landmark: string) => void;
  sway?: boolean;
}) {
  const model = useModel(`world:${id}:${quality}`, () =>
    buildWorld(id, signals, qualities[quality]),
  );
  useMounted(`world:${id}`);
  return <ModelView model={model} reduced={reduced} onSelect={onSelect} sway={sway} />;
}

const companions = ['Moon', 'Mars', 'Venus'];

/** A companion body or system feature, scaled so its whole extent spans `size`. */
export function LowPolyBody({
  scenario,
  signals,
  selection,
  size,
  quality,
  reduced,
}: {
  scenario: string;
  signals: WorldSignals;
  selection: string;
  size: number;
  quality: QualityName;
  reduced: boolean;
}) {
  const model = useModel(`body:${scenario}:${selection}:${quality}`, () =>
    companions.includes(selection)
      ? buildCompanion(selection as Companion, scenario, signals, qualities[quality])
      : buildFeature(selection as Feature, scenario, qualities[quality]),
  );
  useMounted(`body:${scenario}:${selection}`);
  return (
    <group scale={size / (2 * model.extent)}>
      <ModelView model={model} reduced={reduced} sway={false} />
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
