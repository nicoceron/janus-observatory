import { createHash } from 'node:crypto';
import { access, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { SourceManifestSchema } from '@janus/domain';

const manifestPath = resolve('data/sources/manifest.json');
const manifest = SourceManifestSchema.parse(JSON.parse(await readFile(manifestPath, 'utf8')));

const ids = new Set(manifest.entries.map(({ id }) => id));
if (ids.size !== manifest.entries.length) {
  throw new Error('Source manifest IDs must be unique.');
}

const citationIds = manifest.entries.flatMap(({ citationId }) =>
  citationId === undefined ? [] : [citationId],
);
if (new Set(citationIds).size !== citationIds.length) {
  throw new Error('Source manifest citation aliases must be unique.');
}

const papers = manifest.entries.filter(({ kind }) => kind === 'paper' || kind === 'preprint');
const scenarios = manifest.entries.filter(({ kind }) => kind === 'scenario_pipeline');
if (papers.length !== 5 || scenarios.length !== 10) {
  throw new Error(
    `Expected 5 papers and 10 scenarios; found ${papers.length} and ${scenarios.length}.`,
  );
}
const expectedPaperCitationIds = papers.map(({ citationId }) => citationId);
if (
  expectedPaperCitationIds.some((citationId, index) => citationId !== `JANUS-PAPER-0${index + 1}`)
) {
  throw new Error('The five locked papers must preserve the public JANUS-PAPER-01..05 aliases.');
}

let verifiedFiles = 0;
for (const entry of manifest.entries) {
  if (!entry.localPath || !entry.sha256 || !entry.bytes || !entry.pageCount) {
    throw new Error(`${entry.id} is missing its local lock metadata.`);
  }
  const path = resolve(entry.localPath);
  try {
    await access(path);
  } catch {
    continue;
  }
  const contents = await readFile(path);
  const metadata = await stat(path);
  const digest = createHash('sha256').update(contents).digest('hex');
  if (digest !== entry.sha256 || metadata.size !== entry.bytes) {
    throw new Error(`${entry.id} no longer matches its locked checksum or size.`);
  }
  if (!contents.subarray(0, 4).equals(Buffer.from('%PDF'))) {
    throw new Error(`${entry.id} is not a PDF.`);
  }
  verifiedFiles += 1;
}

if (verifiedFiles > 0 && verifiedFiles !== manifest.entries.length) {
  throw new Error(
    `Source lock is partial: found ${verifiedFiles} of ${manifest.entries.length} declared files.`,
  );
}
if (process.env.JANUS_REQUIRE_SOURCE_FILES === 'true' && verifiedFiles === 0) {
  throw new Error('Strict source validation requires the ignored source-lock files.');
}

const missingLicense = scenarios.filter(
  ({ license, rightsStatus }) => license !== null || rightsStatus !== 'metadata_missing',
);
if (missingLicense.length > 0) {
  throw new Error(
    'Zenodo scenario PDFs must remain metadata_missing until the record is clarified.',
  );
}

process.stdout.write(
  `Validated ${manifest.entries.length} source records: ${papers.length} papers, ${scenarios.length} scenario pipelines; ` +
    `${verifiedFiles === 0 ? 'metadata-only (ignored source files unavailable)' : `${verifiedFiles} checksums verified`}.\n`,
);
