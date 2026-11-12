import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import prettier from 'prettier';

import { AssetLedgerSchema } from '@janus/domain/asset';

import manifest from '../apps/web/app/planets/props/kit.generated.json';

/**
 * Admit the Blender kit packs (Decision 038) to the asset ledger. Run after
 * `python3 scripts/kit.py export`: it records the checksum of the authoring source and of each
 * published pack, replacing any earlier record of the same pack.
 */
const VERSION = 'blender-kit-v1-2026-11-12';
const ledgerPath = 'data/assets/ledger.json';
const sourceRoot = 'scripts/blender/kit';

async function filesBelow(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const found = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return entry.name === '__pycache__' ? [] : filesBelow(path);
      return entry.name.endsWith('.py') ? [path] : [];
    }),
  );
  return found.flat();
}

const checksum = (data: Buffer | string) =>
  'sha256:' + createHash('sha256').update(data).digest('hex');

const sources = (await filesBelow(sourceRoot)).sort();
const sourceHash = createHash('sha256');
for (const path of sources) sourceHash.update(await readFile(path));
const sourceChecksum = 'sha256:' + sourceHash.digest('hex');

const titles: Record<string, string> = {
  core: 'Janus model kit: opening Earth models and shared Earth relief',
  observer: 'Janus model kit: the alien observer and telescope',
  worlds:
    'Janus model kit: citizens, creatures, plants, buildings and vehicles of the scenario worlds',
  landmarks: 'Janus model kit: scenario landmarks and Solar System bodies',
};
const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
const kindsIn = (pack: string) =>
  Object.values(manifest.kinds as Record<string, { pack: string; of?: string }>).filter(
    (kind) => kind.pack === pack && !kind.of,
  ).length;

for (const [name, pack] of Object.entries(manifest.packs)) {
  const id = `janus.kit.v1.${name}`;
  const contents = await readFile(join('apps/web/public', pack.path));
  const derivativeChecksum = checksum(contents);
  if (derivativeChecksum !== 'sha256:' + pack.sha256)
    throw new Error(`${pack.path} does not match the kit manifest; run the kit export again.`);
  const entry = {
    id,
    title: titles[name] ?? `Janus model kit: ${name}`,
    creator: 'Janus Observatory',
    scenarioId: null,
    artifactId: null,
    kind: 'model',
    sourceUrl: 'https://github.com/nicoceron/janus-observatory',
    sourceAgency: 'Janus Observatory original Blender artwork',
    directFileUrls: [],
    sourceVersion: VERSION,
    retrievedAt: '2026-11-12',
    license: 'Original project artwork commissioned for incorporation into Janus Observatory',
    rightsStatus: 'permission_granted',
    admissionStatus: 'approved',
    requiredCreditText:
      'Original Blender artwork by Janus Observatory, created with AI-assisted modeling scripts. Fictional and interpretive visualization.',
    aiAssistanceDisclosure:
      'Claude (Anthropic) authored the Blender modeling scripts that build every model, the hand-drawn Earth relief and the export pipeline. Architecture, creatures, machines, terrain, proportions and counts are interpretive artwork, not Project Janus scientific artifacts or measured models.',
    allowedTransformations: [
      'animation',
      'material tuning',
      'posing and staging',
      'format conversion',
      'responsive rendering',
      'web optimization',
    ],
    appliedTransformations: [
      'animation',
      'material tuning',
      'posing and staging',
      'format conversion',
      'responsive rendering',
      'web optimization',
    ],
    sourceChecksum,
    derivativeChecksum,
    derivativePublicPath: pack.path,
    maxDisplaySize: null,
    transformations: [
      `Modeled in Blender ${'5.3'} from the Python authoring modules under ${sourceRoot}/ (bmesh solids with chamfered edges, weighted normals and ambient occlusion baked into vertex colour). Editable sources: assets/blender/kit/*.blend.`,
      `Exported by scripts/blender/kit/export.py to a quantised, gzip-compressed pack of ${kindsIn(name)} models (${pack.bytes} bytes; ${pack.rawBytes} decoded). Blender Z-up coordinates are converted to the web Y-up frame. The website instances the models and applies per-instance colour, motion and reflections.`,
    ],
    notes: [
      `Source checksum covers the concatenated UTF-8 files, in this order: ${sources.map((path) => relative('.', path)).join(', ')}.`,
      'Original artwork. No third-party model, texture, photograph, map dataset or illustration is used or reproduced. Continents are a hand-drawn caricature, not a geographic reconstruction; city, creature, vehicle and machine designs are invented illustrations of the Project Janus narratives.',
      'Supersedes the code-drawn props, landmarks and globes of Decision 035 (janus.low-poly.worlds.v7 lineage) and the code-drawn observer and telescope. Evidence: docs/qa/blender-kit/.',
    ],
  };
  const at = ledger.entries.findIndex((item: { id: string }) => item.id === id);
  if (at >= 0) ledger.entries[at] = entry;
  else ledger.entries.push(entry);
}
// Drop records of packs that no longer exist.
ledger.entries = ledger.entries.filter(
  (item: { id: string }) =>
    !item.id.startsWith('janus.kit.v1.') || item.id.slice('janus.kit.v1.'.length) in manifest.packs,
);
AssetLedgerSchema.parse(ledger);
// Written in the repository's own formatting, so recording twice changes nothing.
await writeFile(
  ledgerPath,
  await prettier.format(JSON.stringify(ledger, null, 2), {
    ...((await prettier.resolveConfig(ledgerPath)) ?? {}),
    filepath: ledgerPath,
  }),
);
process.stdout.write(
  `Recorded ${Object.keys(manifest.packs).length} kit pack(s); source ${sourceChecksum}.\n`,
);
