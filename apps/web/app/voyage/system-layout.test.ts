import { expect, it } from 'vitest';
import { systemLayout, screenToScene } from './system-layout';
import { refineRoad } from './route-finishing';
import { Vector3 } from 'three';
it('keeps all body hit regions separate and inside phone, tablet and desktop viewports', () => {
  for (const [w, h] of [
    [390, 844],
    [375, 667],
    [868, 1134],
    [1440, 900],
    [1280, 720],
  ])
    for (let n = 1; n <= 8; n++) {
      const positions = systemLayout(
        w,
        h,
        Array.from(
          { length: n },
          (_, i) => ['Earth', 'Moon', 'Mars', 'Venus', 'asteroids', 'outer', 'kuiper', 'solar'][i],
        ),
      );
      for (const p of positions) {
        expect(p.x - p.diameter / 2).toBeGreaterThan(0);
        expect(p.x + p.diameter / 2).toBeLessThan(w);
        expect(p.y - p.diameter / 2).toBeGreaterThanOrEqual(70);
        expect(p.y + Math.max(44, p.diameter) / 2).toBeLessThan(h - 60);
        for (const q of positions)
          if (p !== q) {
            const distance = Math.hypot(p.x - q.x, p.y - q.y);
            expect(distance, `${w}x${h} ${n} ${p.id}/${q.id}`).toBeGreaterThan(
              (Math.max(44, p.diameter) + Math.max(44, q.diameter)) / 2,
            );
          }
      }
    }
});
it('removes unnecessary grid turns but preserves an obstacle-constrained detour and both endpoints', () => {
  const points = [
    new Vector3(0, 0, 1),
    new Vector3(0.1, 0.1, 1),
    new Vector3(0.2, 0.2, 1),
    new Vector3(0.3, 0, 1),
  ].map((p) => p.normalize());
  expect(refineRoad(points, () => true)).toEqual([points[0], points[3]]);
  const safe = (a: Vector3, b: Vector3) => !(a.x < 0.14 && b.x > 0.16 && a.y < 0.1 && b.y < 0.1);
  const refined = refineRoad(points, safe);
  expect(refined[0]).toEqual(points[0]);
  expect(refined.at(-1)).toEqual(points.at(-1));
  expect(refined.length).toBeGreaterThan(2);
  expect(refined.slice(1).every((p, i) => safe(refined[i], p))).toBe(true);
});

it('keeps Luna local and places the outer destinations progressively deeper', () => {
  const places = systemLayout(1440, 900, ['Earth', 'Moon', 'Mars', 'outer', 'kuiper', 'solar']);
  const [earth, moon, mars, outer, kuiper, solar] = places;
  expect(Math.hypot(moon.x - earth.x, moon.y - earth.y)).toBeLessThan(earth.diameter);
  expect(moon.z).toBeGreaterThan(earth.z);
  expect(mars.z).toBeLessThan(earth.z);
  expect(outer.z).toBeLessThan(mars.z);
  expect(kuiper.z).toBeLessThan(outer.z);
  expect(solar.z).toBeLessThan(kuiper.z);
  for (const p of places) {
    const point = screenToScene(p.x, p.y, 900, 1440, p.z);
    expect(point.x / point.perPixel + 720).toBeCloseTo(p.x);
    expect(450 - point.y / point.perPixel).toBeCloseTo(p.y);
  }
});
