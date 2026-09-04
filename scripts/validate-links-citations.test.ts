import { describe, expect, it } from 'vitest';

import { SourceManifestSchema } from '@janus/domain';

import sourceManifestJson from '../data/sources/manifest.json';
import { citationResolutionCount } from './validate-links-citations';

const sourceManifest = SourceManifestSchema.parse(sourceManifestJson);

describe('generated citation target validation', () => {
  it('requires one exact citation alias and source-version pair', () => {
    expect(
      citationResolutionCount(sourceManifest, {
        sourceId: 'JANUS-PAPER-01',
        sourceVersion: 'arXiv:2409.00067v3',
      }),
    ).toBe(1);
    expect(
      citationResolutionCount(sourceManifest, {
        sourceId: 'JANUS-PAPER-01',
        sourceVersion: 'arXiv:2511.20329v2',
      }),
    ).toBe(0);
  });
});
