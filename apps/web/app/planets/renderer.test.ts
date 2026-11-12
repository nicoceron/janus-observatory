import { describe, expect, it, vi } from 'vitest';
import { fillTime, SLOW_FILL_MS, softwareRenderer } from './renderer';

/** A canvas whose context takes `cost(vertices)` milliseconds to finish each draw. */
function fakeCanvas(cost: (vertices: number) => number) {
  let clock = 0;
  let pending = 0;
  const draws: number[] = [];
  const lost = vi.fn();
  const gl = new Proxy(
    {
      createShader: () => ({}),
      createProgram: () => ({}),
      createBuffer: () => ({}),
      getAttribLocation: () => 0,
      getExtension: (name: string) =>
        name === 'WEBGL_lose_context' ? { loseContext: lost } : null,
      drawArrays: (_mode: number, _first: number, count: number) => {
        draws.push(count);
        pending += cost(count);
      },
      // The work is only finished, and so only costs time, when a pixel is read back.
      readPixels: () => {
        clock += pending;
        pending = 0;
      },
    } as Record<string, unknown>,
    { get: (target, key: string) => (key in target ? target[key] : () => undefined) },
  );
  const canvas = { width: 0, height: 0, getContext: () => gl } as unknown as HTMLCanvasElement;
  return { canvas, draws, lost, now: () => clock };
}

describe('software renderer detection', () => {
  it('trusts a name that says a CPU is drawing, without measuring', () => {
    const measure = vi.fn(() => false);
    for (const name of [
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0)), SwiftShader driver)',
      'llvmpipe, or similar',
      'Microsoft Basic Render Driver',
    ])
      expect(softwareRenderer(name, measure)).toBe(true);
    expect(measure).not.toHaveBeenCalled();
  });

  it('trusts a named GPU, without measuring', () => {
    const measure = vi.fn(() => true);
    for (const name of [
      'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)',
      'Mali-G78',
    ])
      expect(softwareRenderer(name, measure)).toBe(false);
    expect(measure).not.toHaveBeenCalled();
  });

  it('measures a renderer that does not name itself', () => {
    // WebKit reports "Apple GPU" for every renderer, software ones included.
    for (const name of ['Apple GPU', '', ' apple gpu ']) {
      expect(softwareRenderer(name, () => true)).toBe(true);
      expect(softwareRenderer(name, () => false)).toBe(false);
    }
  });
});

describe('fill measurement', () => {
  it('times a GPU with one full run after the untimed warm-up', () => {
    const { canvas, draws, lost, now } = fakeCanvas(() => 1);
    expect(fillTime(canvas, now)).toBe(1);
    // The warm-up draws one layer; the workload is 96 layers of two triangles.
    expect(draws).toEqual([6, 96 * 6]);
    expect(lost).toHaveBeenCalledOnce();
  });

  it('keeps the fastest of three runs on a slow rasterizer', () => {
    const times = [0, 180, 95, 140];
    const { canvas, draws, now } = fakeCanvas(() => times.shift()!);
    const fastest = fillTime(canvas, now)!;
    expect(fastest).toBe(95);
    expect(fastest).toBeGreaterThanOrEqual(SLOW_FILL_MS);
    expect(draws).toHaveLength(4);
  });

  it('does not let one stalled run condemn a fast renderer', () => {
    const times = [0, 150, 2];
    const { canvas, draws, now } = fakeCanvas(() => times.shift()!);
    expect(fillTime(canvas, now)).toBe(2);
    expect(draws).toHaveLength(3);
  });

  it('stops after one run that is conclusively slow', () => {
    const times = [0, 700, 1];
    const { canvas, draws, now } = fakeCanvas(() => times.shift()!);
    expect(fillTime(canvas, now)).toBe(700);
    expect(draws).toHaveLength(2);
  });

  it('reports nothing where there is no WebGL to measure', () => {
    const canvas = { width: 0, height: 0, getContext: () => null } as unknown as HTMLCanvasElement;
    expect(fillTime(canvas)).toBeNull();
  });
});
