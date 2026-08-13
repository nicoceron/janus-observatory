import { describe, expect, it } from 'vitest';

import { ObservationSchema, SourceManifestEntrySchema } from './index';

describe('scientific provenance contracts', () => {
  it('rejects observations without a source locator', () => {
    const parsed = ObservationSchema.safeParse({
      scenarioId: 'S9',
      instrumentId: 'hwo',
      targetId: 'earth',
      status: {
        value: 'not_detected',
        evidenceKind: 'reported',
        sources: [
          { sourceId: 'observing-strategies', sourceVersion: 'arXiv:2511.20329v2', locator: {} },
        ],
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('requires checksum and retrieval time for local source files', () => {
    const parsed = SourceManifestEntrySchema.safeParse({
      id: 'janus.scenario-paper',
      title: 'Scenario Modeling and Worldbuilding',
      version: 'arXiv:2409.00067v3',
      creators: ['Jacob Haqq-Misra'],
      issued: '2025',
      kind: 'paper',
      canonicalUrl: 'https://doi.org/10.1016/j.techfore.2025.124194',
      localPath: 'data/sources/files/scenario-paper.pdf',
      license: 'CC BY 4.0',
      rightsStatus: 'verified_open',
      reusePolicy: 'May be reused with attribution under CC BY 4.0.',
    });

    expect(parsed.success).toBe(false);
  });
});
