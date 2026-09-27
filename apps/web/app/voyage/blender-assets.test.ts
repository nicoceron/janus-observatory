import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { presentEarth } from './origin-world';
import { worlds } from './worlds';

const decoder = vi.hoisted(() => ({ parse: vi.fn() }));
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    setMeshoptDecoder() {
      return this;
    }
    parseAsync(data: ArrayBuffer) {
      return decoder.parse(data);
    }
  },
}));
vi.mock('three/examples/jsm/libs/meshopt_decoder.module.js', () => ({
  MeshoptDecoder: { useWorkers: vi.fn() },
}));

function model() {
  const scene = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  mesh.name = 'Terrain';
  scene.add(mesh);
  return {
    scene,
    geometry: vi.spyOn(mesh.geometry, 'dispose'),
    material: vi.spyOn(mesh.material, 'dispose'),
  };
}
function pending<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const flush = async () => {
  for (let i = 0; i < 16; i++) await Promise.resolve();
};

describe('bounded Blender asset loading', () => {
  beforeEach(() => {
    vi.resetModules();
    decoder.parse.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]))),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reuses local transforms while animated parents still move the complete model', async () => {
    const fixture = model();
    fixture.scene.children[0].position.set(1, 2, 3);
    decoder.parse.mockResolvedValue({ scene: fixture.scene });
    const { acquireBlenderLibrary } = await import('./BlenderAssets');
    const lease = acquireBlenderLibrary('/matrix-model.glb');
    const library = await lease.promise;
    expect(library).not.toBeNull();
    const clone = library!.scene.clone(true);
    const parent = new THREE.Group();
    parent.add(clone);
    parent.position.set(5, 0, 0);
    parent.updateMatrixWorld(true);
    expect(clone.children[0].matrixAutoUpdate).toBe(false);
    expect(clone.children[0].getWorldPosition(new THREE.Vector3()).toArray()).toEqual([6, 2, 3]);
    parent.position.x = 9;
    parent.updateMatrixWorld(true);
    expect(clone.children[0].getWorldPosition(new THREE.Vector3()).toArray()).toEqual([10, 2, 3]);
    lease.release();
  });

  it('requires the complete canoe rig and keeps both hands at their moving paddle grips', async () => {
    const { earthAssetParts } = await import('./BlenderAssets');
    const { lifeResources, canoeArmPoints } = await import('./LifeActor');
    const required = earthAssetParts(worlds[3]);
    for (let i = 0; i < 4; i++) expect(required).toContain('Life_vessel_canoe_extra' + i);
    const resources = lifeResources({ type: 'vessel', kind: 'canoe' });
    try {
      expect(resources.extra).toHaveLength(4);
      for (const geometry of resources.extra.slice(1, 3)) {
        geometry.computeBoundingBox();
        expect(geometry.boundingBox!.min.y).toBeCloseTo(0, 6);
        expect(geometry.boundingBox!.max.y).toBeCloseTo(1, 6);
      }
      const paddle = new THREE.Group();
      paddle.position.set(0.062, 0.084, 0);
      const shoulder = new THREE.Vector3(),
        elbow = new THREE.Vector3(),
        wrist = new THREE.Vector3();
      for (let frame = 0; frame < 32; frame++) {
        const t = frame * 0.5;
        const moving = t % 14 > 8 ? 0 : 1;
        paddle.rotation.set(
          Math.sin(t * 2.8) * 0.65 * moving,
          0,
          -0.2 + Math.cos(t * 2.8) * 0.14 * moving,
        );
        paddle.updateMatrix();
        for (let arm = 0; arm < 2; arm++) {
          canoeArmPoints(paddle.matrix, arm, shoulder, elbow, wrist);
          const localGrip = wrist.clone().applyMatrix4(paddle.matrix.clone().invert());
          expect(
            localGrip.distanceTo(
              new THREE.Vector3(0, arm === 0 ? 0.016 : -0.008, arm === 0 ? -0.0255 : -0.0064),
            ),
          ).toBeLessThan(1e-10);
          expect(elbow.y).toBeLessThan(shoulder.y);
          expect(shoulder.distanceTo(elbow)).toBeGreaterThan(0.01);
          expect(elbow.distanceTo(wrist)).toBeGreaterThan(0.01);
        }
      }
    } finally {
      resources.body.dispose();
      resources.extra.forEach((geometry) => geometry.dispose());
      resources.material.dispose();
    }
  });

  it('uses separate origin, scenario and mobile asset identities', async () => {
    const { blenderAssetUrl } = await import('./BlenderAssets');
    expect(blenderAssetUrl(presentEarth)).toBe('/assets/blender/v1/origin/earth.glb');
    expect(blenderAssetUrl(worlds[0], 'Earth', true)).toBe(
      '/assets/blender/v1/s1/earth-mobile.glb',
    );
    expect(blenderAssetUrl(worlds[0], 'Moon', true)).toBe('/assets/blender/v1/s1/Moon.glb');
    expect(blenderAssetUrl(worlds[5], 'Venus')).toBe('/assets/blender/v1/s6/Venus.glb');
  });

  it('does not fetch or parse the next asset while a parse is running', async () => {
    const { acquireBlenderLibrary } = await import('./BlenderAssets');
    const a = model(),
      b = model(),
      gate = pending<{ scene: THREE.Group }>();
    decoder.parse.mockReturnValueOnce(gate.promise).mockResolvedValueOnce(b);
    const first = acquireBlenderLibrary('/first.glb');
    const second = acquireBlenderLibrary('/second.glb');
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(decoder.parse).toHaveBeenCalledTimes(1);
    gate.resolve(a);
    expect(await first.promise).not.toBeNull();
    expect(await second.promise).not.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    first.release();
    second.release();
  });

  it('shares one library and never disposes buffers until every consumer releases them', async () => {
    const { acquireBlenderLibrary, blenderCacheSnapshot } = await import('./BlenderAssets');
    const a = model(),
      b = model(),
      c = model();
    decoder.parse.mockResolvedValueOnce(a).mockResolvedValueOnce(b).mockResolvedValueOnce(c);
    const first = acquireBlenderLibrary('/shared.glb');
    const otherConsumer = acquireBlenderLibrary('/shared.glb');
    expect(first.promise).toBe(otherConsumer.promise);
    await first.promise;
    const second = acquireBlenderLibrary('/b.glb');
    await second.promise;
    const third = acquireBlenderLibrary('/c.glb');
    await third.promise;
    expect(fetch).toHaveBeenCalledTimes(3);
    first.release();
    first.release();
    expect(a.geometry).not.toHaveBeenCalled();
    expect(blenderCacheSnapshot().count).toBe(3);
    otherConsumer.release();
    expect(a.geometry).toHaveBeenCalledOnce();
    expect(a.material).toHaveBeenCalledOnce();
    expect(blenderCacheSnapshot().count).toBe(2);
    expect(b.geometry).not.toHaveBeenCalled();
    expect(c.geometry).not.toHaveBeenCalled();
    second.release();
    third.release();
  });

  it('disposes a stale parsed scene before retrying a visit to the same asset', async () => {
    const { acquireBlenderLibrary } = await import('./BlenderAssets');
    const old = model(),
      fresh = model(),
      gate = pending<{ scene: THREE.Group }>();
    decoder.parse.mockReturnValueOnce(gate.promise).mockResolvedValueOnce(fresh);
    const abandoned = acquireBlenderLibrary('/return.glb');
    await flush();
    abandoned.release();
    const returned = acquireBlenderLibrary('/return.glb');
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    gate.resolve(old);
    expect(await abandoned.promise).toBeNull();
    expect(await returned.promise).not.toBeNull();
    expect(old.geometry).toHaveBeenCalledOnce();
    expect(fresh.geometry).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(2);
    returned.release();
  });

  it('keeps a failed asset from blocking the next visible world', async () => {
    const { acquireBlenderLibrary } = await import('./BlenderAssets');
    decoder.parse.mockRejectedValueOnce(new Error('Malformed GLB')).mockResolvedValueOnce(model());
    const failed = acquireBlenderLibrary('/broken.glb');
    const healthy = acquireBlenderLibrary('/healthy.glb');
    expect(await failed.promise).toBeNull();
    expect(await healthy.promise).not.toBeNull();
    failed.release();
    healthy.release();
  });

  it('retries a failed library on a later visit instead of caching its failure forever', async () => {
    const { acquireBlenderLibrary } = await import('./BlenderAssets');
    decoder.parse
      .mockRejectedValueOnce(new Error('Interrupted response'))
      .mockResolvedValueOnce(model());
    const firstVisit = acquireBlenderLibrary('/retry.glb');
    expect(await firstVisit.promise).toBeNull();
    firstVisit.release();
    const secondVisit = acquireBlenderLibrary('/retry.glb');
    expect(await secondVisit.promise).not.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    secondVisit.release();
  });
});
