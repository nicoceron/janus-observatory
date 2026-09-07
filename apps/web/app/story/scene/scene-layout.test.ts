import { describe, expect, it } from 'vitest';

import { buildObserverStory } from '../story-content';
import { evaluateScene, landscapeWorldPositions, portraitWorldPositions } from './scene-layout';

describe('cinematic complete-state evaluation', () => {
  it('stages the published stellar structure outside Earth, never in an instrument frame', () => {
    const s9 = evaluateScene({ kind: 'scenario', scenarioId: 'S9' }, false);
    expect(s9.systemOpacity).toBe(1);
    expect(s9.worlds[8].scale).toBeLessThan(1);
    expect(evaluateScene({ kind: 'scenario', scenarioId: 'S10' }, false).systemOpacity).toBe(0);
    expect(evaluateScene({ kind: 'ocular', scenarioId: 'S9' }, false).systemOpacity).toBe(0);
  });
  it('covers every semantic state on every method path without history', () => {
    for (const method of [
      'habitable_worlds_observatory',
      'radio',
      'large_interferometer_for_exoplanets',
      'solar_gravitational_lens',
      'deep_space_probes',
    ] as const) {
      const steps = buildObserverStory(method);
      expect(steps).toHaveLength(31);
      for (const portrait of [false, true]) {
        for (const step of steps) {
          const direct = evaluateScene(step.visual, portrait, 1, 0.6);
          steps.toReversed().forEach(({ visual }) => evaluateScene(visual, portrait, 0.3, 0.8));
          expect(evaluateScene(step.visual, portrait, 1, 0.6)).toEqual(direct);
          expect(direct.worlds).toHaveLength(10);
          expect(JSON.stringify(direct)).not.toMatch(/null|NaN/);
        }
      }
    }
  });

  it('keeps all ten overview worlds distinct and at a readable scale', () => {
    for (const [portrait, positions] of [
      [false, landscapeWorldPositions],
      [true, portraitWorldPositions],
    ] as const) {
      const target = evaluateScene({ kind: 'branches', branchState: 'all' }, portrait, 0);
      expect(target.worlds.map(({ position }) => position)).toEqual(positions);
      expect(target.worlds.every(({ scale }) => scale >= 0.27)).toBe(true);
      for (let a = 0; a < 10; a++)
        for (let b = a + 1; b < 10; b++) {
          const distance = Math.hypot(...positions[a].map((v, i) => v - positions[b][i]));
          expect(distance).toBeGreaterThan(target.worlds[a].scale + target.worlds[b].scale);
        }
    }
  });

  it('changes evidence without changing the framed world', () => {
    for (const scenarioId of ['S9', 'S10'] as const) {
      const hwo = evaluateScene(
        { kind: 'ocular', scenarioId, instrument: 'habitable_worlds_observatory' },
        false,
      );
      const probe = evaluateScene(
        { kind: 'ocular', scenarioId, instrument: 'deep_space_probes' },
        false,
      );
      expect(hwo).toEqual(probe);
    }
  });
});
