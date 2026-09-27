import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildWorldGeometry } from './WorldStructures';
import { presentEarth } from './Planet';
import { worlds } from './worlds';
import { globeRadius } from './life-plan';

describe('detailed miniature world geometry', () => {
  it('fits one finite, reproducible landmark mesh within the scene budget at both viewport tiers', () => {
    const desktopCounts: number[] = [];
    for (const mobile of [false, true]) {
      const signatures: string[] = [];
      for (const [index, art] of [presentEarth, ...worlds].entries()) {
        const scale = globeRadius(art);
        const geometry = buildWorldGeometry(art, scale, mobile);
        const repeat = buildWorldGeometry(art, scale, mobile);
        try {
          const positions = geometry.attributes.position;
          expect(positions.count / 3, art.id).toBeLessThan(20_000);
          expect(geometry.index).toBeNull();
          expect(geometry.groups).toHaveLength(0);
          expect(geometry.boundingSphere!.radius, art.id).toBeLessThan(2);
          for (const name of ['position', 'normal', 'color']) {
            const values = geometry.attributes[name].array;
            expect(values.every(Number.isFinite), `${art.id}: ${name}`).toBe(true);
            const signature = createHash('sha256')
              .update(new Uint8Array(values.buffer))
              .digest('hex');
            expect(signature).toBe(
              createHash('sha256')
                .update(new Uint8Array(repeat.attributes[name].array.buffer))
                .digest('hex'),
            );
            if (name === 'position') signatures.push(signature);
          }
          if (mobile) expect(positions.count, art.id).toBeLessThanOrEqual(desktopCounts[index]);
          else desktopCounts.push(positions.count);
        } finally {
          geometry.dispose();
          repeat.dispose();
        }
      }
      expect(new Set(signatures).size).toBe(11);
    }
  });
});
