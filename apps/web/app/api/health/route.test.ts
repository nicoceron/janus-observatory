import { describe, expect, it } from 'vitest';

import { GET, summarizeCanonicalDataReview } from './route';

describe('GET /api/health', () => {
  it('reports release components without exposing secrets', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('operational');
    expect(body.coreExperienceAvailable).toBe(true);
    expect(body.publicReleaseAssessment).toBe('not_determined_by_health_endpoint');
    expect(body.canonicalDataReview).toMatchObject({
      status: 'independent_review_pending',
      releaseStatus: 'candidate_not_reviewed',
      readyForReviewedDataRelease: false,
      pendingIndependentReviews: 8,
      totalDatasets: 8,
    });
    expect(body.data.version).toMatch(/^sha256:/);
    expect(body.retrieval.chunkCount).toBeGreaterThan(0);
    expect(body.retrieval.mode).toMatch(/^(lexical|hybrid)$/);
    expect(body.retrieval.runtimeVectorIndex).toMatchObject({
      vectorCandidateCount: expect.any(Number),
      provider: 'voyage',
    });
    expect(body.assets.records).toBeGreaterThan(0);
    expect(body.telemetry.enabled).toBeTypeOf('boolean');
    expect(JSON.stringify(body)).not.toContain(process.env.DEEPSEEK_API_KEY ?? '__unset__');
    expect(JSON.stringify(body)).not.toContain('release_ready');
  });

  it('requires both a reviewed release status and every independent approval', () => {
    const approvedDatasets = [
      { independentHumanReview: 'approved' },
      { independentHumanReview: 'approved' },
    ];

    expect(summarizeCanonicalDataReview('candidate_not_reviewed', approvedDatasets)).toMatchObject({
      readyForReviewedDataRelease: false,
      status: 'independent_review_pending',
    });
    expect(summarizeCanonicalDataReview('reviewed', approvedDatasets)).toMatchObject({
      readyForReviewedDataRelease: true,
      status: 'independent_review_complete',
    });
    expect(summarizeCanonicalDataReview('reviewed', [])).toMatchObject({
      readyForReviewedDataRelease: false,
      status: 'independent_review_pending',
    });
  });
});
