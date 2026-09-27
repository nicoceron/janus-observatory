import { afterEach, expect, test, vi } from 'vitest';
import { _roots, createRoot } from '@react-three/fiber';

const canvases: HTMLCanvasElement[] = [];
afterEach(() => {
  for (const canvas of canvases.splice(0)) _roots.delete(canvas);
  vi.restoreAllMocks();
});

test('R3F uses stable Timer frame time without the deprecated Clock warning', () => {
  let now = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  const warn = vi.spyOn(console, 'warn');
  const canvas = {} as HTMLCanvasElement;
  canvases.push(canvas);
  createRoot(canvas);
  const state = _roots.get(canvas)!.store.getState();
  state.gl = { xr: { isPresenting: false } } as typeof state.gl;
  const clock = state.clock;
  expect(warn.mock.calls.flat().join(' ')).not.toContain('THREE.Clock');
  expect(clock.getDelta()).toBe(0);
  now += 16;
  expect(clock.getDelta()).toBeCloseTo(0.016);
  now += 5;
  expect(clock.getElapsedTime()).toBeCloseTo(0.016);
  expect(clock.getElapsedTime()).toBeCloseTo(0.016);
  now += 11;
  expect(clock.getDelta()).toBeCloseTo(0.016);
  expect(clock.elapsedTime).toBeCloseTo(0.032);
  state.setFrameloop('never');
  now += 5000;
  expect(clock.getDelta()).toBe(0);
  expect(clock.elapsedTime).toBe(0);
  state.setFrameloop('always');
  now += 20;
  expect(clock.getDelta()).toBeCloseTo(0.02);
  expect(clock.elapsedTime).toBeCloseTo(0.02);
});
