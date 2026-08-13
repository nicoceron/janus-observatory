import { z } from 'zod';

import { ScenarioIdSchema } from './scenario';

export const AssetLedgerEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9._-]+$/),
    title: z.string().min(1),
    creator: z.string().min(1),
    scenarioId: ScenarioIdSchema.nullable(),
    artifactId: z.string().min(1).nullable(),
    kind: z.enum(['artifact', 'texture', 'model', 'image', 'video']),
    sourceUrl: z.string().url(),
    directFileUrls: z.array(z.string().url()).default([]),
    sourceVersion: z.string().min(1),
    license: z.string().min(1).nullable(),
    licenseUrl: z.string().url().optional(),
    rightsStatus: z.enum([
      'verified_open',
      'nasa_reuse_guidelines',
      'all_rights_reserved',
      'permission_granted',
    ]),
    admissionStatus: z.enum(['approved', 'link_only', 'excluded']),
    requiredCreditText: z.string().min(1),
    aiAssistanceDisclosure: z.string().min(1).nullable(),
    allowedTransformations: z.array(z.string().min(1)).default([]),
    sourceChecksum: z
      .string()
      .regex(/^sha256:[a-f0-9]{64}$/)
      .optional(),
    derivativeChecksum: z
      .string()
      .regex(/^sha256:[a-f0-9]{64}$/)
      .optional(),
    derivativePublicPath: z.string().startsWith('/').optional(),
    transformations: z.array(z.string().min(1)).default([]),
    notes: z.array(z.string().min(1)).default([]),
  })
  .refine(
    ({ admissionStatus, rightsStatus }) =>
      admissionStatus !== 'approved' || rightsStatus !== 'all_rights_reserved',
    { message: 'An all-rights-reserved asset cannot be approved without recorded permission.' },
  );

export const AssetLedgerSchema = z.object({
  schemaVersion: z.string().min(1),
  reviewedAt: z.string().datetime({ offset: true }),
  entries: z.array(AssetLedgerEntrySchema).min(1),
});

export type AssetLedgerEntry = z.infer<typeof AssetLedgerEntrySchema>;
export type AssetLedger = z.infer<typeof AssetLedgerSchema>;
