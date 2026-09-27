import { describe, it, expect } from 'vitest';
import { worlds } from './worlds';
import { presentEarth } from './Planet';
import { lifePlans, globeRadius } from './life-plan';
import { lifeRoute } from './life-routes';
import { activityMotion } from './activity-motion';
import { lifeGeometry } from './life-geometry';
import { Ground } from './planet-surface';
import { objectSelections, landmarkKinds } from './inspection';
import { objectFamilies } from './ScenarioBiomes';
import { landmarkSites } from './WorldLandmarks';
import type { LifeSubject } from './LifeActor';
import { Vector3 } from 'three';
describe('living world construction', () => {
  it('connects distinct destinations with supported open paths, continuous arrivals and genuine task pauses', () => {
    for (const art of [presentEarth, ...worlds])
      for (const mobile of [false, true]) {
        const scale = globeRadius(art),
          ground = new Ground(art, scale, mobile, art.form === 'engineered' ? 'shell' : 'terrain');
        try {
          for (const job of lifePlans[art.form].filter(
            (j) => j.route !== 'flight' && j.route !== 'hover',
          )) {
            const route = lifeRoute(art, scale, mobile, job);
            try {
              expect(route.points[0].distanceTo(route.points.at(-1)!)).toBeGreaterThan(0.15);
              expect(route.points.length).toBe(193);
              if (job.route === 'road') {
                const actor = lifeGeometry(job.subject);
                actor.computeBoundingBox();
                expect(route.width * 2).toBeGreaterThan(
                  actor.boundingBox!.getSize(new Vector3()).x * job.size,
                );
                actor.dispose();
                const sites = landmarkSites(art, scale, mobile);
                for (const [stop, index] of [
                  [job.from, 0],
                  [job.to, 192],
                ] as const) {
                  const site = sites.find((site) => site.kind === stop.landmark);
                  if (!site || !stop.access) continue;
                  const entrance = new Vector3(stop.access[0], 0, stop.access[1])
                    .applyMatrix4(site.matrix)
                    .normalize();
                  expect(
                    route.points[index].clone().normalize().distanceTo(entrance),
                    art.id + ' entrance',
                  ).toBeLessThan(0.00001);
                }
              }
              if (job.route === 'surface') expect(route.road).toBeNull();
              for (let i = 0; i < route.points.length; i++) {
                const p = route.points[i];
                expect(p.toArray().every(Number.isFinite)).toBe(true);
                if (i) {
                  expect(p.distanceTo(route.points[i - 1])).toBeLessThan(0.05);
                  expect(Math.abs(route.rotations[i].dot(route.rotations[i - 1]))).toBeGreaterThan(
                    0.45,
                  );
                }
                const support = ground.project(p.clone().normalize(), 0).length();
                expect(p.length(), art.id + ' ' + job.subject.kind).toBeGreaterThan(support);
                if (job.route === 'water') expect(support).toBeLessThan(scale * 0.981);
                if (job.route === 'road' || job.route === 'wildlife')
                  expect(support).toBeGreaterThan(
                    scale *
                      (art.form === 'fractured' ? 0.869 : art.form === 'engineered' ? 0.8 : 0.989),
                  );
              }
              for (const t of [
                job.travel,
                job.travel + job.dwell,
                2 * job.travel + job.dwell,
                2 * (job.travel + job.dwell),
              ]) {
                expect(
                  Math.abs(activityMotion(job, t - 0.0001).u - activityMotion(job, t + 0.0001).u),
                ).toBeLessThan(0.0001);
              }
              const stop = activityMotion(job, job.travel + job.dwell * 0.3);
              expect(stop.u).toBe(1);
              expect(stop.speed).toBe(0);
              expect(stop.work).toBeGreaterThan(0.5);
              expect(stop.at).toBe('to');
              expect(activityMotion(job, job.travel * 0.5).speed).toBeGreaterThan(0);
            } finally {
              route.road?.dispose();
              route.stops?.dispose();
            }
          }
        } finally {
          ground.dispose();
        }
      }
  });
  it('curates a different working cast per scenario and restores flight without filling quiet Earth with traffic', () => {
    const subjects = worlds.flatMap((art) =>
      lifePlans[art.form].map((job) => job.subject.type + ':' + job.subject.kind),
    );
    expect(new Set(subjects).size).toBe(subjects.length);
    expect(lifePlans.origin.some((job) => job.subject.type === 'aircraft')).toBe(true);
    expect(lifePlans.arcadia.some((job) => job.subject.type === 'aircraft')).toBe(true);
    expect(lifePlans['machine-swarm']).toHaveLength(0);
  });
  it('builds finite, separately framed vessels, vehicles and anatomy and admits each focal family', () => {
    const checked = new Set<string>();
    worlds.forEach((art, i) => {
      expect(landmarkKinds[i]).toEqual(objectFamilies[art.form as keyof typeof objectFamilies]);
      expect(landmarkSites(art, globeRadius(art), false).length, art.id).toBe(
        landmarkKinds[i].length,
      );
      for (const id of objectSelections(i).filter((id) =>
        /^(animal|vehicle|vessel|aircraft|machine):/.test(id),
      )) {
        if (checked.has(id)) continue;
        checked.add(id);
        const g = lifeGeometry({ type: id.split(':')[0], kind: id.split(':')[1] } as LifeSubject);
        try {
          expect(g.attributes.position.count / 3).toBeLessThan(4000);
          for (const name of ['position', 'normal', 'color'])
            expect(g.attributes[name].array.every(Number.isFinite), id).toBe(true);
          g.computeBoundingBox();
          expect(g.boundingBox!.isEmpty(), id).toBe(false);
        } finally {
          g.dispose();
        }
      }
    });
    expect(checked.size).toBeGreaterThan(12);
  });
});
