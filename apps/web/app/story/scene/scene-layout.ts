import type { ScenarioId } from '@janus/domain/scenario';

import type { StoryVisualState } from '../story-content';
import { getScenarioProfile } from '../../../lib/canonical-core';
import { getOffworldContext } from '../offworld-context';

export type Point3 = [number, number, number];
export type SpatialPose = { position: Point3; scale: number };
export type SceneTarget = {
  camera: { position: Point3; target: Point3; fov: number };
  present: SpatialPose;
  worlds: SpatialPose[];
  branchOpacity: number;
  observerOpacity: number;
  observerTime: number;
  systemOpacity: number;
};

// Authored composition, not physical positions or likelihood. Ordering is S1–S10.
export const landscapeWorldPositions: Point3[] = (
  [
    [2.4, 2.2, 0.1],
    [4.4, 1.25, -0.4],
    [-3.9, 2.3, -0.5],
    [-5, 0.65, 0.15],
    [-3.9, -1, 0.4],
    [4.5, -0.6, 0.2],
    [-2.3, -1.9, -0.2],
    [0.15, -2.35, 0.5],
    [2.4, -1.6, -0.3],
    [-2.25, 2.4, -0.7],
  ] as Point3[]
).map(([x, y, z]) => [x, y * 0.72 + 1.0, z]);

export const portraitWorldPositions: Point3[] = [
  [0.96, 2.55, 0],
  [0.96, 1.68, -0.2],
  [-0.96, 2.55, -0.1],
  [-0.96, 1.68, 0.1],
  [-0.96, 0.81, 0],
  [0.96, 0.81, -0.1],
  [-0.96, -0.06, 0.1],
  [0.96, -0.93, 0],
  [0.96, -0.06, 0.1],
  [-0.96, -0.93, -0.1],
];

export const branchOrigin: Point3 = [0, 1.5, -0.8];
export const portraitBranchOrigin: Point3 = [0, 3.42, -0.5];

export function unit(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function smoothWindow(value: number, start: number, end: number) {
  const t = unit((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

export function lerpPoint(a: Point3, b: Point3, t: number): Point3 {
  if (t === 0) return [...a];
  if (t === 1) return [...b];
  return a.map((value, index) => value + (b[index] - value) * t) as Point3;
}

export function scenarioIndex(id: ScenarioId | null | undefined) {
  return id ? Number(id.slice(1)) - 1 : 0;
}

export function evaluateScene(
  state: StoryVisualState,
  portrait: boolean,
  branchProgress = 1,
  observerProgress = 0,
): SceneTarget {
  const positions = portrait ? portraitWorldPositions : landscapeWorldPositions;
  const origin = portrait ? portraitBranchOrigin : branchOrigin;
  const active = scenarioIndex(state.scenarioId);
  const focus: Point3 = portrait ? [0, 1.35, 0] : [-1.65, 0.3, 0];
  const empty: SpatialPose = { position: [0, 0, -18], scale: 0.001 };
  const result: SceneTarget = {
    camera: { position: [0, 0.4, 9], target: [0, 0.4, 0], fov: portrait ? 44 : 40 },
    present: { position: focus, scale: portrait ? 1.24 : 1.85 },
    worlds: positions.map(() => ({ ...empty, position: [...empty.position] })),
    branchOpacity: 0,
    observerOpacity: 0,
    observerTime: 0,
    systemOpacity: 0,
  };
  if (state.kind === 'present' || state.kind === 'epilogue') return result;
  result.present = { ...empty };
  if (state.kind === 'branches') {
    const progress = state.branchState === 'all' ? 1 : unit(branchProgress);
    result.camera = {
      position: [0, portrait ? 1 : 0.6, portrait ? 9.6 : 12.2],
      target: [0, portrait ? 1 : 0.6, 0],
      fov: portrait ? 44 : 40,
    };
    result.present = {
      position: lerpPoint(focus, origin, smoothWindow(progress, 0, 0.55)),
      scale:
        (portrait ? 1.24 : 1.85) * (1 - smoothWindow(progress, 0, 0.65)) +
        (portrait ? 0.28 : 0.6) * smoothWindow(progress, 0, 0.65),
    };
    result.worlds = positions.map((position, index) => {
      const travel = smoothWindow(progress, 0.16 + index * 0.013, 0.76 + index * 0.013);
      return {
        position: lerpPoint(origin, position, travel),
        scale: Math.max(0.001, (portrait ? 0.27 : 0.56) * smoothWindow(travel, 0.18, 1)),
      };
    });
    result.branchOpacity = smoothWindow(progress, 0.22, 0.82);
  } else if (state.kind === 'observer') {
    // Actual camera/target positions are supplied by the authored Blender track.
    result.observerOpacity = 1;
    result.observerTime = unit(observerProgress);
    result.worlds[active] = { position: [-1.27, 4.893, -12.684], scale: 0.67 };
  } else if (state.kind === 'ocular') {
    result.worlds[active] = {
      position: portrait ? [0, 1.4, 0] : [-1.65, 0.4, 0],
      scale: portrait ? 1.1 : 1.6,
    };
  } else if (state.kind === 'scenario' || state.kind === 'handoff') {
    result.worlds = positions.map((_, index) =>
      index === active
        ? { position: focus, scale: portrait ? 1.24 : 1.85 }
        : { ...empty, position: [...empty.position] },
    );
    if (
      state.kind === 'scenario' &&
      state.scenarioId &&
      getOffworldContext(getScenarioProfile(state.scenarioId)).bodies.length
    ) {
      result.worlds[active] = {
        position: portrait ? [0, 2.15, 0] : [-1.65, 0.85, 0],
        scale: portrait ? 0.7 : 1.4,
      };
    }
    if (
      state.kind === 'scenario' &&
      state.scenarioId &&
      getScenarioProfile(state.scenarioId).system.some(({ id }) => id === 'dyson_sphere')
    ) {
      result.systemOpacity = 1;
      result.worlds[active] = {
        position: portrait ? [-0.98, 2.5, 0] : [-3.75, 0.7, 0],
        scale: portrait ? 0.19 : 0.38,
      };
    }
  } else if (state.kind === 'collapse' && state.collapseView === 'single') {
    result.worlds[active] = {
      position: portrait ? [0, 1.7, 0] : [-1.65, 0.3, 0],
      scale: portrait ? 0.72 : 1.2,
    };
  } else {
    result.worlds[active] = {
      position: portrait ? [0, 2.8, -1] : [-3.9, 0.2, -1],
      scale: portrait ? 0.52 : 1.1,
    };
  }
  return result;
}
