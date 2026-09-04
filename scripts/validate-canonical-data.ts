import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { validateCanonicalRelease } from '@janus/domain';

import earthAtmosphere from '../data/canonical/atmosphere/earth-apjl-table-1.json';
import venusAtmosphere from '../data/canonical/atmosphere/venus-apjl-table-2.json';
import collapse from '../data/canonical/collapse/model-and-reported-results.json';
import observability from '../data/canonical/observability/figure-6.json';
import growth from '../data/canonical/scenarios/growth-table-9.json';
import morphology from '../data/canonical/scenarios/morphology-table-5.json';
import planetary from '../data/canonical/technosignatures/planetary-table-6.json';
import system from '../data/canonical/technosignatures/system-table-8.json';
import generatedManifest from '../data/generated/manifest.json';
import corpusIndex from '../data/generated/research/index.json';
import reviewPacket from '../data/generated/review/canonical-review.json';
import tableSevenReconciliation from '../data/generated/review/reconciliations/paper-01-table-7--paper-03-table-1.json';
import runtimeCollapse from '../data/generated/runtime/collapse.json';
import runtimeEarthAtmosphere from '../data/generated/runtime/earth-atmosphere.json';
import runtimeGrowth from '../data/generated/runtime/growth.json';
import runtimeMorphology from '../data/generated/runtime/morphology.json';
import runtimeObservability from '../data/generated/runtime/observability.json';
import runtimePlanetary from '../data/generated/runtime/planetary.json';
import runtimeReleaseIdentity from '../data/generated/runtime/release-identity.json';
import runtimeSystem from '../data/generated/runtime/system.json';
import runtimeVenusAtmosphere from '../data/generated/runtime/venus-atmosphere.json';
import sourceManifest from '../data/sources/manifest.json';

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const result = validateCanonicalRelease({
  earthAtmosphere,
  venusAtmosphere,
  collapse,
  observability,
  growth,
  morphology,
  planetary,
  system,
  sourceManifest,
});

if (!result.valid) {
  const errors = result.findings
    .filter(({ severity }) => severity === 'error')
    .map(({ code, message }) => `${code}: ${message}`);
  throw new Error(`Canonical release validation failed:\n${errors.join('\n')}`);
}

if (generatedManifest.dataVersion !== corpusIndex.dataVersion) {
  throw new Error('Generated corpus and release manifest use different data versions.');
}
if (generatedManifest.dataVersion !== reviewPacket.dataVersion) {
  throw new Error('Generated review packet and release manifest use different data versions.');
}
if (reviewPacket.releaseStatus !== 'candidate_not_reviewed') {
  throw new Error('Review packet must remain a candidate until an independent reviewer signs it.');
}
if (
  generatedManifest.releaseStatus !== 'candidate_pending_independent_review' ||
  generatedManifest.reviewAttestationHash !== null ||
  runtimeReleaseIdentity.releaseStatus !== 'candidate_pending_independent_review' ||
  runtimeReleaseIdentity.independentHumanReview !== 'pending' ||
  runtimeReleaseIdentity.reviewAttestationHash !== null
) {
  throw new Error('Committed generated artifacts must remain an unsigned release candidate.');
}
if (
  tableSevenReconciliation.dataVersion !== generatedManifest.dataVersion ||
  tableSevenReconciliation.releaseStatus !== 'candidate_not_reviewed' ||
  tableSevenReconciliation.independentHumanReview !== 'pending'
) {
  throw new Error('Table 7/Table 1 reconciliation must match the unsigned release candidate.');
}
if (
  tableSevenReconciliation.foundationalSource.sourceId !== 'JANUS-PAPER-01' ||
  tableSevenReconciliation.foundationalSource.sourceVersion !== 'arXiv:2409.00067v3' ||
  tableSevenReconciliation.foundationalSource.locator.table !== 'Table 7' ||
  tableSevenReconciliation.consolidatedSource.sourceId !== 'JANUS-PAPER-03' ||
  tableSevenReconciliation.consolidatedSource.sourceVersion !== 'arXiv:2511.20329v2' ||
  tableSevenReconciliation.consolidatedSource.locator.table !== 'Table 1'
) {
  throw new Error('Table reconciliation source/version/locator lineage drifted.');
}
const overlap = tableSevenReconciliation.overlap;
if (
  overlap.status !== 'exact_match' ||
  overlap.rowCount !== 10 ||
  overlap.columnCount !== 12 ||
  overlap.cellCount !== 120 ||
  overlap.rows.length !== overlap.rowCount ||
  overlap.columns.length !== overlap.columnCount ||
  overlap.foundationalOverlapHash !== overlap.consolidatedOverlapHash ||
  overlap.rows.some(
    ({ columns, cellCount, status, foundationalValuesHash, consolidatedValuesHash }) =>
      status !== 'exact_match' ||
      columns.length !== overlap.columnCount ||
      cellCount !== overlap.columnCount ||
      foundationalValuesHash !== consolidatedValuesHash,
  )
) {
  throw new Error('Table 7/Table 1 exact overlap coverage is incomplete or inconsistent.');
}
const {
  reconciliationPayloadHash,
  releaseStatus: _releaseStatus,
  independentHumanReview: _independentHumanReview,
  reviewAttestationHash: _reviewAttestationHash,
  reviewApproval: _reviewApproval,
  ...reconciliationPayload
} = tableSevenReconciliation as typeof tableSevenReconciliation & {
  reviewAttestationHash?: string;
  reviewApproval?: unknown;
};
const calculatedReconciliationHash = `sha256:${createHash('sha256')
  .update(canonicalJson(reconciliationPayload))
  .digest('hex')}`;
if (reconciliationPayloadHash !== calculatedReconciliationHash) {
  throw new Error('Table reconciliation payload hash is not deterministic.');
}

const runtimeDatasets = {
  earthAtmosphere: runtimeEarthAtmosphere,
  venusAtmosphere: runtimeVenusAtmosphere,
  collapse: runtimeCollapse,
  observability: runtimeObservability,
  growth: runtimeGrowth,
  morphology: runtimeMorphology,
  planetary: runtimePlanetary,
  system: runtimeSystem,
};
const canonicalDatasets = {
  earthAtmosphere,
  venusAtmosphere,
  collapse,
  observability,
  growth,
  morphology,
  planetary,
  system,
};
for (const name of Object.keys(canonicalDatasets) as Array<keyof typeof canonicalDatasets>) {
  if (canonicalJson(runtimeDatasets[name]) !== canonicalJson(canonicalDatasets[name])) {
    throw new Error(`Generated runtime dataset ${name} drifted from canonical input.`);
  }
}
if (
  reviewPacket.datasets.length !== 8 ||
  reviewPacket.datasets.some(({ independentHumanReview }) => independentHumanReview !== 'pending')
) {
  throw new Error('Every canonical dataset needs an explicit pending independent-review record.');
}

for (const file of generatedManifest.files) {
  const path = resolve('data/generated', file.path);
  const contents = await readFile(path);
  const metadata = await stat(path);
  const digest = createHash('sha256').update(contents).digest('hex');
  if (digest !== file.sha256 || metadata.size !== file.bytes) {
    throw new Error(`${file.path} does not match the generated release manifest.`);
  }
}

const renderedReviewPages = generatedManifest.files.filter(
  ({ path }) => path.startsWith('review/pages/') && path.endsWith('.html'),
);
if (renderedReviewPages.length !== reviewPacket.datasets.length + 1) {
  throw new Error('Rendered source-to-normalized pages must cover every canonical dataset.');
}
for (const { path } of renderedReviewPages) {
  const contents = await readFile(resolve('data/generated', path), 'utf8');
  if (!contents.includes('data-review-status="candidate_not_reviewed"')) {
    throw new Error(`${path} does not visibly preserve unsigned review status.`);
  }
}

for (const finding of result.findings.filter(({ severity }) => severity === 'warning')) {
  process.stdout.write(`warning ${finding.code}: ${finding.message}\n`);
}
process.stdout.write(
  `Validated ${result.datasets.length} canonical datasets, ${result.coverage.scenarios} scenarios, ` +
    `${result.coverage.missions} missions, ${result.coverage.provenancedFields} exact field ` +
    `provenance records, ${overlap.cellCount} reconciled cross-paper cells, and ` +
    `${generatedManifest.files.length} generated files.\n`,
);
