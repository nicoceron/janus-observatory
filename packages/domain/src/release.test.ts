import { describe, expect, it } from 'vitest';

import earthAtmosphere from '../../../data/canonical/atmosphere/earth-apjl-table-1.json';
import venusAtmosphere from '../../../data/canonical/atmosphere/venus-apjl-table-2.json';
import collapse from '../../../data/canonical/collapse/model-and-reported-results.json';
import observability from '../../../data/canonical/observability/figure-6.json';
import growth from '../../../data/canonical/scenarios/growth-table-9.json';
import morphology from '../../../data/canonical/scenarios/morphology-table-5.json';
import planetary from '../../../data/canonical/technosignatures/planetary-table-6.json';
import system from '../../../data/canonical/technosignatures/system-table-8.json';
import sourceManifest from '../../../data/sources/manifest.json';
import { ReviewerRecordSchema, validateCanonicalRelease } from './release';

const release = {
  earthAtmosphere,
  venusAtmosphere,
  collapse,
  observability,
  growth,
  morphology,
  planetary,
  system,
  sourceManifest,
};

describe('canonical release validation', () => {
  it('resolves every canonical dataset to one verified-open source manifest entry', () => {
    const result = validateCanonicalRelease(release);

    expect(result.valid).toBe(true);
    expect(result.datasets).toHaveLength(8);
    expect(
      result.datasets.every(({ resolvedManifestId }) => resolvedManifestId !== 'unresolved'),
    ).toBe(true);
    expect(result.coverage.provenancedFields).toBe(1361);
  });

  it('fails closed when a field locator loses its exact source column', () => {
    const broken = structuredClone(morphology);
    delete (broken.records[0]!.economy.sourceRefs[0]!.locator as { column?: string }).column;

    const result = validateCanonicalRelease({ ...release, morphology: broken });

    expect(result.valid).toBe(false);
    expect(result.findings.some(({ code }) => code === 'FIELD_LOCATOR_NOT_EXACT')).toBe(true);
  });

  it('reports rather than erases cross-publication growth-rate discrepancies', () => {
    const result = validateCanonicalRelease(release);
    const discrepancy = result.findings.find(
      ({ code }) => code === 'PUBLISHED_GROWTH_RATE_DISCREPANCY',
    );

    expect(discrepancy?.severity).toBe('warning');
    expect(discrepancy?.scenarioIds).toContain('S1');
    expect(discrepancy?.scenarioIds).toContain('S6');
  });

  it('fails closed when one scenario record is missing', () => {
    const broken = structuredClone(growth);
    broken.records = broken.records.filter(({ scenarioId }) => scenarioId !== 'S10');

    expect(() => validateCanonicalRelease({ ...release, growth: broken })).toThrow();
  });

  it('does not combine a known citation alias with a different known source version', () => {
    const broken = structuredClone(earthAtmosphere);
    broken.source.sourceId = 'JANUS-PAPER-01';
    broken.source.sourceVersion = 'arXiv:2511.20329v2';

    const result = validateCanonicalRelease({ ...release, earthAtmosphere: broken });

    expect(result.valid).toBe(false);
    expect(
      result.findings.some(
        ({ code, datasets }) => code === 'SOURCE_REF_UNRESOLVED' && datasets.includes(broken.id),
      ),
    ).toBe(true);
  });

  it('rejects public citation aliases reused by another manifest entry', () => {
    const brokenManifest = structuredClone(sourceManifest);
    brokenManifest.entries[1]!.citationId = brokenManifest.entries[0]!.citationId;

    expect(() => validateCanonicalRelease({ ...release, sourceManifest: brokenManifest })).toThrow(
      /Source identifier JANUS-PAPER-01 is reused/,
    );
  });

  it('requires reviewer attestations to carry approvals, corrections, and rationale', () => {
    expect(() =>
      ReviewerRecordSchema.parse({
        schemaVersion: '1.0.0',
        dataVersion: `sha256:${'0'.repeat(64)}`,
        reviewer: {
          name: 'Independent Reviewer',
          reviewedAt: '2026-08-30T12:00:00+00:00',
          independence: 'independent',
          independenceStatement: 'I did not prepare the canonical transcription.',
          reviewRationale: 'I compared every normalized field with its locked source page.',
        },
        datasetApprovals: [
          {
            datasetId: 'janus.example',
            normalizedPayloadHash: `sha256:${'1'.repeat(64)}`,
            decision: 'approved',
            changeRationale: 'No corrections were required after the independent comparison.',
          },
        ],
        reconciliationApprovals: [],
        attestationAlgorithm: 'sha256-canonical-json-v1',
        attestationHash: `sha256:${'2'.repeat(64)}`,
      }),
    ).toThrow();
  });
});
