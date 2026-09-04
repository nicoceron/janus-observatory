import { z } from 'zod';

/**
 * The public evidence vocabulary from the master plan. These values deliberately distinguish
 * source transcription, deterministic calculation, independent model work, and interpretation.
 */
export const evidenceKinds = [
  'reported',
  'transcribed',
  'derived',
  'reimplemented',
  'editorial',
  'interpretive',
  'fictional',
  'model_generated',
] as const;

export const EvidenceKindSchema = z.enum(evidenceKinds);
export type EvidenceKind = z.infer<typeof EvidenceKindSchema>;

export const SourceLocatorSchema = z
  .object({
    page: z.number().int().positive().optional(),
    section: z.string().min(1).optional(),
    figure: z.string().min(1).optional(),
    table: z.string().min(1).optional(),
    row: z.string().min(1).optional(),
    column: z.string().min(1).optional(),
    url: z.string().url().optional(),
    quote: z.string().min(1).max(400).optional(),
  })
  .refine((locator) => Object.values(locator).some((value) => value !== undefined), {
    message:
      'A source locator must identify at least a page, section, figure, table, row, column, URL, or quote.',
  });

export const SourceRefSchema = z.object({
  sourceId: z.string().min(1),
  sourceVersion: z.string().min(1),
  locator: SourceLocatorSchema,
  evidenceKind: EvidenceKindSchema.optional(),
  extractedAt: z.string().datetime({ offset: true }).optional(),
  reviewedBy: z.array(z.string().min(1)).optional(),
  note: z.string().min(1).optional(),
});

export type SourceRef = z.infer<typeof SourceRefSchema>;

/**
 * Whether a source-backed field has been captured into canonical data. Missing states are
 * deliberate data, not aliases for null, zero, or a negative scientific result.
 */
export const captureStatuses = [
  'captured',
  'not_reported',
  'not_captured',
  'not_transcribed',
] as const;

export const CaptureStatusSchema = z.enum(captureStatuses);
export type CaptureStatus = z.infer<typeof CaptureStatusSchema>;

export const FieldSourceRefSchema = SourceRefSchema.extend({
  evidenceKind: EvidenceKindSchema,
});

const sourcedMetadata = {
  evidenceKind: EvidenceKindSchema,
  sourceRefs: z.array(FieldSourceRefSchema).min(1),
  unit: z.string().min(1).optional(),
  display: z.string().min(1).optional(),
  uncertainty: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
};

/**
 * Build a field-level provenance schema. A captured field must carry a value; an unavailable
 * field must carry an explicit reason-state, a null value, and at least one locator showing the
 * source surface that was checked. This makes missing data inspectable without inventing facts.
 */
export const sourced = <Schema extends z.ZodType>(valueSchema: Schema) =>
  z.discriminatedUnion('captureStatus', [
    z.object({
      captureStatus: z.literal('captured'),
      value: valueSchema,
      ...sourcedMetadata,
    }),
    z.object({
      captureStatus: z.enum(['not_reported', 'not_captured', 'not_transcribed']),
      value: z.null(),
      ...sourcedMetadata,
      note: z.string().min(1),
    }),
  ]);

export type Sourced<Value> =
  | {
      captureStatus: 'captured';
      value: Value;
      evidenceKind: EvidenceKind;
      sourceRefs: Array<SourceRef & { evidenceKind: EvidenceKind }>;
      unit?: string;
      display?: string;
      uncertainty?: string;
      note?: string;
    }
  | {
      captureStatus: Exclude<CaptureStatus, 'captured'>;
      value: null;
      evidenceKind: EvidenceKind;
      sourceRefs: Array<SourceRef & { evidenceKind: EvidenceKind }>;
      unit?: string;
      display?: string;
      uncertainty?: string;
      note: string;
    };
