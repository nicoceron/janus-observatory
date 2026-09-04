import { z } from 'zod';

const Sha256DigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const RuntimeReleaseIdentitySchema = z
  .object({
    schemaVersion: z.literal('1.0.0'),
    dataVersion: Sha256DigestSchema,
    releaseStatus: z.enum(['candidate_pending_independent_review', 'reviewed']),
    independentHumanReview: z.enum(['pending', 'approved']),
    reviewAttestationHash: Sha256DigestSchema.nullable(),
  })
  .superRefine((identity, context) => {
    const reviewed = identity.releaseStatus === 'reviewed';
    if (
      (reviewed &&
        (identity.independentHumanReview !== 'approved' ||
          identity.reviewAttestationHash === null)) ||
      (!reviewed &&
        (identity.independentHumanReview !== 'pending' || identity.reviewAttestationHash !== null))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Runtime release identity review status and attestation are inconsistent.',
      });
    }
  });

export type RuntimeReleaseIdentity = z.infer<typeof RuntimeReleaseIdentitySchema>;
