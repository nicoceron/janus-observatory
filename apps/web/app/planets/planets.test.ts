import { describe, expect, it } from 'vitest';
import { allScenarioProfiles } from '../../lib/canonical-core';
import { systemPortrait } from '../../lib/system-portrait';
import { presentSignals, worldSignals } from '../../lib/world-signals';
import * as THREE from 'three';
import { buildCompanion, buildFeature } from './bodies';
import { buildLandmark, buildWorld, landmarkIds, worldIds } from './catalog';
import { coveredFaces, decades, lightShare, satelliteCount } from './encoding';
import { surfaces } from './materials';
import { qualities, type WorldModel } from './model';
import { propFootprint } from './props/library';
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
  }, 30000);

  it('spends fewer triangles on the overview than on a story portrait', () => {
    for (const id of ['S1', 'S5', 'S6']) {
      const input = signals[Number(id.slice(1)) - 1];
      expect(triangles(buildWorld(id, input, qualities.overview))).toBeLessThan(
        triangles(buildWorld(id, input, qualities.story)),
      );
    }
  }, 30000);

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
  }, 30000);
});

describe('inhabited worlds', () => {
  const kinds = (model: WorldModel) => [
    ...model.instances.map((g) => g.kind),
    ...model.movers.map((g) => g.kind),
  ];
  const people = /^(person|walker|worker|guard|robed|porter|enhanced|astronaut)/;
  const plants =
    /^(oak|pine|spruce|birch|palm|bush|shrub|cactus|dead-tree|bio-tree|bio-shroom|flowers|grass|cypress)/;
  const animals = /^(deer|bison|cow|sheep|horse|bird|whale|fish)/;

  it('gives every Earth citizens, buildings and plants, and moving life at story quality', () => {
    for (const [i, id] of worldIds.entries()) {
      const model = buildWorld(id, i === 0 ? presentSignals : signals[i - 1], qualities.story);
      const all = kinds(model);
      expect(
        all.some((k) => people.test(k)),
        `${id} citizens`,
      ).toBe(true);
      expect(
        all.some((k) => plants.test(k)),
        `${id} plants`,
      ).toBe(true);
      expect(model.movers.length, `${id} movers`).toBeGreaterThan(0);
      // A diorama of a few large models, not a crowd of specks.
      const statics = model.instances.reduce((n, g) => n + g.matrices.length / 16, 0);
      const moving = model.movers.reduce((n, g) => n + g.route.length, 0);
      expect(statics, `${id} props`).toBeGreaterThan(40);
      expect(statics, `${id} props`).toBeLessThanOrEqual(250);
      expect(moving, `${id} movers`).toBeLessThanOrEqual(56);
      if (['present', 'S3', 'S4', 'S7', 'S9', 'S10'].includes(id))
        expect(
          all.some((k) => animals.test(k)),
          `${id} animals`,
        ).toBe(true);
    }
  }, 60000);

  it('keeps the ten-world overview free of citizens and traffic', () => {
    for (const [i, id] of worldIds.entries()) {
      const model = buildWorld(id, i === 0 ? presentSignals : signals[i - 1], qualities.overview);
      expect(model.movers).toEqual([]);
      expect(kinds(model).some((k) => people.test(k))).toBe(false);
    }
  }, 30000);

  it('keeps landmarks but no props at the software-rendering tier', () => {
    for (const [i, story] of worldStories.entries()) {
      const model = buildWorld(story.id, signals[i], qualities.minimal);
      expect(model.instances).toEqual([]);
      expect(model.movers).toEqual([]);
      const placed = new Set(model.layers.map((l) => l.landmark).filter(Boolean));
      for (const landmark of story.landmarks) expect(placed.has(landmark.id)).toBe(true);
    }
  }, 30000);

  it('never lets two props overlap', () => {
    for (const id of ['present', 'S1', 'S3', 'S6']) {
      const i = worldIds.indexOf(id);
      const model = buildWorld(id, i === 0 ? presentSignals : signals[i - 1], qualities.story);
      const placed: { at: THREE.Vector3; r: number }[] = [];
      const m = new THREE.Matrix4();
      for (const group of model.instances)
        for (let k = 0; k < group.matrices.length; k += 16) {
          m.fromArray(group.matrices, k);
          const scale = new THREE.Vector3().setFromMatrixColumn(m, 0).length();
          placed.push({
            at: new THREE.Vector3().setFromMatrixPosition(m),
            r: propFootprint(group.kind) * scale,
          });
        }
      for (let a = 0; a < placed.length; a++)
        for (let b = a + 1; b < placed.length; b++)
          expect(placed[a].at.distanceTo(placed[b].at)).toBeGreaterThanOrEqual(
            (placed[a].r + placed[b].r) * 0.8 - 1e-9,
          );
    }
  }, 30000);

  it('places every movers route in the planet frame near the surface', () => {
    const model = buildWorld('S3', signals[2], qualities.story);
    for (const group of model.movers)
      for (const route of group.routes)
        for (let p = 0; p < route.points.length; p += 3) {
          const r = Math.hypot(route.points[p], route.points[p + 1], route.points[p + 2]);
          expect(r).toBeGreaterThan(0.97);
          expect(r).toBeLessThan(1.2);
        }
  });
});

describe('companions and system features', () => {
  it('builds inhabited stations where a scenario has surface activity', () => {
    for (const [scenario, body] of [
      ['S2', 'Moon'],
      ['S5', 'Mars'],
      ['S6', 'Mars'],
    ] as const) {
      const i = Number(scenario.slice(1)) - 1;
      const model = buildCompanion(body, scenario, signals[i], qualities.compact);
      expect(model.instances.length, `${scenario} ${body}`).toBeGreaterThan(2);
      expect(model.movers.length, `${scenario} ${body}`).toBeGreaterThan(0);
    }
  });

  it('works every published asteroid, outer and Kuiper feature with a set piece and traffic', () => {
    for (const [i, profile] of allScenarioProfiles.entries()) {
      for (const feature of systemPortrait(profile).art.features) {
        if (feature === 'solar') continue;
        const model = buildFeature(feature, profile.id, qualities.story);
        expect(model.instances.length, `${profile.id} ${feature} props`).toBeGreaterThan(1);
        expect(model.movers.length, `${profile.id} ${feature} ships`).toBeGreaterThan(0);
      }
      void i;
    }
  }, 30000);

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
  }, 30000);
});
