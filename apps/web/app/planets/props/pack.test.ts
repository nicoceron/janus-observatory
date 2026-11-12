import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import manifest from './kit.generated.json';
import { gunzip } from './inflate';
import { propFootprint, propGeometry, propHeight, propKinds, propTint } from './library';
import {
  decodePack,
  kitData,
  kitDark,
  kitGeometry,
  kitInfo,
  kitKinds,
  kitParts,
  kitReady,
  subscribeKit,
} from './pack';

describe('the Blender kit', () => {
  it('decodes every model named by the manifest, within its declared bounds', () => {
    expect(kitReady('all')).toBe(true);
    expect(kitKinds.length).toBeGreaterThan(100);
    for (const kind of kitKinds) {
      const info = kitInfo(kind)!;
      const parts = kitGeometry(kind);
      expect(parts, kind).toBeDefined();
      let triangles = 0;
      for (const part of kitParts) {
        const geometry = parts![part];
        if (!geometry) continue;
        const position = geometry.getAttribute('position'),
          normal = geometry.getAttribute('normal'),
          colour = geometry.getAttribute('color');
        const index = geometry.getIndex()!;
        triangles += index.count / 3;
        expect(normal.count, `${kind}/${part} normals`).toBe(position.count);
        expect(colour.count, `${kind}/${part} colours`).toBe(position.count);
        for (let i = 0; i < index.count; i++)
          if (index.getX(i) >= position.count)
            throw new Error(`${kind}/${part} index out of range`);
        for (let i = 0; i < position.count; i++)
          for (let k = 0; k < 3; k++) {
            const value = position.getComponent(i, k);
            if (!(value >= info.min[k] - 1e-3 && value <= info.max[k] + 1e-3))
              throw new Error(`${kind}/${part} vertex ${i} outside its bounds`);
            const c = colour.getComponent(i, k);
            if (!(c >= 0 && c <= 1)) throw new Error(`${kind}/${part} colour out of range`);
          }
        for (let i = 0; i < normal.count; i += 7) {
          const length = Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i));
          expect(length, `${kind}/${part} normal`).toBeGreaterThan(0.9);
        }
      }
      expect(triangles, `${kind} triangles`).toBe(info.triangles);
    }
  });

  it('gives a -dark twin the geometry of its lit model', () => {
    const twins = kitKinds.filter(kitDark);
    expect(twins.length).toBeGreaterThan(5);
    for (const twin of twins) {
      expect(kitGeometry(twin)).toBe(kitGeometry(twin.replace(/-dark$/, '')));
      expect(kitGeometry(twin)!.lit, `${twin} window panes`).toBeDefined();
    }
  });

  it('answers size and colour from the manifest alone', () => {
    for (const kind of propKinds) {
      expect(propHeight(kind), kind).toBeGreaterThan(-5);
      expect(propFootprint(kind), kind).toBeGreaterThan(0);
      expect(propTint(kind), kind).toBeTruthy();
      expect(Object.keys(propGeometry(kind)).length, kind).toBeGreaterThan(0);
    }
  });

  it('ships the shared Earth relief in the core pack', () => {
    const { meta, bytes } = kitData('earth');
    expect(bytes.length).toBe((meta.width as number) * (meta.height as number) * 4);
    expect(manifest.packs.core).toBeDefined();
  });
});

describe('gunzip fallback', () => {
  it('round-trips stored, fixed and dynamic deflate blocks', () => {
    const samples = [
      new Uint8Array(0),
      new TextEncoder().encode('Janus'),
      new Uint8Array(70000).map((_, i) => (i * 7 + (i >> 5)) & 0xff),
      new Uint8Array(40000).map((_, i) => (Math.sin(i * 0.37) * 1e4) & 0xff),
      new Uint8Array(50000),
    ];
    for (const sample of samples)
      for (const level of [0, 1, 6, 9])
        expect(Buffer.from(gunzip(gzipSync(sample, { level }))).equals(Buffer.from(sample))).toBe(
          true,
        );
  });

  it('notifies a listener once per pack, even when it subscribes again while it runs', () => {
    // The build queue waits for the next pack by subscribing from inside its own listener. A
    // loader that also called listeners added mid-notification would never return.
    let calls = 0;
    let stop = () => {};
    const wait = () => {
      stop = subscribeKit(() => {
        stop();
        if (++calls < 1000) wait();
      });
    };
    wait();
    const json = new TextEncoder().encode('{"kinds":{}}');
    const pack = new Uint8Array(12 + json.length);
    const view = new DataView(pack.buffer);
    view.setUint32(0, 0x54494b4a, true);
    view.setUint32(4, 1, true);
    view.setUint32(8, json.length, true);
    pack.set(json, 12);
    decodePack(pack);
    expect(calls).toBe(1);
    decodePack(pack);
    expect(calls).toBe(2);
    stop();
    expect(kitReady('all')).toBe(true);
  });
});
