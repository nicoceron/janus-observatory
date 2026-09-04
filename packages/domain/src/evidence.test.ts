import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ObservationSchema, SourceManifestEntrySchema, sourced } from './index';

describe('scientific provenance contracts', () => {
  it('rejects observations without a source locator', () => {
    const parsed = ObservationSchema.safeParse({
      scenarioId: 'S9',
      instrumentId: 'hwo',
      targetId: 'earth',
      status: {
        captureStatus: 'captured',
        value: 'not_detected',
        evidenceKind: 'reported',
        sourceRefs: [
          {
            sourceId: 'observing-strategies',
            sourceVersion: 'arXiv:2511.20329v2',
            evidenceKind: 'reported',
            locator: {},
          },
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

  it('requires an explicit reason for a sourced missing state', () => {
    const parsed = sourced(z.string()).safeParse({
      captureStatus: 'not_transcribed',
      value: null,
      evidenceKind: 'reported',
      sourceRefs: [
        {
          sourceId: 'JANUS-PAPER-01',
          sourceVersion: 'arXiv:2409.00067v3',
          evidenceKind: 'reported',
          locator: { page: 11, figure: 'Figure 6', row: 'S1', column: 'Biosphere' },
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects a fabricated value in a sourced missing state', () => {
    const parsed = sourced(z.string()).safeParse({
      captureStatus: 'not_reported',
      value: '400 hr',
      evidenceKind: 'reported',
      note: 'The cited concept does not report an integration time.',
      sourceRefs: [
        {
          sourceId: 'JANUS-PAPER-03',
          sourceVersion: 'arXiv:2511.20329v2',
          evidenceKind: 'reported',
          locator: {
            page: 4,
            row: 'HWO detectability estimate',
            column: 'Integration time',
          },
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });
});
