'use client';

import { useFrame, useThree } from '@react-three/fiber';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import { canvasMetadata } from './canvas-metadata';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { WorldArt } from './worlds';
import { lifePlans } from './life-plan';
import { landmarkKinds } from './inspection';

type Library = {
  scene: THREE.Group;
  nodes: Map<string, THREE.Object3D>;
  bytes: number;
};
type Entry = {
  url: string;
  references: number;
  touched: number;
  controller: AbortController;
  promise: Promise<Library | null>;
  library?: Library;
  settled: boolean;
};

// The small procedural portraits remain immediately available. Blender assets are an enhancement,
// loaded serially for the visible portrait, never a preload of the complete Solar System.
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_RETAINED_BYTES = 48 * 1024 * 1024;
const MAX_RETAINED_LIBRARIES = 2;
const visibleLibraries = new Map<number, { url: string; state: string }>();
const entries = new Map<string, Entry>();
let serial: Promise<unknown> = Promise.resolve();
let nextOwner = 0;
let decoderIdle: ReturnType<typeof setTimeout> | undefined;
let decoderWorker = false;
// Meshopt API, not a React hook.
const configureDecoderWorkers = MeshoptDecoder.useWorkers;

// Meshopt's supported worker API keeps decompression off the animation thread.
// One worker matches the serial download queue; release it after a loading burst.
function wakeDecoder() {
  if (decoderIdle) clearTimeout(decoderIdle);
  if (decoderWorker || typeof Worker === 'undefined') return;
  try {
    configureDecoderWorkers(1);
    decoderWorker = true;
  } catch {
    // The same WASM decoder works in restricted browsers without Worker support.
    configureDecoderWorkers(0);
  }
}
function parkDecoder() {
  if (!decoderWorker) return;
  decoderIdle = setTimeout(() => {
    configureDecoderWorkers(0);
    decoderWorker = false;
    decoderIdle = undefined;
  }, 5000);
}
const normalized = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const LibraryContext = createContext<Library | null>(null);

export function blenderAssetUrl(art: WorldArt, selection = 'Earth', mobile = false) {
  const world = art.form === 'origin' ? 'origin' : art.id.toLowerCase();
  return `/assets/blender/v1/${world}/${selection === 'Earth' ? (mobile ? 'earth-mobile' : 'earth') : selection}.glb`;
}

export function earthAssetParts(art: WorldArt) {
  const parts = ['Terrain', 'Structures'];
  const index = Number(art.id.slice(1)) - 1;
  if (art.form !== 'origin')
    for (const kind of landmarkKinds[index]) {
      parts.push('Landmark_' + kind);
      if (kind === 'watermill' || kind === 'windmill') parts.push('Mechanism_' + kind);
    }
  for (let i = 0; i < Math.min(art.cloud, 5); i++) parts.push('Cloud_' + i);
  for (const { subject, route } of lifePlans[art.form]) {
    if (route === 'road') parts.push(`Activity_${subject.kind}_road`);
    if (route === 'water' || route === 'flight') parts.push(`Activity_${subject.kind}_stops`);
    const prefix = `Life_${subject.type}_${subject.kind}`;
    parts.push(prefix + '_body');
    const count =
      subject.type === 'vehicle'
        ? subject.kind === 'haul-truck'
          ? 3
          : 1
        : subject.type === 'aircraft'
          ? 1
          : subject.type === 'machine'
            ? subject.kind === 'maintenance-walker'
              ? 3
              : 2
            : subject.type === 'animal'
              ? subject.kind === 'crane' || subject.kind === 'bio-ray'
                ? 2
                : 3
              : subject.kind === 'canoe'
                ? 4
                : 0;
    for (let i = 0; i < count; i++) parts.push(prefix + '_extra' + i);
  }
  return parts;
}

function resources(scene: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  return { geometries, materials, textures };
}

function decodedBytes(scene: THREE.Object3D) {
  const { geometries, textures } = resources(scene);
  let bytes = 0;
  for (const geometry of geometries) {
    bytes += geometry.index?.array.byteLength ?? 0;
    for (const attribute of Object.values(geometry.attributes))
      bytes +=
        attribute instanceof THREE.InterleavedBufferAttribute
          ? attribute.data.array.byteLength
          : attribute.array.byteLength;
  }
  for (const texture of textures) {
    const image = texture.image as { width?: number; height?: number } | undefined;
    bytes += (image?.width ?? 0) * (image?.height ?? 0) * 4 * 1.34;
  }
  return bytes;
}

function dispose(library: Library) {
  const { geometries, materials, textures } = resources(library.scene);
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => {
    const image = texture.image as { close?: () => void } | undefined;
    image?.close?.();
    texture.dispose();
  });
  library.scene.clear();
  library.nodes.clear();
}

function prune() {
  let bytes = [...entries.values()].reduce((sum, entry) => sum + (entry.library?.bytes ?? 0), 0);
  const unused = [...entries.values()]
    .filter((entry) => entry.references === 0 && entry.settled)
    .sort((a, b) => a.touched - b.touched);
  for (const entry of unused) {
    if (entries.size <= MAX_RETAINED_LIBRARIES && bytes <= MAX_RETAINED_BYTES) break;
    if (entry.library) {
      bytes -= entry.library.bytes;
      dispose(entry.library);
    }
    entries.delete(entry.url);
  }
}

async function readLibrary(entry: Entry): Promise<Library | null> {
  if (!entry.references || entry.controller.signal.aborted) return null;
  let scene: THREE.Group | undefined;
  try {
    const compressed =
      process.env.NEXT_PUBLIC_JANUS_COMPRESSED_MODELS === 'true' &&
      typeof DecompressionStream !== 'undefined';
    const response = await fetch(
      (compressed ? entry.url + '.gz' : entry.url) + '?revision=20260920-orbit-crops',
      {
        signal: entry.controller.signal,
      },
    );
    if (!response.ok) return null;
    const declared = Number(response.headers.get('content-length') ?? 0);
    if (declared > MAX_FILE_BYTES) return null;
    const data =
      compressed && response.body
        ? await new Response(
            response.body.pipeThrough(new DecompressionStream('gzip')),
          ).arrayBuffer()
        : await response.arrayBuffer();
    if (data.byteLength > MAX_FILE_BYTES || entry.controller.signal.aborted) return null;
    wakeDecoder();
    const gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .parseAsync(data, entry.url.slice(0, entry.url.lastIndexOf('/') + 1));
    scene = gltf.scene;
    const nodes = new Map<string, THREE.Object3D>();
    scene.traverse((object) => {
      if (object.name) nodes.set(normalized(object.name), object);
      // Authored parts never change their local transform. Motion belongs to the
      // React parent rigs; world matrices must still follow those parents.
      object.updateMatrix();
      object.matrixAutoUpdate = false;
    });
    const library = { scene, nodes, bytes: decodedBytes(scene) };
    if (!library.bytes || library.bytes > MAX_RETAINED_BYTES || entry.controller.signal.aborted) {
      dispose(library);
      return null;
    }
    return library;
  } catch {
    if (scene) dispose({ scene, nodes: new Map(), bytes: 0 });
    return null;
  } finally {
    parkDecoder();
  }
}

/** A lease must outlive every rendered clone that shares the library's buffers. */
export function acquireBlenderLibrary(url: string) {
  let entry = entries.get(url);
  if (!entry) {
    const fresh: Entry = {
      url,
      references: 0,
      touched: performance.now(),
      controller: new AbortController(),
      promise: Promise.resolve(null),
      settled: false,
    };
    fresh.promise = serial
      .then(() => readLibrary(fresh))
      .then((library) => {
        fresh.library = library ?? undefined;
        fresh.settled = true;
        prune();
        return library;
      });
    serial = fresh.promise;
    entries.set(url, fresh);
    entry = fresh;
  }
  entry.references++;
  entry.touched = performance.now();
  prune();
  const retained = entry;
  let released = false;
  return {
    promise: retained.promise,
    release: () => {
      if (released) return;
      released = true;
      retained.references = Math.max(0, retained.references - 1);
      retained.touched = performance.now();
      if (!retained.references && !retained.settled) {
        retained.controller.abort();
        // An aborted visit can retry if the reader returns. The serial queue still waits for
        // a parse already in progress, whose result is disposed before the next job begins.
        if (entries.get(url) === retained) entries.delete(url);
      }
      if (
        !retained.references &&
        retained.settled &&
        !retained.library &&
        entries.get(url) === retained
      )
        entries.delete(url);
      prune();
    },
  };
}

export function blenderCacheSnapshot() {
  const libraries = [...entries.values()].filter((entry) => entry.library);
  return {
    count: libraries.length,
    bytes: Math.round(libraries.reduce((sum, entry) => sum + entry.library!.bytes, 0)),
  };
}

/** Retain a shared library only while its portrait is visible and large enough to show its detail. */
export function BlenderLibrary({
  art,
  selection = 'Earth',
  required = [],
  inspect = false,
  embedded = false,
  detailed = false,
  mobile = false,
  children,
}: {
  art: WorldArt;
  selection?: string;
  required?: string[];
  inspect?: boolean;
  embedded?: boolean;
  detailed?: boolean;
  mobile?: boolean;
  children: ReactNode;
}) {
  const root = useRef<THREE.Group>(null);
  const owner = useRef(++nextOwner);
  const { camera, gl, invalidate } = useThree();
  const [{ active, version }, setVisibility] = useState({ active: false, version: 0 });
  const [result, setResult] = useState<{
    url: string;
    version: number;
    library: Library | null;
  } | null>(null);
  const position = useMemo(() => new THREE.Vector3(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);
  const url = blenderAssetUrl(art, selection, mobile);
  const current = result?.url === url && result.version === version;
  const library = active && current ? result.library : null;
  const complete =
    library && required.every((name) => library.nodes.has(normalized(name))) ? library : null;
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const lease = acquireBlenderLibrary(url);
    lease.promise.then((loaded) => {
      if (cancelled) return;
      setResult({ url, version, library: loaded });
      invalidate();
    });
    return () => {
      cancelled = true;
      // Context has already removed the cached clones in the commit before this passive cleanup.
      lease.release();
    };
  }, [active, version, url, invalidate]);
  useEffect(() => {
    const wake = () => invalidate();
    document.addEventListener('visibilitychange', wake);
    return () => document.removeEventListener('visibilitychange', wake);
  }, [invalidate]);
  useEffect(
    () => () => {
      visibleLibraries.delete(owner.current);
      canvasMetadata(
        gl.domElement,
        'data-blender-libraries',
        JSON.stringify([...visibleLibraries.values()]),
      );
      if (gl.domElement.dataset.blenderOwner === String(owner.current)) {
        delete gl.domElement.dataset.blenderOwner;
        delete gl.domElement.dataset.blenderAsset;
        delete gl.domElement.dataset.blenderState;
      }
    },
    [gl],
  );
  useFrame(() => {
    // Sample after all story pose callbacks, including a single reduced-motion render.
    queueMicrotask(() => {
      if (!root.current) return;
      let visible = !document.hidden;
      for (let parent: THREE.Object3D | null = root.current; parent; parent = parent.parent)
        if (!parent.visible) visible = false;
      // Hidden ancestors need neither projection nor repeated cache/JSON diagnostics.
      if (!visible) {
        if (active)
          setVisibility((previous) =>
            previous.active ? { active: false, version: previous.version + 1 } : previous,
          );
        if (visibleLibraries.delete(owner.current))
          canvasMetadata(
            gl.domElement,
            'data-blender-libraries',
            JSON.stringify([...visibleLibraries.values()]),
          );
        if (gl.domElement.dataset.blenderOwner === String(owner.current)) {
          delete gl.domElement.dataset.blenderOwner;
          delete gl.domElement.dataset.blenderAsset;
          delete gl.domElement.dataset.blenderState;
        }
        return;
      }
      if (root.current) {
        root.current.updateWorldMatrix(true, false);
        position.setFromMatrixPosition(root.current.matrixWorld).project(camera);
        scale.setFromMatrixScale(root.current.matrixWorld);
        visible &&=
          inspect ||
          ((embedded || detailed || Math.max(scale.x, scale.y, scale.z) > 0.8) &&
            Math.abs(position.x) < 1.3 &&
            Math.abs(position.y) < 1.3 &&
            position.z > -1 &&
            position.z < 1);
      } else visible = false;
      if (visible !== active) {
        setVisibility((previous) =>
          previous.active === visible
            ? previous
            : { active: visible, version: previous.version + 1 },
        );
      }
      if (visible)
        visibleLibraries.set(owner.current, {
          url,
          state: complete ? 'ready' : current ? 'fallback' : 'loading',
        });
      else visibleLibraries.delete(owner.current);
      canvasMetadata(
        gl.domElement,
        'data-blender-libraries',
        JSON.stringify([...visibleLibraries.values()]),
      );
      if (visible && !embedded) {
        const canvas = gl.domElement;
        canvasMetadata(canvas, 'data-blender-owner', String(owner.current));
        canvasMetadata(canvas, 'data-blender-asset', url);
        canvasMetadata(
          canvas,
          'data-blender-state',
          complete ? 'ready' : current ? 'fallback' : 'loading',
        );
        canvasMetadata(
          canvas,
          'data-blender-missing-parts',
          library ? required.filter((name) => !library.nodes.has(normalized(name))).join(',') : '',
        );
        canvasMetadata(canvas, 'data-blender-part-count', String(complete?.nodes.size ?? 0));
        const cache = blenderCacheSnapshot();
        canvasMetadata(canvas, 'data-blender-cache-count', String(cache.count));
        canvasMetadata(canvas, 'data-blender-cache-bytes', String(cache.bytes));
      } else if (gl.domElement.dataset.blenderOwner === String(owner.current)) {
        delete gl.domElement.dataset.blenderOwner;
        delete gl.domElement.dataset.blenderAsset;
        delete gl.domElement.dataset.blenderState;
      }
    });
  });
  return (
    <group ref={root}>
      <LibraryContext value={complete}>{children}</LibraryContext>
    </group>
  );
}

/** Hierarchy clones share immutable cached buffers/materials; the provider owns their lifetime. */
export function BlenderPart({ name, children }: { name: string; children?: ReactNode }) {
  const library = useContext(LibraryContext);
  const node = library?.nodes.get(normalized(name));
  const clone = useMemo(() => node?.clone(true), [node]);
  return clone ? <primitive object={clone} dispose={null} /> : children;
}

/** Complete off-world models use the same bounding-box framing as their immediate fallback. */
export function BlenderPortrait({
  size,
  name,
  children,
}: {
  size: number;
  name?: string;
  children: ReactNode;
}) {
  const library = useContext(LibraryContext);
  const model = useMemo(() => {
    if (!library) return null;
    const source = name ? library.nodes.get(normalized(name)) : library.scene;
    if (!source) return null;
    const scene = source.clone(true);
    const box = new THREE.Box3().setFromObject(scene);
    if (box.isEmpty()) return null;
    return {
      scene,
      center: box.getCenter(new THREE.Vector3()).negate(),
      scale: size / Math.max(...box.getSize(new THREE.Vector3()).toArray()),
    };
  }, [library, size, name]);
  return model ? (
    <group scale={model.scale}>
      <group position={model.center}>
        <primitive object={model.scene} dispose={null} />
      </group>
    </group>
  ) : (
    children
  );
}
