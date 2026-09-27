import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { allScenarioProfiles } from '../../lib/canonical-core';
import { systemPortrait } from '../../lib/system-portrait';
import { buildCompanionGeometry, buildSystemFeatureGeometry } from './SystemGeometry';
import { worlds } from './worlds';

describe('system companion geometry', () => {
  it('gives sourced surface activity its own Venus geometry instead of the atmospheric aerostat', () => {
    const art = worlds[5];
    const body = systemPortrait(allScenarioProfiles[5]).art.bodies.find(
      (item) => item.body === 'Venus',
    )!;
    const surface = buildCompanionGeometry(art, body, false);
    const atmosphere = buildCompanionGeometry(art, { ...body, activity: 'atmosphere' }, false);
    try {
      const hash = (geometry: typeof surface) =>
        createHash('sha256')
          .update(new Uint8Array(geometry.attributes.position.array.buffer))
          .digest('hex');
      expect(body.activity).toBe('surface');
      expect(hash(surface)).not.toBe(hash(atmosphere));
    } finally {
      surface.dispose();
      atmosphere.dispose();
    }
  });
  it('keeps every sourced companion bounded, finite, independently colored and below the spatial budget', () => {
    for (const mobile of [false, true])
      for (const [i, art] of worlds.entries()) {
        const context = systemPortrait(allScenarioProfiles[i]).art;
        const geometries = [
          ...context.bodies.map((body) => buildCompanionGeometry(art, body, mobile)),
          ...context.features.map((feature) => buildSystemFeatureGeometry(art, feature)),
        ];
        const identities = new Set<string>();
        let triangles = 0;
        try {
          for (const geometry of geometries) {
            const p = geometry.attributes.position;
            expect(p.count / 3).toBeLessThan(12_000);
            triangles += p.count / 3;
            expect(geometry.boundingSphere!.radius).toBeLessThan(1.9);
            expect(geometry.groups).toHaveLength(0);
            expect(geometry.index).toBeNull();
            for (const name of ['position', 'normal', 'color'])
              expect(geometry.attributes[name].array.every(Number.isFinite)).toBe(true);
            identities.add(
              createHash('sha256').update(new Uint8Array(p.array.buffer)).digest('hex'),
            );
          }
          expect(identities.size, art.id).toBe(geometries.length);
          expect(triangles, art.id).toBeLessThan(40_000);
        } finally {
          geometries.forEach((geometry) => geometry.dispose());
        }
      }
  });
});
