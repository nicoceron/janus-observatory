import { createHash } from 'node:crypto';
import { readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AssetLedgerSchema, type AssetLedgerEntry } from '@janus/domain/asset';

import { allScenarioProfiles } from '../apps/web/lib/canonical-core';
import { systemPortrait } from '../apps/web/lib/system-portrait';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const qa = 'docs/qa/blender-finish';
const prefix = 'janus.blender.v1.';
const version = 'blender-orbit-crops-v11-2026-09-20';
const worlds = ['origin', ...allScenarioProfiles.map((profile) => profile.id.toLowerCase())];

type Input = { path: string; checksum: string; bytes: number };
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
  scenes: string[];
  interpretive: boolean;
};
type BuildAttempt = {
  status: string;
  exitCode: number | null;
  fingerprints: { builder: string; modules: Record<string, string>; seeds: Record<string, string> };
  requiredOutputs: Record<string, string>;
};

export function checksum(buffer: Buffer | string) {
  return 'sha256:' + createHash('sha256').update(buffer).digest('hex');
}

function expectedChecksum(hash: unknown) {
  if (typeof hash !== 'string' || !/^(sha256:)?[a-f0-9]{64}$/.test(hash)) {
    throw new Error('Invalid SHA-256 in Blender production receipt.');
  }
  return hash.startsWith('sha256:') ? hash : 'sha256:' + hash;
}

/** Verify the actual delivery format instead of merely copying exporter settings into provenance. */
export function inspectGlb(contents: Buffer) {
  if (contents.length < 20 || contents.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error('Not a binary glTF asset.');
  }
  if (contents.readUInt32LE(4) !== 2 || contents.readUInt32LE(8) !== contents.length) {
    throw new Error('Invalid binary glTF version or declared length.');
  }
  const jsonLength = contents.readUInt32LE(12);
  if (contents.readUInt32LE(16) !== 0x4e4f534a || jsonLength + 20 > contents.length) {
    throw new Error('Missing or invalid glTF JSON chunk.');
  }
  const document = JSON.parse(contents.toString('utf8', 20, 20 + jsonLength)) as {
    asset?: { version?: string; generator?: string };
    extensionsUsed?: string[];
    buffers?: { uri?: string }[];
    images?: { uri?: string }[];
    meshes?: unknown[];
    materials?: unknown[];
    animations?: unknown[];
    nodes?: { name?: string }[];
  };
  if (document.asset?.version !== '2.0') throw new Error('Unexpected glTF asset version.');
  if (!document.extensionsUsed?.includes('EXT_meshopt_compression')) {
    throw new Error(
      'Expected EXT_meshopt_compression is absent; do not claim unperformed optimization.',
    );
  }
  for (const resource of [...(document.buffers ?? []), ...(document.images ?? [])]) {
    if (resource.uri && !resource.uri.startsWith('data:')) {
      throw new Error(`External glTF resource requires separate admission: ${resource.uri}`);
    }
  }
  return {
    generator: document.asset.generator ?? null,
    extensions: document.extensionsUsed,
    meshCount: document.meshes?.length ?? 0,
    materialCount: document.materials?.length ?? 0,
    animationCount: document.animations?.length ?? 0,
    namedNodes: (document.nodes ?? []).flatMap((node) => (node.name ? [node.name] : [])),
  };
}

async function input(path: string): Promise<Input> {
  const contents = await readFile(resolve(root, path));
  return { path, checksum: checksum(contents), bytes: contents.length };
}

async function pythonInputs(directory = 'scripts/blender'): Promise<Input[]> {
  const files = await readdir(resolve(root, directory), { withFileTypes: true });
  const result: Input[] = [];
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    if (file.isDirectory() && file.name !== '__pycache__') {
      result.push(...(await pythonInputs(directory + '/' + file.name)));
    } else if (file.isFile() && file.name.endsWith('.py')) {
      result.push(await input(directory + '/' + file.name));
    }
  }
  return result;
}

function assertSameHashes(
  expected: Record<string, string>,
  actual: Record<string, string>,
  label: string,
) {
  const names = Object.keys(expected).sort();
  if (
    JSON.stringify(names) !== JSON.stringify(Object.keys(actual).sort()) ||
    names.some((name) => expectedChecksum(expected[name]) !== expectedChecksum(actual[name]))
  ) {
    throw new Error(
      `${label} fingerprints changed since the successful Blender build. Rebuild before admitting current inputs.`,
    );
  }
}

function expectedNames(world: string) {
  const profile = allScenarioProfiles.find((entry) => entry.id.toLowerCase() === world);
  const portrait = profile ? systemPortrait(profile).art : { bodies: [], features: [] };
  return [
    'earth.glb',
    'earth-mobile.glb',
    ...portrait.bodies.map((body) => body.body + '.glb'),
    ...portrait.features.map((feature) => feature + '.glb'),
  ].sort();
}

async function atomicWrite(path: string, contents: string) {
  const destination = resolve(root, path);
  const temporary = destination + '.tmp-' + process.pid;
  await writeFile(temporary, contents);
  await rename(temporary, destination);
}

/** No writes occur until every model, derivative, source fingerprint and ledger entry validates. */
export async function recordBlenderArt() {
  const ledgerPath = 'data/assets/ledger.json';
  const ledgerText = await readFile(resolve(root, ledgerPath), 'utf8');
  const ledger = JSON.parse(ledgerText) as {
    schemaVersion: string;
    reviewedAt: string;
    entries: AssetLedgerEntry[];
  };
  AssetLedgerSchema.parse(ledger);
  const template = ledger.entries.find((entry) => entry.id === 'janus.low-poly.worlds.v7');
  if (
    !template ||
    template.rightsStatus !== 'permission_granted' ||
    template.admissionStatus !== 'approved'
  ) {
    throw new Error('The approved original-project artwork rights record is missing.');
  }
  const modules = await pythonInputs();
  const moduleHashes = Object.fromEntries(modules.map((file) => [file.path, file.checksum]));
  const seedExporter = await input('scripts/export-blender-seeds.ts');
  const recorder = await input('scripts/record-blender-art.ts');
  const seedReceipts = JSON.parse(await readFile(resolve(root, qa, 'seeds.json'), 'utf8')) as {
    id: string;
    path: string;
    bytes: number;
    checksum: string;
  }[];
  const admitted: AssetLedgerEntry[] = [];
  const sources = [];
  const derivatives = [];
  const versions = new Set<string>();
  const seenPublicPaths = new Set<string>();

  for (const world of worlds) {
    const receiptPath = `${qa}/model-${world}.json`;
    const model = JSON.parse(await readFile(resolve(root, receiptPath), 'utf8')) as ModelReceipt;
    if (model.world !== world || !model.interpretive || !/^5\.2(?:\.|\b)/.test(model.blender)) {
      throw new Error(`${receiptPath}: expected interpretive ${world} model from Blender 5.2.`);
    }
    versions.add(model.blender);
    const sourcePath = `assets/blender/${world}.blend`;
    if (model.source !== sourcePath) throw new Error(`${world}: unexpected source path.`);
    const source = await input(sourcePath);
    if (source.checksum !== expectedChecksum(model.sourceSha256)) {
      throw new Error(`${world}: editable .blend checksum differs from the model receipt.`);
    }
    const seed = await input(`assets/blender/seeds/${world}.json`);
    const seedReceipt = seedReceipts.find((item) => item.id === world);
    if (
      !seedReceipt ||
      seedReceipt.path !== seed.path ||
      seedReceipt.bytes !== seed.bytes ||
      expectedChecksum(seedReceipt.checksum) !== seed.checksum
    ) {
      throw new Error(`${world}: seed bytes/hash differ from the original-art exchange receipt.`);
    }
    const resourcesPath = `${qa}/build-${world}.resources.json`;
    const resources = JSON.parse(await readFile(resolve(root, resourcesPath), 'utf8')) as {
      attempts: BuildAttempt[];
    };
    const attempt = resources.attempts.at(-1);
    if (!attempt || attempt.status !== 'success' || attempt.exitCode !== 0) {
      throw new Error(`${world}: latest resource-monitored build is not successful.`);
    }
    assertSameHashes(attempt.fingerprints.modules, moduleHashes, `${world} Python modules`);
    assertSameHashes(
      attempt.fingerprints.seeds,
      { [`${world}.json`]: seed.checksum },
      `${world} seed`,
    );
    if (
      expectedChecksum(attempt.fingerprints.builder) !==
      moduleHashes['scripts/blender/finish_world.py']
    ) {
      throw new Error(`${world}: root builder fingerprint differs from its successful build.`);
    }
    if (attempt.requiredOutputs?.[source.path] !== source.checksum) {
      throw new Error(`${world}: resource receipt does not certify the current source blend.`);
    }
    const names = model.exports.map((item) => basename(item.path)).sort();
    if (JSON.stringify(names) !== JSON.stringify(expectedNames(world))) {
      throw new Error(
        `${world}: exported filenames do not match both Earth tiers and its canonical selected footprint.`,
      );
    }
    const publicDirectory = `apps/web/public/assets/blender/v1/${world}`;
    const actualNames = (await readdir(resolve(root, publicDirectory)))
      .filter((name) => name.endsWith('.glb'))
      .sort();
    if (JSON.stringify(actualNames) !== JSON.stringify(names)) {
      throw new Error(`${world}: unreceipted or missing GLB in the public delivery directory.`);
    }
    sources.push({
      world,
      ...source,
      seed,
      modelReceipt: await input(receiptPath),
      resourceReceipt: await input(resourcesPath),
      scenes: model.scenes,
      blender: model.blender,
    });

    for (const exported of [...model.exports].sort((a, b) => a.path.localeCompare(b.path))) {
      const filename = basename(exported.path);
      if (exported.path !== `${publicDirectory}/${filename}`)
        throw new Error(`${world}: unexpected derivative path.`);
      const contents = await readFile(resolve(root, exported.path));
      const derivativeChecksum = checksum(contents);
      if (
        contents.length !== exported.bytes ||
        derivativeChecksum !== expectedChecksum(exported.sha256)
      ) {
        throw new Error(
          `${exported.path}: current GLB bytes/hash differ from its Blender model receipt.`,
        );
      }
      const media = inspectGlb(contents);
      if (!media.meshCount) throw new Error(`${exported.path}: empty runtime geometry.`);
      for (const part of exported.parts) {
        if (!media.namedNodes.includes(part))
          throw new Error(`${exported.path}: exported semantic pivot ${part} is missing.`);
      }
      const publicPath =
        '/' + relative(resolve(root, 'apps/web/public'), resolve(root, exported.path));
      if (seenPublicPaths.has(publicPath)) throw new Error(`Duplicate derivative ${publicPath}.`);
      seenPublicPaths.add(publicPath);
      const scenarioId =
        world === 'origin' ? null : (world.toUpperCase() as AssetLedgerEntry['scenarioId']);
      const title = `${world === 'origin' ? 'Opening Earth' : world.toUpperCase()} — ${filename.replace(/\.glb$/, '')} Blender miniature`;
      const transformations = [
        `Original geometry exchange from ${seed.path} (${seed.checksum}) into an editable Blender ${model.blender} source scene, with native scenario-specific constructed details and materials.`,
        'Waterways reserve full hull turning envelopes; shore-facing piers remain outside every swept route. Airfields, roads and piers retain named editable semantic groups; cumulus lobes use a bounded Blender remesh modifier; lunar craters and Martian valleys are integrated into the body mesh. A disposable export copy combines editable components into compact semantic-part meshes. Local actor, mechanism and inspection pivots are retained; the website preserves its R3F motion controller.',
        `Official Blender glTF 2.0 exporter with verified EXT_meshopt_compression; source ${source.path} → ${exported.path}. Blender Z-up coordinates return to glTF Y-up.`,
      ];
      const appliedTransformations: AssetLedgerEntry['appliedTransformations'] = [
        'material tuning',
        'posing and staging',
        'format conversion',
        'responsive rendering',
        'web optimization',
      ];
      admitted.push({
        id: `${prefix}${world}.${filename.replace(/\.glb$/, '').toLowerCase()}`,
        title,
        creator: template.creator,
        scenarioId,
        artifactId: null,
        kind: 'model',
        sourceUrl: template.sourceUrl,
        sourceAgency: template.sourceAgency,
        directFileUrls: [],
        sourceVersion: version,
        retrievedAt: '2026-09-11',
        license: template.license,
        rightsStatus: template.rightsStatus,
        admissionStatus: template.admissionStatus,
        requiredCreditText: template.requiredCreditText,
        aiAssistanceDisclosure:
          'OpenAI Codex authored the original geometry exchange and Blender modeling scripts. Exact architecture, terrain, dimensions, materials and motion are interpretive artwork, not Project Janus scientific artifacts or measured models.',
        allowedTransformations: [...appliedTransformations],
        appliedTransformations,
        sourceChecksum: source.checksum,
        derivativeChecksum,
        derivativePublicPath: publicPath,
        maxDisplaySize: null,
        transformations,
        notes: [
          `Editable source: ${source.path}. Production receipt: ${receiptPath}. Input and derivative manifest: ${qa}/art-manifest.json.`,
          'The selected body/activity footprint follows reviewed canonical data. Model designs, counts, sizes and separations are artistic choices, not scientific encodings. No external image, model, restricted PDF or source illustration is bundled.',
          'Earlier original-project artwork ledger entries and their historical checksums are preserved.',
        ],
      });
      derivatives.push({
        id: admitted.at(-1)!.id,
        world,
        filename,
        path: exported.path,
        publicPath,
        sourcePath: source.path,
        sourceChecksum: source.checksum,
        derivativeChecksum,
        bytes: contents.length,
        triangles: exported.triangles,
        parts: exported.parts,
        ...media,
      });
    }
  }

  if (sources.length !== 11 || derivatives.length !== 59) {
    throw new Error(
      `Incomplete delivery: found ${sources.length}/11 source blends and ${derivatives.length}/59 GLBs.`,
    );
  }
  const untouched = ledger.entries.filter((entry) => !entry.id.startsWith(prefix));
  const nextLedger = { ...ledger, entries: [...untouched, ...admitted] };
  AssetLedgerSchema.parse(nextLedger);
  if (new Set(nextLedger.entries.map((entry) => entry.id)).size !== nextLedger.entries.length) {
    throw new Error('Duplicate asset IDs after original Blender-art admission.');
  }
  const manifest = {
    schemaVersion: '1.0.0',
    version,
    contentOrigin: 'interpretive',
    assetPrefix: prefix,
    checksumAlgorithm: 'sha256',
    inputFiles: [...modules, seedExporter, recorder],
    seedExchangeReceipt: await input(`${qa}/seeds.json`),
    sources,
    derivatives,
    verification: {
      sourceBlends: sources.length,
      runtimeGlbs: derivatives.length,
      sourceAndDerivativeChecksums: true,
      modelReceipts: true,
      successfulBuildFingerprints: true,
      meshoptCompression: true,
      semanticPivotNames: true,
      originalProjectRights: true,
      canonicalScientificDataModified: false,
      blenderVersions: [...versions].sort(),
    },
    limits: [
      'Rights/provenance and binary checks do not certify visual polish, accessibility, browser performance or the scientific interpretation. See the separate Blender finishing QA report.',
    ],
  };
  const links = {
    version,
    manifest: `${qa}/art-manifest.json`,
    rightsReport: `${qa}/asset-rights.md`,
    editableSources: sources.map(({ world, path }) => ({ world, path })),
    assets: derivatives.map(({ id, publicPath, sourcePath, derivativeChecksum }) => ({
      id,
      href: publicPath,
      sourcePath,
      derivativeChecksum,
    })),
  };
  const totalBytes = derivatives.reduce((sum, item) => sum + item.bytes, 0);
  const rightsReport =
    `# Blender original-art admission\n\nVersion: \`${version}\`.\n\n` +
    `Verified **${sources.length} editable Blender sources** and **${derivatives.length} runtime GLBs** (${totalBytes.toLocaleString('en-US')} bytes total across all optional assets). Each source and derivative checksum matches its production receipt. Source modules and per-world seeds match the latest successful monitored builds.\n\n` +
    `These are original Janus Observatory artworks commissioned by the user for this project, admitted under the existing original-project permission record. All existing records outside \`${prefix}\` are preserved. No external model, texture, restricted PDF or reference-image pixels are incorporated.\n\n` +
    `Required credit: ${template.requiredCreditText}\n\n` +
    `Blender ${[...versions].sort().join(', ')} produced glTF 2.0 with verified EXT_meshopt_compression. Native editable components become compact semantic meshes; local R3F pivots are retained. Exact shapes, dimensions, counts, materials and designs are interpretive, not measured scientific data.\n\n` +
    `[Full input and derivative checksums](art-manifest.json) · [Source and public-asset links](asset-links.json) · [Asset ledger](../../../data/assets/ledger.json)\n\n` +
    `This report establishes asset rights and production provenance. Visual review, motion, browser performance, fallback and accessibility remain separate acceptance checks.\n`;

  // Re-read immediately before committing to avoid overwriting another agent's unrelated admission.
  if ((await readFile(resolve(root, ledgerPath), 'utf8')) !== ledgerText) {
    throw new Error('Asset ledger changed during verification; retry against the current ledger.');
  }
  await atomicWrite(`${qa}/art-manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  await atomicWrite(`${qa}/asset-links.json`, JSON.stringify(links, null, 2) + '\n');
  await atomicWrite(`${qa}/asset-rights.md`, rightsReport);
  await atomicWrite(ledgerPath, JSON.stringify(nextLedger, null, 2) + '\n');
  console.log(
    `Admitted ${admitted.length} original Blender GLBs from ${sources.length} verified sources. ${qa}/art-manifest.json`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await recordBlenderArt();
}
