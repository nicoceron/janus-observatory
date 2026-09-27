import { expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { presentEarth } from './origin-world';
import { worlds } from './worlds';
import { lifePlans, globeRadius } from './life-plan';
import { lifeRoute } from './life-routes';
import { waterTurningRadius } from './plan-life-route';
import { Ground } from './planet-surface';
import { lifeGeometry } from './life-geometry';
import { buildWorldGeometry } from './WorldStructures';

for (const mobile of [false, true]) {
  it(`reserves nonintersecting swept waterways independent of boat timing (${mobile ? 'mobile' : 'desktop'})`, () => {
    const jobs = lifePlans.origin.filter((job) => job.route === 'water');
    const routes = jobs.map((job) => lifeRoute(presentEarth, 1, mobile, job));
    try {
      for (const route of routes) expect(route.length).toBeGreaterThan(0.45);
      const required = waterTurningRadius(jobs[0]) + waterTurningRadius(jobs[1]);
      let minimum = Infinity;
      for (const a of routes[0].points)
        for (const b of routes[1].points) minimum = Math.min(minimum, a.distanceTo(b));
      // Includes between-sample interpolation, roll and any heading during the turn.
      expect(minimum).toBeGreaterThan(required + 0.04);
    } finally {
      routes.forEach((route) => route.stops?.dispose());
    }
  });

  it(`keeps every landing and coast outside the full hull turning envelope (${mobile ? 'mobile' : 'desktop'})`, () => {
    for (const art of [presentEarth, ...worlds]) {
      const jobs = lifePlans[art.form].filter((job) => job.route === 'water');
      if (!jobs.length) continue;
      const radius = globeRadius(art);
      const routes = jobs.map((job) => lifeRoute(art, radius, mobile, job));
      const ground = new Ground(art, radius, mobile);
      try {
        for (const [i, route] of routes.entries()) {
          const envelope = waterTurningRadius(jobs[i]);
          const directions = route.points.map((p) => p.clone().normalize());
          for (const other of routes) {
            const vertices = other.stops!.getAttribute('position');
            let minimum = Infinity;
            for (let v = 0; v < vertices.count; v += 3) {
              const a = new Vector3().fromBufferAttribute(vertices, v);
              const b = new Vector3().fromBufferAttribute(vertices, v + 1);
              const c = new Vector3().fromBufferAttribute(vertices, v + 2);
              // Faces and their edges, not just the corners of a pier.
              for (const p of [
                a,
                b,
                c,
                a.clone().add(b).multiplyScalar(0.5),
                b.clone().add(c).multiplyScalar(0.5),
                c.clone().add(a).multiplyScalar(0.5),
                a
                  .clone()
                  .add(b)
                  .add(c)
                  .multiplyScalar(1 / 3),
              ]) {
                p.normalize();
                for (const n of directions) minimum = Math.min(minimum, n.distanceTo(p));
              }
            }
            expect(minimum, `${art.id} ${jobs[i].subject.kind} pier clearance`).toBeGreaterThan(
              envelope + 0.004,
            );
          }
          for (let index = 0; index < directions.length; index += 4) {
            const n = directions[index];
            const east = new Vector3().crossVectors(n, new Vector3(0, 1, 0)).normalize();
            const north = new Vector3().crossVectors(east, n).normalize();
            for (let angle = 0; angle < 32; angle++) {
              const p = n
                .clone()
                .addScaledVector(east, Math.cos((angle * Math.PI) / 16) * envelope)
                .addScaledVector(north, Math.sin((angle * Math.PI) / 16) * envelope)
                .normalize();
              expect(
                ground.project(p, 0).length(),
                `${art.id} ${jobs[i].subject.kind} coast ${index}`,
              ).toBeLessThan(radius * 0.985);
            }
          }
        }
      } finally {
        ground.dispose();
        routes.forEach((route) => route.stops?.dispose());
      }
    }
  });
}

it('all pairs of moving actors have spatial clearance throughout their routes in both tiers', () => {
  for (const art of [presentEarth, ...worlds])
    for (const mobile of [false, true]) {
      const jobs = lifePlans[art.form];
      const routes = jobs.map((job) => lifeRoute(art, globeRadius(art), mobile, job));
      const radii = jobs.map((job) => {
        const geometry = lifeGeometry(job.subject);
        const vertices = geometry.getAttribute('position');
        const point = new Vector3();
        let radius = 0;
        for (let i = 0; i < vertices.count; i++)
          radius = Math.max(radius, point.fromBufferAttribute(vertices, i).length());
        geometry.dispose();
        return radius * job.size + 0.025;
      });
      try {
        for (let i = 0; i < jobs.length; i++)
          for (let j = i + 1; j < jobs.length; j++) {
            let minimum = Infinity;
            for (const a of routes[i].points)
              for (const b of routes[j].points) minimum = Math.min(minimum, a.distanceTo(b));
            expect(
              minimum,
              `${art.id} ${mobile} ${jobs[i].subject.kind}/${jobs[j].subject.kind}`,
            ).toBeGreaterThan(radii[i] + radii[j] + 0.01);
          }
      } finally {
        routes.forEach((route) => {
          route.stops?.dispose();
          route.road?.dispose();
        });
      }
    }
});

it('shoreline scene details never enter a moving or turning boat hull', () => {
  const hits: string[] = [];
  const local = new Vector3(),
    up = new Vector3(0, 1, 0);
  for (const art of [presentEarth, ...worlds])
    for (const mobile of [false, true]) {
      const jobs = lifePlans[art.form].filter((job) => job.route === 'water');
      if (!jobs.length) continue;
      const scenery = buildWorldGeometry(art, globeRadius(art), mobile);
      const vertices = scenery.getAttribute('position');
      try {
        for (const job of jobs) {
          const route = lifeRoute(art, globeRadius(art), mobile, job);
          const geometry = lifeGeometry(job.subject);
          geometry.computeBoundingBox();
          const hull = geometry.boundingBox!.clone().expandByScalar(0.005);
          try {
            for (let i = 0; i <= 192; i += 4) {
              const headings =
                i === 0 || i === 192
                  ? Array.from({ length: 24 }, (_, j) => (j * Math.PI) / 12)
                  : [0, Math.PI];
              for (const angle of headings) {
                const rotation = route.rotations[i]
                  .clone()
                  .multiply(new Quaternion().setFromAxisAngle(up, angle));
                const inverse = new Matrix4()
                  .compose(route.points[i], rotation, new Vector3().setScalar(job.size))
                  .invert();
                for (let v = 0; v < vertices.count; v++) {
                  local.fromBufferAttribute(vertices, v).applyMatrix4(inverse);
                  if (hull.containsPoint(local)) {
                    hits.push(
                      `${art.id} ${mobile} ${job.subject.kind} ${i} ${angle.toFixed(2)} vertex=${v} local=${local.toArray().map((n) => n.toFixed(3))} world=${new Vector3()
                        .fromBufferAttribute(vertices, v)
                        .toArray()
                        .map((n) => n.toFixed(3))}`,
                    );
                    break;
                  }
                }
              }
            }
          } finally {
            geometry.dispose();
            route.stops?.dispose();
          }
        }
      } finally {
        scenery.dispose();
      }
    }
  expect(hits).toEqual([]);
});
