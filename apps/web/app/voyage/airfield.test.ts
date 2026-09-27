import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import { originRiver, presentEarth } from './origin-world';
import { Ground } from './planet-surface';
import { globeRadius, lifePlans } from './life-plan';
import { lifeRoute } from './life-routes';
import { roadClearance } from './activity-corridor';

it('keeps the starting Earth stream and background placements outside both airfield footprints', () => {
  for (const mobile of [false, true]) {
    const radius = globeRadius(presentEarth);
    const ground = new Ground(presentEarth, radius, mobile);
    const route = lifeRoute(presentEarth, radius, mobile, lifePlans.origin[0]);
    const positions = route.stops!.getAttribute('position');
    const airfields = Array.from({ length: positions.count }, (_, i) =>
      new Vector3().fromBufferAttribute(positions, i),
    );
    const clear = roadClearance(presentEarth, mobile);
    try {
      for (const field of airfields.filter((_, i) => i % 96 === 0))
        expect(clear(field, radius * 0.12)).toBe(false);
      const directions = airfields.map((p) => p.clone().normalize());
      let minimum = Infinity;
      for (let i = 1; i < originRiver.length; i++) {
        const a = ground.direction(...originRiver[i - 1]),
          b = ground.direction(...originRiver[i]);
        for (let step = 0; step <= 32; step++) {
          const stream = a
            .clone()
            .lerp(b, step / 32)
            .normalize();
          for (const field of directions) minimum = Math.min(minimum, stream.distanceTo(field));
        }
      }
      expect(minimum).toBeGreaterThan(0.035);
    } finally {
      route.stops?.dispose();
      ground.dispose();
    }
  }
});
