import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';

import { AssetLedgerSchema, type AssetLedgerEntry } from '@janus/domain/asset';

import ledgerJson from '../data/assets/ledger.json';

type InspectedMedia = {
  mimeType: 'image/jpeg' | 'image/webp' | 'model/gltf-binary';
  widthPx?: number;
  heightPx?: number;
};

const ledger = AssetLedgerSchema.parse(ledgerJson);
const publicRoot = resolve('apps/web/public');
const publicAssetRoot = resolve(publicRoot, 'assets');
const ids = new Set<string>();
const entriesByPublicPath = new Map<string, AssetLedgerEntry[]>();
const admittedPublicPaths = new Set<string>();
let verifiedDerivativeRecords = 0;

async function filesBelow(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? filesBelow(path) : [path];
      }),
    )
  ).flat();
}

function inspectWebp(contents: Buffer): InspectedMedia {
  if (
    contents.length < 30 ||
    contents.toString('ascii', 0, 4) !== 'RIFF' ||
    contents.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    throw new Error('Invalid WebP signature.');
  }

  const chunk = contents.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    return {
      mimeType: 'image/webp',
      widthPx: 1 + contents.readUIntLE(24, 3),
      heightPx: 1 + contents.readUIntLE(27, 3),
    };
  }
  if (chunk === 'VP8L') {
    if (contents[20] !== 0x2f) throw new Error('Invalid lossless WebP signature.');
    const dimensions = contents.readUInt32LE(21);
    return {
      mimeType: 'image/webp',
      widthPx: 1 + (dimensions & 0x3fff),
      heightPx: 1 + ((dimensions >>> 14) & 0x3fff),
    };
  }
  if (chunk === 'VP8 ') {
    if (contents.toString('hex', 23, 26) !== '9d012a') {
      throw new Error('Invalid lossy WebP frame header.');
    }
    return {
      mimeType: 'image/webp',
      widthPx: contents.readUInt16LE(26) & 0x3fff,
      heightPx: contents.readUInt16LE(28) & 0x3fff,
    };
  }
  throw new Error(`Unsupported WebP chunk ${JSON.stringify(chunk)}.`);
}

function inspectJpeg(contents: Buffer): InspectedMedia {
  if (contents.length < 4 || contents[0] !== 0xff || contents[1] !== 0xd8) {
    throw new Error('Invalid JPEG signature.');
  }

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;
  while (offset + 3 < contents.length) {
    while (contents[offset] === 0xff) offset += 1;
    const marker = contents[offset];
    offset += 1;
    if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;

    const segmentLength = contents.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > contents.length) {
      throw new Error('Invalid JPEG segment length.');
    }
    if (startOfFrameMarkers.has(marker)) {
      return {
        mimeType: 'image/jpeg',
        heightPx: contents.readUInt16BE(offset + 3),
        widthPx: contents.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  throw new Error('JPEG dimensions were not found.');
}

function inspectGlb(contents: Buffer): InspectedMedia {
  if (contents.length < 12 || contents.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error('Invalid binary glTF signature.');
  }
  const version = contents.readUInt32LE(4);
  const declaredLength = contents.readUInt32LE(8);
  if (version !== 2) throw new Error(`Unsupported binary glTF version ${version}.`);
  if (declaredLength !== contents.length) {
    throw new Error(
      `Binary glTF length mismatch: header declares ${declaredLength}, file has ${contents.length}.`,
    );
  }
  return { mimeType: 'model/gltf-binary' };
}

function inspectMedia(path: string, contents: Buffer): InspectedMedia {
  const extension = extname(path).toLowerCase();
  if (extension === '.webp') return inspectWebp(contents);
  if (extension === '.jpg' || extension === '.jpeg') return inspectJpeg(contents);
  if (extension === '.glb') return inspectGlb(contents);
  throw new Error(`Unsupported public asset extension ${extension || '(none)'}.`);
}

function assertExpectedMedia(entry: AssetLedgerEntry, media: InspectedMedia) {
  if (
    (entry.kind === 'image' || entry.kind === 'texture') &&
    !media.mimeType.startsWith('image/')
  ) {
    throw new Error(`${entry.id} is a ${entry.kind} record but decodes as ${media.mimeType}.`);
  }
  if (
    entry.kind === 'model' &&
    media.mimeType !== 'model/gltf-binary' &&
    !media.mimeType.startsWith('image/')
  ) {
    throw new Error(
      `${entry.id} is a model record but its derivative decodes as ${media.mimeType}.`,
    );
  }

  if (media.mimeType.startsWith('image/')) {
    if (!entry.maxDisplaySize) {
      throw new Error(`${entry.id} is a public raster without maxDisplaySize.`);
    }
    if (
      entry.maxDisplaySize.widthPx !== media.widthPx ||
      entry.maxDisplaySize.heightPx !== media.heightPx
    ) {
      throw new Error(
        `${entry.id} maxDisplaySize ${entry.maxDisplaySize.widthPx}x${entry.maxDisplaySize.heightPx} does not match decoded ${media.widthPx}x${media.heightPx}.`,
      );
    }
  } else if (entry.maxDisplaySize !== null) {
    throw new Error(`${entry.id} is non-raster media and must use maxDisplaySize = null.`);
  }
}

function assertNoDuplicates(values: string[], label: string, id: string) {
  if (new Set(values).size !== values.length) {
    throw new Error(`${id} contains duplicate ${label}.`);
  }
}

for (const entry of ledger.entries) {
  if (ids.has(entry.id)) throw new Error(`Asset ledger contains duplicate ID ${entry.id}.`);
  ids.add(entry.id);

  assertNoDuplicates(entry.allowedTransformations, 'allowed transformations', entry.id);
  assertNoDuplicates(entry.appliedTransformations, 'applied transformations', entry.id);

  if (
    entry.rightsStatus === 'all_rights_reserved' &&
    (entry.admissionStatus !== 'link_only' || entry.derivativePublicPath)
  ) {
    throw new Error(`${entry.id} is all-rights-reserved and must remain link-only.`);
  }
  if (entry.admissionStatus === 'link_only') {
    if (entry.sourceChecksum || entry.derivativeChecksum || entry.derivativePublicPath) {
      throw new Error(`${entry.id} is link-only but records a local checksum or derivative.`);
    }
    if (entry.transformations.length > 0 || entry.appliedTransformations.length > 0) {
      throw new Error(`${entry.id} is link-only but records a local transformation.`);
    }
  }
  if (entry.admissionStatus === 'excluded' && entry.derivativePublicPath) {
    throw new Error(`${entry.id} is excluded but publishes a derivative.`);
  }
  if (entry.admissionStatus === 'approved' && !entry.requiredCreditText.trim()) {
    throw new Error(`${entry.id} is approved without required credit text.`);
  }
  if (
    entry.admissionStatus === 'approved' &&
    (entry.rightsStatus === 'verified_open' || entry.rightsStatus === 'nasa_reuse_guidelines') &&
    !entry.licenseUrl
  ) {
    throw new Error(`${entry.id} is open/reusable but lacks a license or usage-policy URL.`);
  }
  if (!entry.derivativePublicPath) continue;
  if (entry.admissionStatus !== 'approved') {
    throw new Error(`${entry.id} publishes a derivative without approved admission status.`);
  }
  if (!entry.sourceChecksum || !entry.derivativeChecksum || entry.transformations.length === 0) {
    throw new Error(
      `${entry.id} has a public derivative without both checksums and transformation history.`,
    );
  }

  const publicFile = resolve(publicRoot, entry.derivativePublicPath.slice(1));
  if (!publicFile.startsWith(`${publicRoot}${sep}`)) {
    throw new Error(`${entry.id} derivative path escapes apps/web/public.`);
  }
  const contents = await readFile(publicFile);
  const actual = `sha256:${createHash('sha256').update(contents).digest('hex')}`;
  if (actual !== entry.derivativeChecksum) {
    throw new Error(
      `${entry.id} derivative checksum mismatch: expected ${entry.derivativeChecksum}, received ${actual}.`,
    );
  }

  let media: InspectedMedia;
  try {
    media = inspectMedia(publicFile, contents);
  } catch (error) {
    throw new Error(
      `${entry.id} public derivative failed media inspection: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  assertExpectedMedia(entry, media);

  const existing = entriesByPublicPath.get(entry.derivativePublicPath) ?? [];
  existing.push(entry);
  entriesByPublicPath.set(entry.derivativePublicPath, existing);
  admittedPublicPaths.add(relative(publicRoot, publicFile));
  verifiedDerivativeRecords += 1;
}

for (const [publicPath, entries] of entriesByPublicPath) {
  if (entries.length === 1) continue;
  const sharedGroups = new Set(entries.map(({ sharedDerivativeGroup }) => sharedDerivativeGroup));
  const checksums = new Set(entries.map(({ derivativeChecksum }) => derivativeChecksum));
  if (sharedGroups.size !== 1 || sharedGroups.has(undefined) || checksums.size !== 1) {
    throw new Error(
      `${publicPath} is claimed by multiple records without one explicit sharedDerivativeGroup and checksum: ${entries.map(({ id }) => id).join(', ')}.`,
    );
  }
}

const earthTextureFamilies = [
  ['earth-day', 'solarsystemscope.texture.earth-day-threejs'],
  ['earth-night', 'solarsystemscope.texture.earth-night-threejs'],
  ['earth-bump-roughness-clouds', 'solarsystemscope.texture.earth-bump-clouds-threejs'],
] as const;
for (const [fileStem, baseId] of earthTextureFamilies) {
  const expectedTiers = [
    { id: `${baseId}.1k`, path: `/assets/planets/${fileStem}-1024.webp`, widthPx: 1024 },
    { id: `${baseId}.2k`, path: `/assets/planets/${fileStem}-2048.webp`, widthPx: 2048 },
    { id: baseId, path: `/assets/planets/${fileStem}-4096.jpg`, widthPx: 4096 },
  ];
  const family = ledger.entries.filter(({ id }) => id === baseId || id.startsWith(`${baseId}.`));
  if (family.length !== expectedTiers.length) {
    throw new Error(`${baseId} must provide exactly the 1K, 2K, and 4K tiers.`);
  }
  if (new Set(family.map(({ sourceChecksum }) => sourceChecksum)).size !== 1) {
    throw new Error(`${baseId} responsive tiers do not share one source checksum.`);
  }
  for (const expected of expectedTiers) {
    const entry = family.find(({ id }) => id === expected.id);
    if (
      !entry ||
      entry.derivativePublicPath !== expected.path ||
      entry.maxDisplaySize?.widthPx !== expected.widthPx ||
      entry.maxDisplaySize.heightPx !== expected.widthPx / 2
    ) {
      throw new Error(
        `${expected.id} must resolve to ${expected.path} at ${expected.widthPx}x${expected.widthPx / 2}.`,
      );
    }
  }
}

const uncoveredPublicAssets = (await filesBelow(publicAssetRoot))
  .map((path) => relative(publicRoot, path))
  .filter((path) => !admittedPublicPaths.has(path));
if (uncoveredPublicAssets.length > 0) {
  throw new Error(
    `Public assets lack an approved ledger derivative record:\n${uncoveredPublicAssets.join('\n')}`,
  );
}

process.stdout.write(
  `Validated ${ledger.entries.length} rights records, ${verifiedDerivativeRecords} derivative records across ${admittedPublicPaths.size} public files, decoded media dimensions/MIME, responsive tiers, and complete /public/assets coverage.\n`,
);
