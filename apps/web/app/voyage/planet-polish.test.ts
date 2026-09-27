import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import { lifePlans, globeRadius } from './life-plan';
import { activityMotion } from './activity-motion';
import { presentEarth } from './origin-world';
import { worlds } from './worlds';
import { lifeRoute } from './life-routes';
import { Ground } from './planet-surface';
import { earthAssetParts } from './BlenderAssets';
import { landmarkSites, landmarkGeometry } from './WorldLandmarks';
import { lifeGeometry } from './life-geometry';

it('all flying actors circle the full globe with a seamless position, heading and constant speed', () => {
  for (const art of [presentEarth, ...worlds])
    for (const mobile of [false, true]) {
      for (const job of lifePlans[art.form].filter(
        (j) => j.route === 'flight' || j.route === 'hover',
      )) {
        const radius = globeRadius(art);
        const route = lifeRoute(art, radius, mobile, job);
        const ground = new Ground(art, radius, mobile);
        try {
          expect(route.points[0].distanceTo(route.points[192])).toBeLessThan(1e-6);
          expect(Math.abs(route.rotations[0].dot(route.rotations[192]))).toBeGreaterThan(0.999999);
          expect(
            route.points[0].clone().normalize().dot(route.points[96].clone().normalize()),
          ).toBeLessThan(-0.99999);
          for (let i = 0; i < 192; i++) {
            const p = route.points[i];
            expect(p.length() - ground.project(p.clone().normalize(), 0).length()).toBeGreaterThan(
              radius * 0.2,
            );
            const facing = new Vector3(0, 0, -1).applyQuaternion(route.rotations[i]);
            const tangent = route.points[(i + 1) % 192]
              .clone()
              .sub(route.points[(i + 191) % 192])
              .normalize();
            expect(facing.dot(tangent)).toBeGreaterThan(0.99999);
            const motion = activityMotion(job, (i * job.travel) / 48);
            expect(motion.yaw).toBe(0);
            expect(motion.at).toBeNull();
            expect(motion.speed).toBeCloseTo(1 / (job.travel * 2), 12);
          }
          const before = activityMotion(job, job.travel * 2 - 0.001);
          const after = activityMotion(job, job.travel * 2 + 0.001);
          expect(1 - before.u + after.u).toBeLessThan(0.0001);
        } finally {
          ground.dispose();
          route.stops?.dispose();
        }
      }
    }
});

it('the entire moving hull stays over water, including the bow and stern near berths', () => {
  for (const art of [presentEarth, ...worlds]) {
    const radius = globeRadius(art);
    const ground = new Ground(art, radius, false);
    try {
      for (const job of lifePlans[art.form].filter((j) => j.route === 'water')) {
        const route = lifeRoute(art, radius, false, job);
        try {
          for (let i = 0; i <= 192; i += 8) {
            for (const side of [-1, 1])
              for (const end of [-1, 1]) {
                const hull = new Vector3(
                  side * 0.064,
                  0,
                  end * (job.subject.kind === 'sail-barge' ? 0.24 : 0.19),
                )
                  .multiplyScalar(job.size)
                  .applyQuaternion(route.rotations[i])
                  .add(route.points[i])
                  .normalize();
                expect(
                  ground.project(hull, 0).length(),
                  `${art.id} ${job.subject.kind} sample ${i}`,
                ).toBeLessThan(radius * 0.985);
              }
          }
        } finally {
          route.stops?.dispose();
        }
      }
    } finally {
      ground.dispose();
    }
  }
});

it('opening Earth includes a working boat and sailboat, and native Blender transport facilities', () => {
  expect(lifePlans.origin.filter((job) => job.route === 'water')).toHaveLength(2);
  expect(earthAssetParts(presentEarth)).toEqual(
    expect.arrayContaining([
      'Activity_regional-plane_stops',
      'Activity_research-skiff_stops',
      'Activity_cutter_stops',
      'Life_vessel_research-skiff_body',
      'Life_vessel_cutter_body',
    ]),
  );
});

it('aircraft geometry clears settlement roofs around the complete globe', () => {
  for (const art of [presentEarth, worlds[2]])
    for (const mobile of [false, true]) {
      const radius = globeRadius(art);
      const job = lifePlans[art.form].find((j) => j.route === 'flight')!;
      const route = lifeRoute(art, radius, mobile, job);
      const aircraft = lifeGeometry(job.subject);
      const vertices = aircraft.getAttribute('position');
      const point = new Vector3();
      const collisions: string[] = [];
      try {
        for (const site of landmarkSites(art, radius, mobile)) {
          const geometry = landmarkGeometry(site.kind, site.variant);
          geometry.computeBoundingBox();
          const bounds = geometry.boundingBox!.clone().expandByScalar(0.005);
          geometry.dispose();
          const inverse = site.matrix.clone().invert();
          for (let i = 0; i <= 192; i++) {
            const orientation = route.rotations[i];
            const location = route.points[i];
            for (let v = 0; v < vertices.count; v++) {
              point
                .fromBufferAttribute(vertices, v)
                .multiplyScalar(radius * job.size)
                .applyQuaternion(orientation)
                .add(location)
                .applyMatrix4(inverse);
              if (bounds.containsPoint(point)) {
                collisions.push(`${art.id} ${mobile ? 'mobile' : 'desktop'} ${site.kind} ${i}`);
                break;
              }
            }
          }
        }
        expect(collisions).toEqual([]);
      } finally {
        aircraft.dispose();
        route.stops?.dispose();
      }
    }
});
