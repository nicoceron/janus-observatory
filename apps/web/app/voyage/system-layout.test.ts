import { expect, it } from 'vitest';
import {
  HEADER_CLEARANCE,
  systemLayout,
  screenToScene,
  targetSize,
  type SystemPlace,
} from './system-layout';
import { refineRoad } from './route-finishing';
import { Vector3 } from 'three';
import { allScenarioProfiles } from '../../lib/canonical-core';
import { systemPortrait } from '../../lib/system-portrait';
import { systemSelections } from '../planets/explore';

const catalogue = ['Earth', 'Moon', 'Mars', 'Venus', 'asteroids', 'outer', 'kuiper', 'solar'];
/** The destinations each of the ten scenarios publishes. */
const published = allScenarioProfiles.map((profile) =>
  systemSelections(systemPortrait(profile).art),
);
/** The fixed site header's height at each width (SiteHeader.module.css). */
const header = (width: number) => (width <= 760 ? 112 : 94);
const phones = [
  [393, 659], // iPhone 15, the mobile-webkit profile
  [412, 839], // Pixel 7, the mobile-chromium profile
  [390, 844],
  [375, 667],
  [360, 640],
];
const wide = [
  [868, 1134],
  [1440, 900],
  [1280, 720],
];
/** The composition as it was before it took the header into account (Decision 022). */
function former(width: number, height: number, destinations: string[]): SystemPlace[] {
  const phone = width <= 760;
  const left = phone ? 24 : width * 0.465;
  const span = width - left - (phone ? 24 : width * 0.035);
  const top = phone ? 94 : Math.max(110, height * 0.13);
  const bottom = phone ? height * 0.64 : height - 116;
  const heightOfScene = Math.max(225, bottom - top);
  const diameter = Math.min(span * (destinations.length === 1 ? 0.88 : 0.65), heightOfScene * 0.72);
  const slots: Record<string, [number, number, number, number]> = {
    Moon: [0.88, 0.47, 1.1, 0.22],
    Mars: [0.8, 0.13, -4, 0.29],
    Venus: [0.13, 0.18, -2.5, 0.27],
    asteroids: [0.15, 0.76, -6, 0.21],
    outer: [0.88, 0.82, -9, 0.26],
    kuiper: [0.43, 0.94, -13, 0.16],
    solar: [0.44, 0.055, -15, 0.14],
  };
  return destinations.map((id) => {
    if (id === 'Earth')
      return { id, x: left + span * 0.47, y: top + heightOfScene * 0.51, z: 0, diameter };
    const [x, y, z, relative] = slots[id];
    return {
      id,
      x: id === 'Moon' ? left + span * 0.47 + diameter * 0.66 : left + span * x,
      y: id === 'Moon' ? top + heightOfScene * 0.51 - diameter * 0.12 : top + heightOfScene * y,
      z,
      diameter: Math.max(24, diameter * relative),
    };
  });
}

it('keeps all body hit regions separate, below the site header and inside phone, tablet and desktop viewports', () => {
  for (const [w, h] of [...phones, ...wide])
    for (const destinations of [
      ...catalogue.map((_, n) => catalogue.slice(0, n + 1)),
      ...published,
    ]) {
      const positions = systemLayout(w, h, destinations, header(w));
      for (const p of positions) {
        expect(p.x - p.diameter / 2).toBeGreaterThan(0);
        expect(p.x + p.diameter / 2).toBeLessThan(w);
        expect(
          p.y - targetSize(p) / 2,
          `${w}x${h} ${destinations.length} ${p.id}`,
        ).toBeGreaterThanOrEqual(header(w) + HEADER_CLEARANCE);
        expect(p.y + targetSize(p) / 2).toBeLessThan(h - 60);
        for (const q of positions)
          if (p !== q) {
            const distance = Math.hypot(p.x - q.x, p.y - q.y);
            expect(distance, `${w}x${h} ${destinations.length} ${p.id}/${q.id}`).toBeGreaterThan(
              (targetSize(p) + targetSize(q)) / 2,
            );
          }
      }
    }
});
it('seats a phone composition just below the header, as one piece and in the same place for every scenario', () => {
  for (const [w, h] of phones) {
    const seated = systemLayout(w, h, catalogue, header(w));
    const before = former(w, h, catalogue);
    const drop = seated[0].y - before[0].y;
    expect(drop).toBeGreaterThan(0);
    expect(Math.min(...seated.map((p) => p.y - targetSize(p) / 2))).toBeCloseTo(
      header(w) + HEADER_CLEARANCE,
    );
    for (const destinations of published) {
      const places = systemLayout(w, h, destinations, header(w));
      former(w, h, destinations).forEach((old, i) => {
        expect(places[i]).toMatchObject({ id: old.id, x: old.x, z: old.z, diameter: old.diameter });
        expect(places[i].y - old.y, `${w}x${h} ${old.id}`).toBeCloseTo(drop);
      });
    }
  }
});
it('follows the header it is given rather than an assumed height', () => {
  const [low, high] = [112, 140].map((height) => systemLayout(393, 659, catalogue, height));
  low.forEach((place, i) => expect(high[i].y - place.y).toBeCloseTo(28));
});
it('leaves wide compositions exactly where they were', () => {
  for (const w of [761, 868, 1024, 1280, 1440, 1920, 2560])
    for (const h of [420, 450, 600, 720, 900, 1134, 1440])
      for (const destinations of [catalogue, ...published])
        expect(systemLayout(w, h, destinations, header(w)), `${w}x${h}`).toEqual(
          former(w, h, destinations),
        );
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
  const places = systemLayout(1440, 900, ['Earth', 'Moon', 'Mars', 'outer', 'kuiper', 'solar'], 94);
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
