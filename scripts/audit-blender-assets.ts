/** CPU-only validation of final Blender libraries; no renderer, browser or Blender process. */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  BufferAttribute,
  BufferGeometry,
  InterleavedBufferAttribute,
  Material,
  Mesh,
  Object3D,
  Texture,
} from 'three';
import { earthAssetParts } from '../apps/web/app/voyage/BlenderAssets';
import { companionStudy } from '../apps/web/app/voyage/inspection';
import { presentEarth } from '../apps/web/app/voyage/origin-world';
import { worlds } from '../apps/web/app/voyage/worlds';
import { allScenarioProfiles } from '../apps/web/lib/canonical-core';
import { systemPortrait } from '../apps/web/lib/system-portrait';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const qa = join(root, 'docs/qa/blender-finish');
const webRequire = createRequire(join(root, 'apps/web/package.json'));
// Resolve the same ESM Three build used by GLTFLoader, avoiding duplicate class identities.
const THREE = await import(
  pathToFileURL(join(dirname(webRequire.resolve('three')), 'three.module.js')).href
);
const { GLTFLoader } = await import(
  pathToFileURL(webRequire.resolve('three/examples/jsm/loaders/GLTFLoader.js')).href
);
const { MeshoptDecoder } = await import(
  pathToFileURL(webRequire.resolve('three/examples/jsm/libs/meshopt_decoder.module.js')).href
);
await MeshoptDecoder.ready;

const limits = { fileBytes: 4 * 1024 ** 2, decodedBytes: 48 * 1024 ** 2 };
const errors: string[] = [];
const warnings: string[] = [];
const normalized = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const sha = (data: Uint8Array | string) => createHash('sha256').update(data).digest('hex');
const check = (condition: unknown, message: string) => {
  if (!condition) errors.push(message);
  return Boolean(condition);
};
const allWorldIds = ['origin', ...worlds.map((world) => world.id.toLowerCase())];
const args = process.argv.slice(2);
const chosen = args.length
  ? args.flatMap((arg) => (arg === '--world' ? [] : arg.split(',')))
  : allWorldIds;
if (chosen.some((id) => !allWorldIds.includes(id)))
  throw new Error('Usage: pnpm exec tsx scripts/audit-blender-assets.ts [--world s3,s6]');
const selectedWorlds = [...new Set(chosen)];
const full = selectedWorlds.length === allWorldIds.length;

type ExportReceipt = {
  path: string;
  bytes: number;
  sha256: string;
  triangles: number;
  parts: string[];
};
type ModelReceipt = {
  world: string;
  blender: string;
  source: string;
  sourceSha256: string;
  exports: ExportReceipt[];
};
type GlbDocument = {
  asset?: { version?: string; generator?: string };
  buffers?: { byteLength: number; uri?: string }[];
  bufferViews?: {
    byteLength: number;
    extensions?: { EXT_meshopt_compression?: { count: number; byteStride: number } };
  }[];
  images?: unknown[];
  textures?: unknown[];
  extensionsUsed?: string[];
  extensionsRequired?: string[];
};

async function checksum(path: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

function glbDocument(bytes: Buffer, label: string): GlbDocument {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67)
    throw new Error(`${label}: invalid GLB header`);
  check(bytes.readUInt32LE(4) === 2, `${label}: GLB version must be 2`);
  check(bytes.readUInt32LE(8) === bytes.length, `${label}: GLB declared length mismatch`);
  let offset = 12;
  let document: GlbDocument | undefined;
  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    if (offset + 8 + length > bytes.length) throw new Error(`${label}: truncated GLB chunk`);
    if (type === 0x4e4f534a)
      document = JSON.parse(
        bytes
          .subarray(offset + 8, offset + 8 + length)
          .toString('utf8')
          .trim(),
      );
    offset += 8 + length;
  }
  if (!document) throw new Error(`${label}: JSON chunk missing`);
  check(offset === bytes.length, `${label}: trailing or malformed chunk bytes`);
  check(document.asset?.version === '2.0', `${label}: glTF asset version is not 2.0`);
  check(
    !document.buffers?.some((buffer) => buffer.uri),
    `${label}: external/data buffer URI is not allowed`,
  );
  check(
    !document.images?.length && !document.textures?.length,
    `${label}: unexpected texture payload`,
  );
  check(
    !document.extensionsRequired?.includes('KHR_draco_mesh_compression'),
    `${label}: requires an unconfigured Draco decoder`,
  );
  return document;
}

function bounds(object: Object3D, label: string) {
  const box = new THREE.Box3().setFromObject(object, true);
  const values = [...box.min.toArray(), ...box.max.toArray()];
  check(values.every(Number.isFinite), `${label}: non-finite world bounds`);
  check(!box.isEmpty(), `${label}: empty world bounds`);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  return {
    min: box.min.toArray(),
    max: box.max.toArray(),
    radius: sphere.radius,
    center: sphere.center.toArray(),
  };
}

function finiteAttribute(attribute: BufferAttribute | InterleavedBufferAttribute) {
  for (let i = 0; i < attribute.count; i++)
    for (let j = 0; j < attribute.itemSize; j++)
      if (!Number.isFinite(attribute.getComponent(i, j))) return false;
  return true;
}

function inspectScene(scene: Object3D, label: string, earth: boolean) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const buffers = new Set<ArrayBufferLike>();
  const nodes = new Map<string, Object3D[]>();
  const meshDigests: string[] = [];
  let triangles = 0;
  let draws = 0;
  let meshCount = 0;
  let vertexColors = 0;
  let materialColors = 0;
  let normalFailures = 0;
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    const key = normalized(object.name);
    // GLTFLoader names its scene container after the glTF scene. Blender may use
    // the same text for that container and the single real exported root node.
    // Only glTF nodes participate in the semantic asset contract.
    if (object !== scene) nodes.set(key, [...(nodes.get(key) ?? []), object]);
    check(
      object.matrixWorld.elements.every(Number.isFinite),
      `${label}/${object.name}: invalid transform`,
    );
    if (!(object as Mesh).isMesh) return;
    const mesh = object as Mesh;
    const geometry = mesh.geometry;
    meshCount++;
    geometries.add(geometry);
    const position = geometry.getAttribute('position');
    if (
      !check(
        position?.itemSize === 3 && position.count > 0,
        `${label}/${object.name}: positions missing`,
      )
    )
      return;
    const normal = geometry.getAttribute('normal');
    check(
      normal?.itemSize === 3 && normal.count === position.count,
      `${label}/${object.name}: normals missing/count mismatch`,
    );
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      check(finiteAttribute(attribute), `${label}/${object.name}: non-finite ${name}`);
      buffers.add('data' in attribute ? attribute.data.array.buffer : attribute.array.buffer);
    }
    if (normal)
      for (let i = 0; i < normal.count; i++) {
        const length = Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i));
        if (length < 0.8 || length > 1.2) normalFailures++;
      }
    const index = geometry.index;
    const count = index?.count ?? position.count;
    check(count % 3 === 0, `${label}/${object.name}: incomplete triangle`);
    if (index) {
      buffers.add(index.array.buffer);
      let valid = true;
      for (let i = 0; i < index.count; i++) {
        const value = index.getX(i);
        if (!Number.isInteger(value) || value < 0 || value >= position.count) valid = false;
      }
      check(valid, `${label}/${object.name}: invalid index`);
    }
    triangles += count / 3;
    draws += Math.max(1, geometry.groups.length);
    const color = geometry.getAttribute('color');
    if (color) {
      vertexColors++;
      let valid = color.count === position.count;
      for (let i = 0; i < color.count; i++)
        for (let j = 0; j < color.itemSize; j++) {
          const value = color.getComponent(i, j);
          if (value < -0.001 || value > 1.001) valid = false;
        }
      check(valid, `${label}/${object.name}: vertex color outside [0,1] or count mismatch`);
    }
    const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    check(meshMaterials.length > 0, `${label}/${object.name}: no material`);
    for (const material of meshMaterials) {
      materials.add(material);
      const pbr = material as Material & {
        color?: { toArray(): number[] };
        roughness?: number;
        metalness?: number;
        opacity: number;
        vertexColors?: boolean;
      };
      if (pbr.color) {
        materialColors++;
        check(
          pbr.color.toArray().every((v) => Number.isFinite(v) && v >= 0 && v <= 1.001),
          `${label}/${material.name}: invalid base color`,
        );
      }
      check(
        Number.isFinite(pbr.opacity) && pbr.opacity > 0,
        `${label}/${material.name}: invisible/invalid opacity`,
      );
      for (const property of ['roughness', 'metalness'] as const)
        check(
          typeof pbr[property] === 'number' && pbr[property]! >= 0 && pbr[property]! <= 1,
          `${label}/${material.name}: invalid PBR ${property}`,
        );
      check(
        !pbr.vertexColors || Boolean(color),
        `${label}/${object.name}: material expects missing vertex colors`,
      );
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    check(
      Number.isFinite(geometry.boundingSphere?.radius),
      `${label}/${object.name}: invalid geometry radius`,
    );
    // Geometry identity ignores names, material paint and export timestamps. Different
    // colors alone must not disguise a duplicated off-world construction.
    const points = new Float32Array(position.count * 3);
    const point = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      for (let j = 0; j < 3; j++) points[i * 3 + j] = Math.round(point.getComponent(j) * 1e5) / 1e5;
    }
    const meshHash = createHash('sha256').update(new Uint8Array(points.buffer));
    if (index)
      meshHash.update(
        new Uint8Array(index.array.buffer, index.array.byteOffset, index.array.byteLength),
      );
    meshDigests.push(meshHash.digest('hex'));
  });
  check(normalFailures === 0, `${label}: ${normalFailures} non-unit or zero normals`);
  check(meshCount > 0, `${label}: contains no mesh`);
  check(textures.size === 0, `${label}: texture unexpectedly decoded`);
  check(vertexColors + materialColors > 0, `${label}: no color source`);
  const decodedBytes = [...buffers].reduce((total, buffer) => total + buffer.byteLength, 0);
  check(decodedBytes <= limits.decodedBytes, `${label}: decoded geometry exceeds 48 MiB`);
  const extent = bounds(scene, label);
  check(
    extent.radius > 0.1 && extent.radius < (earth ? 5 : 3),
    `${label}: unreasonable portrait/library radius ${extent.radius}`,
  );
  const dispose = () => {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    scene.clear();
  };
  return {
    summary: {
      meshes: meshCount,
      triangles,
      materialCount: materials.size,
      drawCalls: draws,
      decodedBytes,
      vertexColoredMeshes: vertexColors,
      bounds: extent,
      structureSha256: sha(meshDigests.sort().join('\n')),
    },
    nodes,
    dispose,
  };
}

const results: Record<string, unknown>[] = [];
const sourceChecks: Record<string, unknown>[] = [];
const expectedOffworld: string[] = [];
const seenOffworld: string[] = [];
const structureHashes = new Map<string, string[]>();
const fileHashes = new Map<string, string[]>();

for (const worldId of selectedWorlds) {
  const index = worlds.findIndex((world) => world.id.toLowerCase() === worldId);
  const art = index < 0 ? presentEarth : worlds[index];
  const system =
    index < 0 ? { bodies: [], features: [] } : systemPortrait(allScenarioProfiles[index]).art;
  const selections = [...system.bodies.map((body) => body.body), ...system.features];
  const folder = `apps/web/public/assets/blender/v1/${worldId}`;
  const expected = [
    'earth.glb',
    'earth-mobile.glb',
    ...selections.map((selection) => `${selection}.glb`),
  ];
  expectedOffworld.push(...selections.map((selection) => `${worldId}/${selection}`));
  let receipt: ModelReceipt;
  try {
    receipt = JSON.parse(await readFile(join(qa, `model-${worldId}.json`), 'utf8'));
    check(receipt.world === worldId, `${worldId}: receipt identity mismatch`);
    const source = resolve(root, receipt.source);
    check(
      source.startsWith(join(root, 'assets/blender/')),
      `${worldId}: source outside Blender source directory`,
    );
    const sourceSha256 = await checksum(source);
    const verified = check(
      sourceSha256 === receipt.sourceSha256,
      `${worldId}: editable source checksum mismatch`,
    );
    sourceChecks.push({ worldId, source: receipt.source, sha256: sourceSha256, verified });
    const actualFiles = (await readdir(join(root, folder)))
      .filter((file) => file.endsWith('.glb'))
      .sort();
    check(
      JSON.stringify(actualFiles) === JSON.stringify([...expected].sort()),
      `${worldId}: GLB files differ from canonical selected footprint`,
    );
    check(receipt.exports.length === expected.length, `${worldId}: export receipt count mismatch`);
    check(
      new Set(receipt.exports.map((entry) => entry.path)).size === receipt.exports.length,
      `${worldId}: duplicate export receipt`,
    );
  } catch (error) {
    errors.push(`${worldId}: ${String(error)}`);
    continue;
  }
  for (const filename of expected) {
    const label = `${worldId}/${filename}`;
    const path = join(root, folder, filename);
    const record = receipt.exports.find((entry) => entry.path === `${folder}/${filename}`);
    if (!check(record, `${label}: export receipt missing`)) continue;
    const before = errors.length;
    try {
      const size = (await stat(path)).size;
      if (!check(size <= limits.fileBytes, `${label}: file exceeds 4 MiB`)) continue;
      const bytes = await readFile(path);
      const checksum = sha(bytes);
      check(size === record!.bytes, `${label}: byte count differs from export receipt`);
      check(checksum === record!.sha256, `${label}: export checksum differs from receipt`);
      const document = glbDocument(bytes, label);
      if (document.buffers?.some((buffer) => buffer.uri) || document.images?.length) continue;
      const declaredDecode = (document.bufferViews ?? []).reduce((total, view) => {
        const packed = view.extensions?.EXT_meshopt_compression;
        return total + (packed ? packed.count * packed.byteStride : view.byteLength);
      }, 0);
      if (
        !check(
          declaredDecode <= limits.decodedBytes,
          `${label}: declared decoded buffer views exceed 48 MiB`,
        )
      )
        continue;
      const gltf = await new GLTFLoader()
        .setMeshoptDecoder(MeshoptDecoder)
        .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
      const earth = filename.startsWith('earth');
      const inspected = inspectScene(gltf.scene, label, earth);
      check(
        inspected.summary.triangles === record!.triangles,
        `${label}: decoded triangle count differs from export receipt`,
      );
      let requiredParts: string[];
      if (earth) {
        const studies = new Set(
          system.bodies.map((body) => companionStudy(index, body.body, system)).filter(Boolean),
        );
        if (worldId === 's10') studies.add('orbital-habitat');
        requiredParts = [...earthAssetParts(art), ...[...studies].map((study) => `Study_${study}`)];
      } else {
        const selection = basename(filename, '.glb');
        requiredParts = [`${worldId.toUpperCase()}_${selection}`];
        const id = `${worldId}/${selection}`;
        seenOffworld.push(id);
        structureHashes.set(inspected.summary.structureSha256, [
          ...(structureHashes.get(inspected.summary.structureSha256) ?? []),
          id,
        ]);
        fileHashes.set(checksum, [...(fileHashes.get(checksum) ?? []), id]);
        check(
          inspected.summary.triangles < 20_000,
          `${label}: off-world portrait exceeds 20,000 triangles`,
        );
        check(
          inspected.summary.materialCount <= 11,
          `${label}: off-world portrait exceeds eleven material families`,
        );
      }
      for (const part of requiredParts) {
        const matches = inspected.nodes.get(normalized(part)) ?? [];
        check(
          matches.length === 1,
          `${label}: expected exactly one semantic ${part}, got ${matches.length}`,
        );
        if (matches.length === 1) {
          const extent = bounds(matches[0], `${label}/${part}`);
          check(
            extent.radius > 0.002 && extent.radius < 4,
            `${label}/${part}: unreasonable part size`,
          );
        }
      }
      results.push({
        worldId,
        file: relative(root, path),
        bytes: size,
        sha256: checksum,
        extensions: document.extensionsUsed ?? [],
        declaredDecodedBytes: declaredDecode,
        ...inspected.summary,
        requiredParts,
        passed: before === errors.length,
      });
      inspected.dispose();
      console.log(
        `${label}: ${inspected.summary.triangles} triangles, ${inspected.summary.drawCalls} draws, ${size} bytes`,
      );
    } catch (error) {
      errors.push(`${label}: ${String(error)}`);
    }
  }
}

check(
  JSON.stringify([...seenOffworld].sort()) === JSON.stringify([...expectedOffworld].sort()),
  'Decoded off-world destinations differ from the canonical selected footprint',
);
if (full)
  check(
    expectedOffworld.length === 37,
    `Current canonical view selected ${expectedOffworld.length}, expected the reviewed 37 off-world portraits`,
  );
const duplicateGeometry = [...structureHashes]
  .filter(([, ids]) => ids.length > 1)
  .map(([hash, ids]) => ({ hash, ids }));
const duplicateFiles = [...fileHashes]
  .filter(([, ids]) => ids.length > 1)
  .map(([hash, ids]) => ({ hash, ids }));
check(
  !duplicateGeometry.length,
  `Duplicate off-world structural geometry: ${JSON.stringify(duplicateGeometry)}`,
);
check(!duplicateFiles.length, `Duplicate off-world files: ${JSON.stringify(duplicateFiles)}`);
if (!full)
  warnings.push(
    'This is a selected-world pilot audit; the complete collection has not been audited by this invocation.',
  );
const report = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  scope: full ? 'complete' : 'selected-worlds',
  selectedWorlds,
  passed: errors.length === 0,
  method:
    'Serial CPU-only GLTFLoader + installed MeshoptDecoder; no browser, GPU or Blender process',
  sourceBoundary:
    'Canonical systemPortrait and companionStudy determine destination/study inclusion; geometry is original interpretive art.',
  limits,
  expectedOffworld,
  decodedOffworld: seenOffworld,
  duplicateGeometry,
  duplicateFiles,
  sourceChecks,
  models: results,
  errors,
  warnings,
};
await mkdir(qa, { recursive: true });
const reportPath = join(
  qa,
  full ? 'geometry-audit.json' : `geometry-audit-${selectedWorlds.join('-')}.json`,
);
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      passed: report.passed,
      scope: report.scope,
      models: results.length,
      errors,
      report: relative(root, reportPath),
    },
    null,
    2,
  ),
);
if (errors.length) process.exitCode = 1;
