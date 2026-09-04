import { inspectAiRuntime } from '@janus/agent';

import corpusJson from '../../../../../../data/generated/research/corpus.json';
import { inspectConfiguredHybridRetrieval } from '../../../../lib/research-vector-runtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const runtime = inspectAiRuntime(process.env);
  const retrieval = await inspectConfiguredHybridRetrieval({
    environment: process.env,
    corpus: corpusJson,
  });
  const providerConfiguredForCanary =
    runtime.research.previewEnabled && runtime.liveCallsEnabled && runtime.deepSeek.configured;
  const hybridRetrievalReady = retrieval.actualMode === 'hybrid';

  return Response.json(
    {
      service: 'janus-research-companion',
      status: !runtime.research.previewEnabled
        ? 'preview_disabled'
        : providerConfiguredForCanary
          ? 'provider_configured_pending_canary'
          : hybridRetrievalReady
            ? 'hybrid_retrieval_ready_generation_fallback'
            : runtime.liveCallsEnabled
              ? 'lexical_fallback_ready_provider_unconfigured'
              : 'lexical_fallback_ready',
      providerReleaseState: providerConfiguredForCanary
        ? 'held_closed_pending_full_provider_canary'
        : runtime.research.previewEnabled
          ? 'deterministic_fallback_only'
          : 'disabled',
      coreExperienceAvailable: true,
      retrieval,
      ...runtime,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
