import { describe, expect, it } from 'vitest';
import { allScenarioProfiles } from '../../lib/canonical-core';
import { systemPortrait } from '../../lib/system-portrait';
import { presentSignals, worldSignals } from '../../lib/world-signals';
import { buildCompanion, buildFeature } from './bodies';
import { buildLandmark, buildWorld, landmarkIds, worldIds } from './catalog';
import { coveredFaces, decades, lightShare, satelliteCount } from './encoding';
import { surfaces } from './materials';
import { qualities, type WorldModel } from './model';
import { worldStories } from './stories';

const signals = allScenarioProfiles.map(worldSignals);
const triangles = (model: WorldModel) =>
  model.layers.reduce(
    (sum, layer) =>
      sum + surfaces.reduce((n, s) => n + (layer[s]?.getAttribute('position').count ?? 0) / 3, 0),
    0,
  );
const finite = (model: WorldModel) =>
  model.layers.every((layer) =>
    surfaces.every((s) => {
      const array = layer[s]?.getAttribute('position').array;
      return !array || Array.from(array).every(Number.isFinite);
    }),
  );

describe('visual encodings of published values', () => {
  it('never draws a dash and always shows a trace of a positive cell', () => {
    expect(coveredFaces(null, 4000)).toBe(0);
    expect(coveredFaces(0.0006, 4000)).toBe(2);
    expect(coveredFaces(1e-7, 4000)).toBe(1);
    expect(coveredFaces(0.31, 4000)).toBe(1240);
    expect(satelliteCount(null)).toBe(0);
    expect(satelliteCount(0.015)).toBe(1);
    expect(lightShare(null)).toBe(0);
    expect(decades(null)).toBe(0);
  });

  it('keeps satellite and light encodings monotonic', () => {
    const densities = [0.001, 0.015, 1, 2, 50, 100, 1000, 1e4, 5e4, 1e6];
    const counts = densities.map((d) => satelliteCount(d));
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    const intensities = [1e-7, 0.0004, 0.025, 1, 30, 160, 450];
    const shares = intensities.map(lightShare);
    expect(shares).toEqual([...shares].sort((a, b) => a - b));
  });
});

describe('low-poly worlds', () => {
  it('authors present-day Earth and all ten scenarios', () => {
    expect(worldIds).toEqual(['present', ...allScenarioProfiles.map((p) => p.id)]);
  });

  it('builds every world deterministically, finitely and inside the shared envelope', () => {
    for (const [i, id] of worldIds.entries()) {
      const input = i === 0 ? presentSignals : signals[i - 1];
      const a = buildWorld(id, input, qualities.overview);
      const b = buildWorld(id, input, qualities.overview);
      expect(triangles(a)).toBe(triangles(b));
      expect(a.layers.map((l) => l.name)).toEqual(b.layers.map((l) => l.name));
      expect(finite(a)).toBe(true);
      expect(a.extent).toBeLessThanOrEqual(1.62);
    }
  });

  it('spends fewer triangles on the overview than on a story portrait', () => {
    for (const id of ['S1', 'S5', 'S6']) {
      const input = signals[Number(id.slice(1)) - 1];
      expect(triangles(buildWorld(id, input, qualities.overview))).toBeLessThan(
        triangles(buildWorld(id, input, qualities.story)),
      );
    }
  });

  it('draws no surface light where Table 6 reports no illumination', () => {
    for (const id of ['S9', 'S10']) {
      const model = buildWorld(id, signals[Number(id.slice(1)) - 1], qualities.overview);
      expect(model.layers.filter((l) => l.frame === 'surface').every((l) => !l.glow)).toBe(true);
    }
  });

  it('places every described landmark on its world and gives it a standalone study', () => {
    for (const [i, story] of worldStories.entries()) {
      const ids = story.landmarks.map((l) => l.id);
      expect(landmarkIds(story.id)).toEqual(ids);
      const model = buildWorld(story.id, signals[i], qualities.overview);
      const placed = new Set(model.layers.map((l) => l.landmark).filter(Boolean));
      for (const id of ids) {
        expect(placed.has(id)).toBe(true);
        const study = buildLandmark(story.id, id);
        expect(study.bounds!.size).toBeGreaterThan(0);
        expect(finite(study)).toBe(true);
      }
    }
  });
});

describe('companions and system features', () => {
  it('builds every published destination of every scenario', () => {
    for (const [i, profile] of allScenarioProfiles.entries()) {
      const system = systemPortrait(profile).art;
      for (const { body } of system.bodies) {
        const model = buildCompanion(body, profile.id, signals[i], qualities.overview);
        expect(finite(model)).toBe(true);
        expect(model.extent).toBeGreaterThanOrEqual(1);
      }
      for (const feature of system.features)
        expect(finite(buildFeature(feature, profile.id, qualities.overview))).toBe(true);
    }
  });
});
