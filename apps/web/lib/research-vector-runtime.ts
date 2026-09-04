import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  VoyageEmbeddingClient,
  inspectAiRuntime,
  inspectVectorIndexCompatibility,
  rankVectorIndex,
  readResearchRuntimeConfig,
  readVoyageConfig,
  type VectorIndexFallbackReason,
  type VectorRetrieval,
  type VoyageConfig,
} from '@janus/agent';

const vectorIndexPath = join(process.cwd(), 'data', 'runtime', 'research', 'vector-index.json');
const maximumVectorIndexBytes = 64 * 1024 * 1024;
let cachedVectorIndex: Promise<unknown | undefined> | undefined;

type Environment = Record<string, string | undefined>;
type VectorIndexLoader = () => Promise<unknown | undefined>;
type QueryEmbeddingClient = Pick<VoyageEmbeddingClient, 'embed'>;
type QueryEmbeddingClientFactory = (config: VoyageConfig) => QueryEmbeddingClient;

export type RetrievalFallbackReason =
  | VectorIndexFallbackReason
  | 'preview_disabled'
  | 'hybrid_disabled'
  | 'live_calls_disabled'
  | 'provider_unsupported'
  | 'provider_unconfigured'
  | 'index_missing'
  | 'index_read_error'
  | 'embedding_error'
  | 'no_vector_candidates';

export type HybridRetrievalStatus = {
  requestedMode: 'lexical' | 'hybrid';
  actualMode: 'lexical' | 'hybrid';
  fallbackReason: RetrievalFallbackReason | null;
  provider: string;
  model: string;
  dimensions: number;
  vectorCandidateCount: number;
};

export type HybridRetrievalResolution = {
  vectorRetrieval?: VectorRetrieval;
  status: HybridRetrievalStatus;
};

async function readPrebuiltVectorIndex(): Promise<unknown | undefined> {
  try {
    const payload = await readFile(vectorIndexPath);
    if (payload.byteLength > maximumVectorIndexBytes) {
      throw new Error('Prebuilt vector index exceeds the server-side size limit.');
    }
    return JSON.parse(payload.toString('utf8')) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

export function loadPrebuiltVectorIndex(): Promise<unknown | undefined> {
  cachedVectorIndex ??= readPrebuiltVectorIndex();
  return cachedVectorIndex;
}

function baseStatus(environment: Environment): HybridRetrievalStatus {
  const configuredDimensions = Number(environment.VOYAGE_EMBEDDING_DIMENSIONS ?? 1_024);
  const configuredProvider = environment.EMBEDDING_PROVIDER ?? 'voyage';
  return {
    requestedMode: 'lexical',
    actualMode: 'lexical',
    fallbackReason: null,
    provider: /^[A-Za-z0-9._-]{1,50}$/.test(configuredProvider)
      ? configuredProvider
      : 'unrecognized',
    model: environment.VOYAGE_EMBEDDING_MODEL ?? 'voyage-4-lite',
    dimensions:
      Number.isInteger(configuredDimensions) && configuredDimensions > 0 ? configuredDimensions : 0,
    vectorCandidateCount: 0,
  };
}

function prerequisiteStatus(environment: Environment): HybridRetrievalStatus {
  const runtime = readResearchRuntimeConfig(environment);
  const status = baseStatus(environment);
  if (!runtime.previewEnabled) return { ...status, fallbackReason: 'preview_disabled' };
  if (!runtime.hybridRetrievalEnabled) return { ...status, fallbackReason: 'hybrid_disabled' };
  status.requestedMode = 'hybrid';
  if (!runtime.liveCallsEnabled) return { ...status, fallbackReason: 'live_calls_disabled' };
  if (runtime.embeddingProvider !== 'voyage') {
    return { ...status, fallbackReason: 'provider_unsupported' };
  }
  if (!inspectAiRuntime(environment).voyage.configured) {
    return { ...status, fallbackReason: 'provider_unconfigured' };
  }
  return status;
}

export async function inspectConfiguredHybridRetrieval(options: {
  environment: Environment;
  corpus: unknown;
  loadIndex?: VectorIndexLoader;
}): Promise<HybridRetrievalStatus> {
  const status = prerequisiteStatus(options.environment);
  if (status.fallbackReason) return status;

  let indexInput: unknown | undefined;
  try {
    indexInput = await (options.loadIndex ?? loadPrebuiltVectorIndex)();
  } catch {
    return { ...status, fallbackReason: 'index_read_error' };
  }
  if (indexInput === undefined) return { ...status, fallbackReason: 'index_missing' };

  const config = readVoyageConfig(options.environment);
  const compatibility = inspectVectorIndexCompatibility(indexInput, options.corpus, {
    provider: 'voyage',
    model: config.model,
    dimensions: config.dimensions,
  });
  if (!compatibility.compatible) {
    return { ...status, fallbackReason: compatibility.reason };
  }
  return {
    ...status,
    actualMode: 'hybrid',
    vectorCandidateCount: Math.min(
      compatibility.index.entries.length,
      readResearchRuntimeConfig(options.environment).vectorCandidates,
    ),
  };
}

export async function resolveConfiguredHybridRetrieval(options: {
  environment: Environment;
  corpus: unknown;
  query: string;
  loadIndex?: VectorIndexLoader;
  createClient?: QueryEmbeddingClientFactory;
}): Promise<HybridRetrievalResolution> {
  const status = prerequisiteStatus(options.environment);
  if (status.fallbackReason) return { status };

  let indexInput: unknown | undefined;
  try {
    indexInput = await (options.loadIndex ?? loadPrebuiltVectorIndex)();
  } catch {
    return { status: { ...status, fallbackReason: 'index_read_error' } };
  }
  if (indexInput === undefined) {
    return { status: { ...status, fallbackReason: 'index_missing' } };
  }

  const runtime = readResearchRuntimeConfig(options.environment);
  const config = readVoyageConfig(options.environment);
  const compatibility = inspectVectorIndexCompatibility(indexInput, options.corpus, {
    provider: 'voyage',
    model: config.model,
    dimensions: config.dimensions,
  });
  if (!compatibility.compatible) {
    return { status: { ...status, fallbackReason: compatibility.reason } };
  }

  try {
    const client = (options.createClient ?? ((value) => new VoyageEmbeddingClient(value)))(config);
    const queryEmbedding = await client.embed([options.query], 'query');
    const vectorRetrieval = rankVectorIndex({
      compatibility,
      queryEmbedding,
      maximumCandidates: runtime.vectorCandidates,
    });
    if (vectorRetrieval.candidates.length === 0) {
      return { status: { ...status, fallbackReason: 'no_vector_candidates' } };
    }
    return {
      vectorRetrieval,
      status: {
        ...status,
        actualMode: 'hybrid',
        vectorCandidateCount: vectorRetrieval.candidates.length,
      },
    };
  } catch {
    return { status: { ...status, fallbackReason: 'embedding_error' } };
  }
}
