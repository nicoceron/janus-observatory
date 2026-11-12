import * as THREE from 'three';
import manifest from './kit.generated.json';
import { gunzip } from './inflate';
import { kitPackUrl } from './kit-url';

/**
 * The Blender kit at runtime. `kit.generated.json` (written by `scripts/kit.py export`) gives
 * every model's size, parts and default colour synchronously, so worlds can be laid out before
 * any geometry arrives. The geometry itself lives in the binary packs that manifest names, fetched once
 * and decoded here. See scripts/blender/kit/export.py for the format.
 */
export type KitPart = 'base' | 'tint' | 'glass' | 'metal' | 'glow' | 'lit';
export const kitParts: KitPart[] = ['base', 'tint', 'glass', 'metal', 'glow', 'lit'];
export type KitGeometry = Partial<Record<KitPart, THREE.BufferGeometry>>;

type Kind = {
  pack: string;
  tint: string;
  min: number[];
  max: number[];
  triangles: number;
  parts: string[];
  /** A `-dark` twin draws the geometry of its lit model with unlit panes. */
  of?: string;
};
type Pack = { path: string; bytes: number; rawBytes: number; sha256: string };

const kinds = manifest.kinds as Record<string, Kind>;
const packs = manifest.packs as Record<string, Pack>;
export const kitPackNames = Object.keys(packs);

type Blob = { meta: Record<string, unknown>; bytes: Uint8Array };
const blobs = new Map<string, Blob>();
const store = new Map<string, KitGeometry>();
const ready = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

export const kitKinds = Object.keys(kinds);

export function kitInfo(kind: string): Kind | undefined {
  return kinds[kind];
}

/** Whether a kind is the unlit twin of another model. */
export function kitDark(kind: string) {
  return kinds[kind]?.of !== undefined;
}

/** Every model asked for since the page loaded; the export uses it to choose the core pack. */
export const kitUsed = new Set<string>();

/** Decoded geometry of a kind, or undefined until its pack has loaded. */
export function kitGeometry(kind: string): KitGeometry | undefined {
  const info = kinds[kind];
  if (!info) return undefined;
  kitUsed.add(info.of ?? kind);
  return store.get(info.of ?? kind);
}

/** A raw data blob shipped in a pack, such as the shared Earth relief. */
export function kitData(name: string): Blob {
  const blob = blobs.get(name);
  if (!blob) throw new Error(`Kit data "${name}" is not loaded.`);
  return blob;
}

/** `core` holds what the opening Earth needs; `all` is every pack. */
export function kitReady(scope: 'core' | 'all' = 'all') {
  if (scope === 'core') return !('core' in packs) || ready.has('core');
  return kitPackNames.every((name) => ready.has(name));
}

export function subscribeKit(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Changes whenever a pack finishes loading. */
export function kitVersion() {
  return version;
}

const linear = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  linear[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Decode one inflated pack and add its models to the store. */
export function decodePack(source: ArrayBuffer | Uint8Array, name?: string) {
  // Typed-array views need an aligned buffer of their own.
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x54494b4a) throw new Error('Not a Janus kit pack.');
  if (view.getUint32(4, true) !== 1) throw new Error('Unsupported kit pack version.');
  const jsonBytes = view.getUint32(8, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 12, jsonBytes))) as {
    kinds: Record<
      string,
      { min: number[]; max: number[]; parts: Record<string, [number, number, number]> }
    >;
    data?: Record<string, { offset: number; bytes: number } & Record<string, unknown>>;
  };
  const payload = 12 + jsonBytes;
  for (const [name, meta] of Object.entries(header.data ?? {}))
    blobs.set(name, { meta, bytes: new Uint8Array(buffer, payload + meta.offset, meta.bytes) });
  for (const [kind, info] of Object.entries(header.kinds)) {
    const model: KitGeometry = {};
    const box = new THREE.Box3(
      new THREE.Vector3().fromArray(info.min),
      new THREE.Vector3().fromArray(info.max),
    );
    for (const [part, [vertices, triangles, offset]] of Object.entries(info.parts)) {
      let at = payload + offset;
      const position = new Float32Array(vertices * 3);
      for (let k = 0; k < 3; k++) {
        const stream = new Uint16Array(buffer, at + k * vertices * 2, vertices);
        const low = info.min[k],
          scale = (info.max[k] - info.min[k]) / 65535;
        for (let i = 0, value = 0; i < vertices; i++) {
          value = (value + stream[i]) & 0xffff;
          position[i * 3 + k] = low + value * scale;
        }
      }
      at += vertices * 6;
      const normal = new Float32Array(vertices * 3);
      const packed = new Int8Array(buffer, at, vertices * 3);
      for (let k = 0; k < 3; k++)
        for (let i = 0; i < vertices; i++) normal[i * 3 + k] = packed[k * vertices + i] / 127;
      at += vertices * 3;
      const color = new Float32Array(vertices * 3);
      const tones = new Uint8Array(buffer, at, vertices * 3);
      for (let k = 0; k < 3; k++)
        for (let i = 0, value = 0; i < vertices; i++) {
          value = (value + tones[k * vertices + i]) & 0xff;
          color[i * 3 + k] = linear[value];
        }
      at += vertices * 3;
      at += at % 2;
      const coded = new Uint16Array(buffer, at, triangles * 3);
      const index = new Uint16Array(triangles * 3);
      for (let i = 0, mark = 0; i < coded.length; i++)
        index[i] = coded[i] === 0 ? mark++ : mark - coded[i];
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
      geometry.setIndex(new THREE.BufferAttribute(index, 1));
      geometry.boundingBox = box.clone();
      geometry.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      model[part as KitPart] = geometry;
    }
    store.set(kind, model);
  }
  if (name) ready.add(name);
  version++;
  // A listener may subscribe again while it runs (the build queue does, to wait for the next
  // pack). Notify only those present now: a Set also visits entries added during iteration, and
  // a listener that re-adds itself would otherwise be called for ever.
  for (const listener of [...listeners]) listener();
}

async function inflatePack(bytes: Uint8Array): Promise<Uint8Array> {
  // A server may already have decoded the transfer; the pack then starts with its magic.
  if (bytes[0] === 0x4a && bytes[1] === 0x4b) return bytes;
  if (typeof DecompressionStream === 'function') {
    const stream = new Blob([bytes as BlobPart])
      .stream()
      .pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return gunzip(bytes);
}

let loading: Promise<void> | null = null;

/**
 * Fetch and decode every pack: the opening Earth's first, then the observer's, then the rest. Safe to call repeatedly; a failed
 * load is retried by the next call. The page stays readable without it: the story and atlas are
 * DOM, and a missing kit only leaves the illustrations unfurnished.
 */
export function loadKit(): Promise<void> {
  if (kitReady('all')) return Promise.resolve();
  loading ??= (async () => {
    try {
      const first = ['core', 'observer'];
      const rank = (name: string) => (first.includes(name) ? first.indexOf(name) : first.length);
      const order = [...kitPackNames].sort((a, b) => rank(a) - rank(b));
      for (const name of order) {
        if (ready.has(name)) continue;
        const response = await fetch(kitPackUrl(name));
        if (!response.ok) throw new Error(`Kit pack ${name} responded ${response.status}.`);
        decodePack(await inflatePack(new Uint8Array(await response.arrayBuffer())), name);
      }
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** Test helper: forget every decoded pack. */
export function resetKit() {
  for (const model of store.values())
    for (const geometry of Object.values(model)) geometry.dispose();
  store.clear();
  blobs.clear();
  ready.clear();
  version++;
}
