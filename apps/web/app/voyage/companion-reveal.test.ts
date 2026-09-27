import { expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { behindEarth, companionReveal } from './companion-reveal';
it('keeps chapter midpoints continuous instead of switching bodies on and off', () => {
  for (let scene = 2; scene <= 11; scene++)
    for (let order = 0; order < 7; order++) {
      expect(companionReveal(scene - 1, scene, order, false)).toBe(0);
      expect(companionReveal(scene, scene, order, false)).toBe(1);
      expect(companionReveal(scene + 1, scene, order, false)).toBe(0);
      for (const midpoint of [scene - 0.5, scene + 0.5]) {
        const before = companionReveal(midpoint - 0.001, scene, order, false);
        const after = companionReveal(midpoint + 0.001, scene, order, false);
        expect(before).toBeGreaterThan(0);
        expect(after).toBeGreaterThan(0);
        expect(Math.abs(before - after)).toBeLessThan(0.01);
      }
      const forward = Array.from({ length: 101 }, (_, i) =>
        companionReveal(scene - 1 + i / 100, scene, order, false),
      );
      expect(forward.every((value, i) => !i || value >= forward[i - 1])).toBe(true);
      expect(forward.toReversed()).toEqual(
        Array.from({ length: 101 }, (_, i) =>
          companionReveal(scene - 1 + (100 - i) / 100, scene, order, false),
        ),
      );
      expect(companionReveal(scene, scene, order, true)).toBe(1);
      expect(companionReveal(scene - 1, scene, order, true)).toBe(0);
    }
});
it('places the hidden body behind the Earth silhouette even for an off-center camera', () => {
  for (const x of [-4, 0, 4]) {
    const camera = new PerspectiveCamera(43, 1.6, 0.1, 100);
    camera.position.set(x, 1, 11);
    camera.updateMatrixWorld();
    const hidden = behindEarth(x, 1, 11);
    const earth = new Vector3().project(camera);
    const body = new Vector3(hidden.x, hidden.y, hidden.z).project(camera);
    expect(body.x).toBeCloseTo(earth.x, 8);
    expect(body.y).toBeCloseTo(earth.y, 8);
    expect(body.z).toBeGreaterThan(earth.z);
  }
});
