import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { allScenarioProfiles } from '../../../lib/canonical-core';
import { worldSignals } from '../../../lib/world-signals';
import { buildWorld } from '../catalog';
import { direction } from '../continents';
import { coveredFaces, decades } from '../encoding';
import { buildFaces, earthHeight, paintEarth, type Face } from '../globe';
import { qualities, WorldContext, type Quality } from '../model';
import { offset } from '../scene/surface';
import { at, companies, crops, cuts, gather, row, s2, settle } from './s2';

const signals = allScenarioProfiles.map(worldSignals).find((profile) => profile.id === 'S2')!;
const earth = signals.bodies.Earth;

/** The recipe run on its own globe, as `buildEarthWorld` runs it, so the ground can be read. */
function stage(quality: Quality) {
  const faces = buildFaces({
    detail: quality.detail,
    relief: s2.relief,
    steps: 6,
    height: earthHeight(s2.climate.sea),
    flatten: true,
    shore: 0.012,
  });
  paintEarth(faces, s2.climate, s2.palette);
  const land = faces.filter((face) => face.land && face.biome !== 'ice').length;
  s2.decorate(new WorldContext(faces, quality, s2.seed), signals);
  return { faces, land };
}

/** Share of a set of faces that touch another face of the set. */
function joined(faces: Face[], set: Face[]) {
  const member = new Set(set.map((face) => face.index));
  return set.filter((face) => face.neighbours.some((n) => member.has(n))).length / set.length;
}

describe('S2 ground', () => {
  it('digs and ploughs exactly the published totals, gathered into districts', () => {
    for (const quality of [qualities.overview, qualities.story]) {
      const { faces, land } = stage(quality);
      const worked = faces.filter((face) => face.used && cuts.includes(face.tone));
      const fields = faces.filter((face) => face.used && crops.includes(face.tone));
      // The encodings of the recipe before it was staged: restaging moves the ground, not the sums.
      expect(worked.length).toBe(coveredFaces(earth.surface_modification, faces.length));
      expect(fields.length).toBe(
        Math.round(land * decades(earth.agricultural_pollution, 0.1, 100) * 0.35),
      );
      // Scars and estates, not a checkerboard: nearly every face touches another of its kind.
      expect(joined(faces, worked)).toBeGreaterThan(0.9);
      expect(joined(faces, fields)).toBeGreaterThan(0.9);
    }
  }, 30000);

  it('gathers a claim round its seeds without changing its size', () => {
    const faces = buildFaces({
      detail: 9,
      relief: 0.05,
      steps: 6,
      height: (dir) => (dir.z > 0.2 ? 0.5 : -0.5),
      flatten: true,
    });
    const seeds = [
      { up: new THREE.Vector3(0, 0, 1), pull: 1 },
      { up: new THREE.Vector3(0.6, 0, 0.8), pull: 0.6 },
    ];
    const claimed = gather(faces, 60, seeds, (face) => (face.land ? 0 : null));
    expect(claimed).toHaveLength(60);
    expect(claimed.every((face) => face.land)).toBe(true);
    expect(joined(faces, claimed)).toBe(1);
    // The stronger seed holds the wider region.
    const near = (seed: THREE.Vector3) =>
      claimed.filter((face) => face.up.angleTo(seed) < face.up.angleTo(seeds[0].up) + 1e-9);
    expect(near(seeds[0].up).length).toBeGreaterThan(30);
  });
});

describe('S2 staging', () => {
  const model = buildWorld('S2', signals, qualities.story);
  const count = (kind: string) =>
    (model.instances.find((group) => group.kind === kind)?.matrices.length ?? 0) / 16;

  it('keeps its whole cast at story quality: nothing staged is thinned away', () => {
    // One hero per district.
    expect(count('excavator')).toBe(1);
    expect(count('launch-site')).toBe(1);
    expect(count('titan')).toBe(2);
    // Repeated pieces stand in complete rows.
    expect(count('silo')).toBe(3);
    expect(count('oil-tank')).toBe(3);
    expect(count('derrick')).toBe(3);
    // Every company has its guard and its sign.
    expect(count('mech')).toBe(companies.length);
    expect(count('billboard')).toBe(companies.length);
    // Far fewer structures than the tier's budget of sixty, so the declutter has nothing to thin.
    const structures = [
      'excavator',
      'launch-site',
      'titan',
      'silo',
      'oil-tank',
      'derrick',
      'billboard',
      'shanty-dark',
      'market',
      'tent',
      'dock',
      'dish',
      'mining-rig',
      'checkpoint',
      'pipe-rack',
    ].reduce((sum, kind) => sum + count(kind), 0);
    expect(structures).toBeLessThanOrEqual(48);
  });

  it('keeps each company colour on its own territory', () => {
    const m = new THREE.Matrix4();
    const position = new THREE.Vector3();
    for (const company of companies) {
      const colour = new THREE.Color(company.colour);
      const home = direction(company.lat, company.lon);
      let seen = 0;
      for (const group of model.instances)
        for (let i = 0; i < group.matrices.length / 16; i++) {
          const [r, g, b] = group.tints.subarray(i * 3, i * 3 + 3);
          if (Math.abs(r - colour.r) + Math.abs(g - colour.g) + Math.abs(b - colour.b) > 1e-4)
            continue;
          position.setFromMatrixPosition(m.fromArray(group.matrices, i * 16)).normalize();
          expect(position.angleTo(home), `${group.kind} in ${company.colour}`).toBeLessThan(0.5);
          seen++;
        }
      // At least its guard mech and its sign.
      expect(seen).toBeGreaterThanOrEqual(2);
    }
  });

  it('lines repeated pieces up in rows', () => {
    const pieces = row('silo', 3, [2, -1], Math.PI / 2, 1.7, 0.4, 0.8);
    expect(pieces.map(([kind]) => kind)).toEqual(['silo', 'silo', 'silo']);
    // One heading and one size for the whole row, evenly pitched along it.
    expect(new Set(pieces.map(([, , , a]) => a)).size).toBe(1);
    expect(new Set(pieces.map(([, , , , size]) => size)).size).toBe(1);
    pieces.forEach(([, x, y], i) => {
      expect(x).toBeCloseTo(2);
      expect(y).toBeCloseTo(-1 + 1.7 * i);
    });
    // On the globe the three silos of the ore quay stand in one line, evenly spaced.
    const silos = model.instances.find((group) => group.kind === 'silo')!;
    const m = new THREE.Matrix4();
    const [a, b, c] = [0, 1, 2].map((i) =>
      new THREE.Vector3().setFromMatrixPosition(m.fromArray(silos.matrices, i * 16)),
    );
    expect(a.distanceTo(b)).toBeCloseTo(b.distanceTo(c), 2);
    expect(a.distanceTo(c)).toBeCloseTo(a.distanceTo(b) + b.distanceTo(c), 2);
  });

  it('turns a district until its cast stands on land', () => {
    // One round island on the +z pole, sea everywhere else.
    const faces = buildFaces({
      detail: 9,
      relief: 0.05,
      steps: 6,
      height: (dir) => (dir.z > 0.9 ? 0.5 : -0.5),
      flatten: true,
    });
    const world = new WorldContext(faces, qualities.overview, 1);
    // A seat near the east coast: four units ahead is sea when it faces east.
    const centre = offset(new THREE.Vector3(0, 0, 1), 0, 0.32);
    const cast = (): [number, number][] => [[4, 0]];
    expect(world.surface.land(at({ centre, turn: 0 }, 4, 0))).toBe(false);
    const swung = settle(world, centre, 0, 1, [0, 1, -1, 2, -2, Math.PI], cast);
    expect(swung.turn).not.toBe(0);
    expect(world.surface.land(at({ centre, turn: swung.turn }, 4, 0))).toBe(true);
    // A district on a road keeps its heading.
    expect(settle(world, centre, 0, 1, [0], cast)).toEqual({ turn: 0, flank: 1 });
  });
});
