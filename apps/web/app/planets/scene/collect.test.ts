import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { presentSignals } from '../../../lib/world-signals';
import { buildWorld } from '../catalog';
import { buildFaces } from '../globe';
import { qualities } from '../model';
import { propGroup, propScale, U } from '../props/library';
import { Props, type Lane } from './collect';
import { offset, Surface } from './surface';

const up = new THREE.Vector3(0, 0, 1);
const at = (heading: number, distance: number) => offset(up, heading, distance);

describe('lanes', () => {
  // One street running east from the pole, a little over a person wide.
  const lane: Lane = {
    points: Array.from({ length: 40 }, (_, i) => at(0, i * 0.004)),
    half: 0.6 * U,
  };
  const kinds = (props: Props) =>
    props
      .finish('surface', { lanes: [lane] })
      .map((group) => `${group.kind}:${group.matrices.length / 16}`)
      .sort();

  it('keeps buildings and trees off the roadway but beside it', () => {
    const props = new Props();
    props.add('house', at(0, 0.04), null);
    props.add('oak', at(0, 0.08), null);
    // The same two, set back to one side of the street.
    props.add('house', offset(at(0, 0.04), Math.PI / 2, 4 * U), null);
    props.add('oak', offset(at(0, 0.08), Math.PI / 2, 2 * U), null);
    expect(kinds(props)).toEqual(['house:1', 'oak:1']);
  });

  it('lets people stand in a street and keeps works placed there on purpose', () => {
    const props = new Props();
    props.add('person-0', at(0, 0.02), null);
    props.add('lamp', at(0, 0.06), null, 1, undefined, true);
    props.add('lamp', at(0, 0.1), null);
    expect(kinds(props)).toEqual(['lamp:1', 'person-0:1']);
  });
});

describe('open water', () => {
  it('gives ships a berth from every coast', () => {
    const faces = buildFaces({
      detail: 9,
      relief: 0.05,
      steps: 6,
      // One round island on the +z pole, sea everywhere else.
      height: (dir) => (dir.z > 0.9 ? 0.5 : -0.5),
      flatten: true,
    });
    const surface = new Surface(faces);
    expect(surface.land(up)).toBe(true);
    const coast = Math.acos(0.9);
    // Just off the beach is water, but not open water; well out to sea is.
    expect(surface.land(at(0, coast + 0.08))).toBe(false);
    expect(surface.offshore(at(0, coast + 0.08), 0.12)).toBe(false);
    expect(surface.offshore(at(0, coast + 0.4), 0.12)).toBe(true);
    expect(surface.offshore(up, 0.12)).toBe(false);
  });
});

describe('toy proportions', () => {
  it('draws figures and vehicles larger than life, never larger than the buildings', () => {
    for (const kind of ['person-0', 'deer', 'car', 'robot', 'mech', 'whale', 'house', 'oak']) {
      const scale = propScale(kind);
      expect(scale).toBeGreaterThanOrEqual(1);
      expect(scale).toBeLessThanOrEqual(2);
    }
    expect(propScale('house')).toBe(1);
    expect(propScale('robot')).toBeGreaterThan(propScale('person-0'));
  });
});

describe('the opening Earth', () => {
  const world = buildWorld('present', presentSignals, qualities.story);
  const count = (test: (kind: string) => boolean) =>
    world.instances
      .filter((group) => test(group.kind))
      .reduce((sum, group) => sum + group.matrices.length / 16, 0);

  it('has towns of several homes, not a road and two buildings', () => {
    const homes = count((kind) => /^(house|cottage|apartment|tower|skyscraper)/.test(kind));
    expect(homes).toBeGreaterThanOrEqual(18);
    const structures = count((kind) => propGroup(kind) === 'structure');
    expect(structures).toBeLessThanOrEqual(60);
    // Homes outnumber the infrastructure that serves them.
    expect(homes).toBeGreaterThan(count((kind) => /^(pylon|harbor-crane|containers)$/.test(kind)));
  });

  it('flies aircraft clear of the clouds and every skyline', () => {
    const planes = world.movers.filter((group) => group.kind === 'plane');
    expect(planes.length).toBeGreaterThan(0);
    for (const group of planes)
      for (const route of group.routes)
        for (let p = 0; p < route.points.length; p += 3) {
          const r = Math.hypot(route.points[p], route.points[p + 1], route.points[p + 2]);
          expect(r).toBeGreaterThan(1.19);
          expect(r).toBeLessThan(1.27);
        }
  });
});
