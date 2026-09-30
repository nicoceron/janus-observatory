import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  landform,
  quarryAxis,
  quarryBase,
  quarryDepth,
  quarryOutline,
  quarrySite,
  terrainGeometry,
} from './terrain';
import { Sculpture, surface, wrapOnGlobe } from './sculpture';
import { presentEarth } from './origin-world';
import { worlds } from './worlds';

const faces = (geometry: THREE.BufferGeometry) => {
  const p = geometry.attributes.position;
  return Array.from({ length: p.count / 3 }, (_, f) =>
    [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(p, f * 3 + k)),
  );
};

describe('contour coastlines', () => {
  it('keeps raised land on the land side of the authored shoreline, on every world and tier', () => {
    for (const art of [presentEarth, ...worlds].filter(
      // Carved pits and rifts deliberately lower land below the plate.
      (world) => world.form !== 'extraction' && world.form !== 'fractured',
    ))
      for (const mobile of [false, true]) {
        const geometry = terrainGeometry(art, mobile);
        for (const face of faces(geometry)) {
          const radii = face.map((v) => v.length());
          // Plate facets only: cliff walls intentionally span both levels.
          if (Math.min(...radii) < 1.02) continue;
          for (const v of face) {
            const n = v.clone().normalize();
            // Stepped facets used to lift whole triangles whose corners lay far out at sea.
            expect(landform(n.x, n.y, n.z, art.seed) - art.seaLevel).toBeGreaterThan(-0.05);
          }
        }
        geometry.dispose();
      }
  });

  it('closes every coast segment with a sea-facing cliff between plate and ocean', () => {
    const geometry = terrainGeometry(presentEarth, false);
    const walls = faces(geometry).filter((face) => {
      const radii = face.map((v) => v.length());
      return Math.max(...radii) > 1.02 && Math.min(...radii) < 0.93;
    });
    expect(walls.length).toBeGreaterThan(100);
    for (const [a, b, c] of walls) {
      const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      // Walls stand upright: their normal is tangent to the globe, never facing up or down.
      expect(Math.abs(normal.dot(a.clone().add(b).add(c).normalize()))).toBeLessThan(0.35);
    }
    geometry.dispose();
  });
});

describe('S2 open pit', () => {
  const art = worlds.find((world) => world.form === 'extraction')!;
  const turn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), quarryAxis);
  const ex = new THREE.Vector3(1, 0, 0).applyQuaternion(turn),
    ez = new THREE.Vector3(0, 0, 1).applyQuaternion(turn);
  const toGlobe = (x: number, z: number) =>
    quarryAxis
      .clone()
      .multiplyScalar(1.025)
      .addScaledVector(ex, x)
      .addScaledVector(ez, z)
      .normalize();

  it('carves the ground beneath every bench and leaves the surrounding rim untouched', () => {
    const base = quarryBase(art);
    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      // Beyond the outline the rim is original terrain.
      expect(quarryDepth(toGlobe(...quarryOutline(0.51 * 1.06, angle)))).toBe(0);
      for (const fraction of [0.95, 0.7, 0.4]) {
        const n = toGlobe(...quarryOutline(0.51 * fraction, angle));
        const benchTop = base - ((1 - fraction) * 0.51 * 0.04) / 0.079;
        const ground =
          1.025 + Math.max(0, landform(n.x, n.y, n.z, art.seed) - art.seaLevel) * art.relief * 0.45;
        expect(ground - quarryDepth(n)).toBeLessThan(benchTop);
      }
    }
  });

  it('wraps flat pit construction onto the globe at its local height', () => {
    const s = new Sculpture();
    wrapOnGlobe(s, surface(...quarrySite, 1.025), 1.03, (local) =>
      local.box([0.02, 0.02, 0.02], '#ffffff', [0.45, 0.05, -0.2]),
    );
    const geometry = s.finish();
    const center = new THREE.Vector3();
    geometry.computeBoundingBox();
    geometry.boundingBox!.getCenter(center);
    expect(center.length()).toBeCloseTo(1.08, 2);
    geometry.dispose();
  });
});
