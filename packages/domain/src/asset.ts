import { z } from 'zod';

import { ScenarioIdSchema } from './scenario';

export const AssetMaxDisplaySizeSchema = z.object({
  widthPx: z.number().int().positive(),
  heightPx: z.number().int().positive(),
});

export const AssetTransformationSchema = z.enum([
  'AI-assisted detail restoration',
  'DOM overlay compositing',
  'animation',
  'color grading',
  'color-preserving mipmaps',
  'excerpting with attribution',
  'format conversion',
  'image optimization',
  'incorporation into the Janus Observatory project',
  'luminance masking',
  'material tuning',
  'posing',
  'posing and staging',
  'resizing',
  'responsive cropping',
  'responsive rendering',
  'responsive scaling',
  'rigging',
  'texture optimization',
  'uncropped thumbnail',
  'web optimization',
]);

export const AssetLedgerEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9._-]+$/),
    title: z.string().min(1),
    creator: z.string().min(1),
    scenarioId: ScenarioIdSchema.nullable(),
    artifactId: z.string().min(1).nullable(),
    kind: z.enum(['artifact', 'texture', 'model', 'image', 'video']),
    sourceUrl: z.string().url(),
    sourceAgency: z.string().min(1),
    directFileUrls: z.array(z.string().url()).default([]),
    sourceVersion: z.string().min(1),
    retrievedAt: z.iso.date(),
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
    allowedTransformations: z.array(AssetTransformationSchema).default([]),
    appliedTransformations: z.array(AssetTransformationSchema).default([]),
    sourceChecksum: z
      .string()
      .regex(/^sha256:[a-f0-9]{64}$/)
      .optional(),
    derivativeChecksum: z
      .string()
      .regex(/^sha256:[a-f0-9]{64}$/)
      .optional(),
    derivativePublicPath: z.string().startsWith('/').optional(),
    sharedDerivativeGroup: z.string().min(1).optional(),
    maxDisplaySize: AssetMaxDisplaySizeSchema.nullable(),
    transformations: z.array(z.string().min(1)).default([]),
    notes: z.array(z.string().min(1)).default([]),
  })
  .refine(
    ({ admissionStatus, rightsStatus }) =>
      admissionStatus !== 'approved' || rightsStatus !== 'all_rights_reserved',
    { message: 'An all-rights-reserved asset cannot be approved without recorded permission.' },
  )
  .refine(
    ({ admissionStatus, derivativeChecksum, derivativePublicPath, sourceChecksum }) =>
      admissionStatus !== 'link_only' ||
      (!sourceChecksum && !derivativeChecksum && !derivativePublicPath),
    {
      message:
        'A link-only asset cannot carry local source/derivative checksums or a public derivative path.',
    },
  )
  .refine(
    ({ derivativePublicPath, maxDisplaySize }) => derivativePublicPath || maxDisplaySize === null,
    { message: 'An asset without a public derivative must use maxDisplaySize = null.' },
  )
  .refine(
    ({ derivativePublicPath, kind, maxDisplaySize }) =>
      !derivativePublicPath ||
      !['image', 'texture', 'video'].includes(kind) ||
      maxDisplaySize !== null,
    { message: 'A public raster/video derivative must declare maxDisplaySize.' },
  )
  .refine(
    ({ derivativePublicPath, sourceChecksum, derivativeChecksum, transformations }) =>
      !derivativePublicPath ||
      Boolean(sourceChecksum && derivativeChecksum && transformations.length > 0),
    {
      message:
        'A public derivative requires original and derivative checksums plus transformation history.',
    },
  )
  .refine(
    ({ derivativePublicPath, admissionStatus }) =>
      !derivativePublicPath || admissionStatus === 'approved',
    { message: 'Only an approved asset may publish a derivative.' },
  )
  .refine(
    ({ allowedTransformations, appliedTransformations }) =>
      appliedTransformations.every((transformation) =>
        allowedTransformations.includes(transformation),
      ),
    { message: 'Every applied transformation must also be allowed by the rights record.' },
  )
  .refine(
    ({ appliedTransformations, derivativeChecksum, sourceChecksum }) =>
      !sourceChecksum ||
      !derivativeChecksum ||
      sourceChecksum === derivativeChecksum ||
      appliedTransformations.length > 0,
    {
      message:
        'A changed public derivative must enumerate its applied transformations as well as its history.',
    },
  );

export const AssetLedgerSchema = z.object({
  schemaVersion: z.string().min(1),
  reviewedAt: z.string().datetime({ offset: true }),
  entries: z.array(AssetLedgerEntrySchema).min(1),
});

export type AssetLedgerEntry = z.infer<typeof AssetLedgerEntrySchema>;
export type AssetLedger = z.infer<typeof AssetLedgerSchema>;
