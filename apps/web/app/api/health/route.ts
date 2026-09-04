import { inspectAiRuntime } from '@janus/agent';
import { AssetLedgerSchema } from '@janus/domain/asset';

import ledgerJson from '../../../../../data/assets/ledger.json';
import collapseValidation from '../../../../../data/generated/collapse/independent-validation.json';
import generatedManifest from '../../../../../data/generated/manifest.json';
import researchCorpus from '../../../../../data/generated/research/corpus.json';
import researchIndex from '../../../../../data/generated/research/index.json';
import reviewPacket from '../../../../../data/generated/review/canonical-review.json';
import { inspectConfiguredHybridRetrieval } from '../../../lib/research-vector-runtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function summarizeCanonicalDataReview(
  releaseStatus: string,
  datasets: Array<{ independentHumanReview: string }>,
) {
  const pendingIndependentReviews = datasets.filter(
    ({ independentHumanReview }) => independentHumanReview !== 'approved',
  ).length;
  const readyForReviewedDataRelease =
    releaseStatus === 'reviewed' && datasets.length > 0 && pendingIndependentReviews === 0;

  return {
    status: readyForReviewedDataRelease
      ? 'independent_review_complete'
      : 'independent_review_pending',
    releaseStatus,
    readyForReviewedDataRelease,
    pendingIndependentReviews,
    totalDatasets: datasets.length,
  } as const;
}

export async function GET() {
  const agent = inspectAiRuntime(process.env);
  const runtimeRetrieval = await inspectConfiguredHybridRetrieval({
    environment: process.env,
    corpus: researchCorpus,
  });
  const ledger = AssetLedgerSchema.parse(ledgerJson);
  const canonicalDataReview = summarizeCanonicalDataReview(
    reviewPacket.releaseStatus,
    reviewPacket.datasets,
  );

  return Response.json(
    {
      service: 'janus-observatory',
      status: 'operational',
      coreExperienceAvailable: true,
      publicReleaseAssessment: 'not_determined_by_health_endpoint',
      canonicalDataReview,
      data: {
        version: generatedManifest.dataVersion,
        generatedAt: generatedManifest.generatedAt,
        generatedFiles: generatedManifest.files.length,
      },
      retrieval: {
        mode: runtimeRetrieval.actualMode,
        available: true,
        requestedMode: runtimeRetrieval.requestedMode,
        fallbackReason: runtimeRetrieval.fallbackReason,
        hybridFusionInterface: 'connected_version_model_dimension_gated',
        chunkCount: researchIndex.chunkCount,
        contentHash: researchIndex.contentHash,
        scenarioCoverage: researchIndex.scenarioCoverage.length,
        vectorIndex: researchIndex.embeddingIndex.status,
        runtimeVectorIndex: {
          status:
            runtimeRetrieval.actualMode === 'hybrid' ? 'ready' : runtimeRetrieval.fallbackReason,
          vectorCandidateCount: runtimeRetrieval.vectorCandidateCount,
          provider: runtimeRetrieval.provider,
          model: runtimeRetrieval.model,
          dimensions: runtimeRetrieval.dimensions,
        },
      },
      assets: {
        ledgerVersion: ledger.schemaVersion,
        reviewedAt: ledger.reviewedAt,
        records: ledger.entries.length,
        approved: ledger.entries.filter(({ admissionStatus }) => admissionStatus === 'approved')
          .length,
        linkOnly: ledger.entries.filter(({ admissionStatus }) => admissionStatus === 'link_only')
          .length,
      },
      collapse: {
        reportedAvailable: true,
        independentStatus: collapseValidation.status,
        canonicalStatus: collapseValidation.canonicalStatus,
      },
      research: {
        previewEnabled: agent.research.previewEnabled,
        liveCallsEnabled: agent.liveCallsEnabled,
        lexicalFallbackAvailable: agent.research.lexicalFallbackAvailable,
        deepSeekConfigured: agent.deepSeek.configured,
        embeddingsConfigured: agent.voyage.configured,
        liveProviderValidation:
          agent.liveCallsEnabled && agent.deepSeek.configured
            ? 'operator_enabled_with_external_canary_gates'
            : 'held_closed_pending_full_provider_canary',
        providerCanary: agent.providerCanary,
      },
      telemetry: {
        enabled: process.env.NEXT_PUBLIC_JANUS_TELEMETRY_ENABLED === 'true',
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
