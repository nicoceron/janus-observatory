import { z } from 'zod';

export const SourceManifestEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9._-]+$/),
    title: z.string().min(1),
    version: z.string().min(1),
    creators: z.array(z.string().min(1)).min(1),
    issued: z.string().min(4),
    kind: z.enum(['paper', 'preprint', 'scenario_pipeline', 'artifact', 'web', 'dataset', 'code']),
    doi: z.string().min(1).optional(),
    arxivId: z.string().min(1).optional(),
    canonicalUrl: z.string().url(),
    directFileUrl: z.string().url().optional(),
    license: z.string().min(1).nullable(),
    licenseUrl: z.string().url().optional(),
    rightsStatus: z.enum(['verified_open', 'permission_required', 'metadata_missing', 'link_only']),
    reusePolicy: z.string().min(1),
    localPath: z.string().min(1).optional(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    bytes: z.number().int().positive().optional(),
    pageCount: z.number().int().positive().optional(),
    mimeType: z.string().min(1).optional(),
    upstreamChecksum: z.string().min(1).optional(),
    retrievedAt: z.string().datetime({ offset: true }).optional(),
    notes: z.array(z.string().min(1)).default([]),
  })
  .refine((entry) => !entry.localPath || (entry.sha256 && entry.retrievedAt), {
    message: 'A local source file requires both a SHA-256 checksum and retrieval timestamp.',
  });

export type SourceManifestEntry = z.infer<typeof SourceManifestEntrySchema>;

export const SourceManifestSchema = z.object({
  schemaVersion: z.string().min(1),
  generatedAt: z.string().datetime({ offset: true }),
  entries: z.array(SourceManifestEntrySchema).min(1),
});

export type SourceManifest = z.infer<typeof SourceManifestSchema>;
