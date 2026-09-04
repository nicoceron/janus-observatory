import { describe, expect, it } from 'vitest';

import { releaseIdentity } from '../../lib/canonical';
import { filterLedgerEntries, type LedgerEntry } from './SourceLedger';
import { canonicalDatasetEntries } from './dataset-entries';

const entries: LedgerEntry[] = [
  {
    id: 'asset-solarsystemscope.texture.earth-day-threejs.1k',
    title: 'Earth day texture — Janus 1K WebP derivative',
    subtitle: 'Solar System Scope',
    kind: 'asset',
    version: 'three.js@pinned',
    rights: 'CC BY 4.0',
    licenseHref: 'https://creativecommons.org/licenses/by/4.0/',
    use: 'Earth textures from Solar System Scope.',
    locator: 'Public derivative /assets/planets/earth-day-1024.webp',
    href: 'https://threejs.org/examples/webgpu_tsl_earth.html',
    telemetryId: 'solarsystemscope.texture.earth-day-threejs.1k',
    sourceAgency: 'Three.js project / Solar System Scope',
    retrievedAt: '2026-08-29',
    displaySize: '1024 × 512 px',
    modifications: ['Resized and converted with cwebp.'],
  },
  {
    id: 'asset-janus.artifact.s7.1.3',
    title: 'Water Zither of the Ba-i',
    subtitle: 'CJ Baal · S7',
    kind: 'artifact',
    version: 'public-page-2026-08-12',
    rights: 'all_rights_reserved',
    use: 'Created by CJ Baal. All rights reserved.',
    locator: 'Link only · no local source or derivative checksum',
    href: 'https://futures.bmsis.org/artifacts',
    telemetryId: 'janus.artifact.s7.1.3',
    sourceAgency: 'Project Janus, Blue Marble Space Institute of Science',
    retrievedAt: '2026-08-12',
    modifications: [],
  },
];

describe('source ledger search', () => {
  it('indexes source agency and modification history', () => {
    expect(filterLedgerEntries(entries, 'all', 'Solar System Scope')).toEqual([entries[0]]);
    expect(filterLedgerEntries(entries, 'all', 'cwebp')).toEqual([entries[0]]);
  });

  it('keeps link-only rights boundaries searchable and filterable', () => {
    expect(filterLedgerEntries(entries, 'artifacts', 'no local source')).toEqual([entries[1]]);
    expect(filterLedgerEntries(entries, 'assets', 'Water Zither')).toEqual([]);
  });

  it('publishes all eight runtime datasets including the exact Venus Table 2 locator', () => {
    expect(canonicalDatasetEntries).toHaveLength(8);
    expect(
      canonicalDatasetEntries.find(({ id }) => id === 'dataset-atmosphere-table-2'),
    ).toMatchObject({
      subtitle: 'janus.atmosphere.venus.apjl-table-2',
      version: 'arXiv:2511.20329v2',
      locator: 'Table 2 · page 6 · reported/transcribed',
      href: 'https://arxiv.org/pdf/2511.20329v2#page=6',
      telemetryId: 'JANUS-PAPER-03',
    });
    expect(releaseIdentity).toMatchObject({
      releaseStatus: 'candidate_pending_independent_review',
      independentHumanReview: 'pending',
      reviewAttestationHash: null,
    });
  });
});
