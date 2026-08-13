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
    quote: z.string().min(1).max(400).optional(),
  })
  .refine((locator) => Object.values(locator).some((value) => value !== undefined), {
    message: 'A source locator must identify at least a page, section, figure, table, or quote.',
  });

export const SourceRefSchema = z.object({
  sourceId: z.string().min(1),
  sourceVersion: z.string().min(1),
  locator: SourceLocatorSchema,
});

export type SourceRef = z.infer<typeof SourceRefSchema>;

export const sourced = <Schema extends z.ZodType>(valueSchema: Schema) =>
  z.object({
    value: valueSchema,
    evidenceKind: EvidenceKindSchema,
    sources: z.array(SourceRefSchema).min(1),
    note: z.string().min(1).optional(),
  });

export type Sourced<Value> = {
  value: Value;
  evidenceKind: EvidenceKind;
  sources: SourceRef[];
  note?: string;
};
