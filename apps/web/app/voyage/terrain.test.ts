import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { terrainGeometry } from './terrain';
import { worlds } from './worlds';
import { Ground } from './planet-surface';

describe('original low-poly planet surfaces', () => {
  it('builds ten different reproducible surfaces with finite geometry on both detail levels', () => {
    for (const mobile of [false, true]) {
      const signatures = worlds.map((world) => {
        const first = terrainGeometry(world, mobile);
        const repeat = terrainGeometry(world, mobile);
        const data = first.attributes.position.array;
        expect(data).toEqual(repeat.attributes.position.array);
        expect(data.every(Number.isFinite)).toBe(true);
        expect(first.attributes.normal.array.every(Number.isFinite)).toBe(true);
        expect(first.attributes.position.count / 3).toBeLessThanOrEqual(mobile ? 1500 : 2400);
        expect(first.index).toBeNull();
        // Every facet is flat: its three corners share one normal and one colour. Collect
        // mismatches and assert once; per-facet expectations dominated the suite's runtime.
        const unevenFacets: string[] = [];
        for (let face = 0; face < data.length; face += 9)
          for (const attribute of ['normal', 'color']) {
            const values = first.attributes[attribute].array;
            for (let k = 0; k < 3; k++)
              if (
                values[face + k] !== values[face + 3 + k] ||
                values[face + k] !== values[face + 6 + k]
              )
                unevenFacets.push(`${world.id}:${face / 9}:${attribute}`);
          }
        expect(unevenFacets).toEqual([]);
        const signature = createHash('sha256').update(new Uint8Array(data.buffer)).digest('hex');
        first.dispose();
        repeat.dispose();
        return signature;
      });
      expect(new Set(signatures).size).toBe(10);
    }
  });
  it('supports surface placement on exact polyhedron seams and stepped coastlines', () => {
    for (const mobile of [false, true])
      for (const art of worlds) {
        const ground = new Ground(art, 1, mobile);
        try {
          for (const latitude of [-57, -12, 0, 4, 57])
            for (const longitude of [-180, -90, -65, -13, 0, 13, 65, 90, 180]) {
              const point = ground.project(ground.direction(longitude, latitude), 0);
              expect(point.toArray().every(Number.isFinite)).toBe(true);
              expect(point.length()).toBeGreaterThan(0.65);
            }
        } finally {
          ground.dispose();
        }
      }
  });
});
