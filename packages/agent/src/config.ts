import { z } from 'zod';

const positiveIntegerFromString = z.coerce.number().int().positive();
const enabledFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const DeepSeekConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
  model: z.string().min(1),
  protocol: z.literal('responses'),
  timeoutMs: positiveIntegerFromString,
});

const VoyageConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
  model: z.string().min(1),
  dimensions: positiveIntegerFromString,
  timeoutMs: positiveIntegerFromString,
});

const ResearchRuntimeConfigSchema = z.object({
  previewEnabled: enabledFromString,
  liveCallsEnabled: enabledFromString,
  hybridRetrievalEnabled: enabledFromString,
  embeddingProvider: z.string().trim().min(1).max(50),
  vectorCandidates: positiveIntegerFromString.max(100),
  maxQuestionChars: positiveIntegerFromString.max(600),
  maxPassages: positiveIntegerFromString.max(12),
  maxToolRounds: positiveIntegerFromString.max(6),
  maxOutputTokens: positiveIntegerFromString.max(2_000),
  timeoutMs: positiveIntegerFromString.max(60_000),
  rateLimit: positiveIntegerFromString.max(60),
  rateWindowMs: positiveIntegerFromString.max(3_600_000),
  maxConcurrency: positiveIntegerFromString.max(32),
});

export type DeepSeekConfig = z.infer<typeof DeepSeekConfigSchema>;
export type VoyageConfig = z.infer<typeof VoyageConfigSchema>;
export type ResearchRuntimeConfig = z.infer<typeof ResearchRuntimeConfigSchema>;

type Environment = Record<string, string | undefined>;

export function readDeepSeekConfig(environment: Environment): DeepSeekConfig {
  return DeepSeekConfigSchema.parse({
    apiKey: environment.DEEPSEEK_API_KEY,
    baseUrl: environment.JANUS_LLM_BASE_URL ?? 'https://api.deepseek.com',
    model: environment.JANUS_LLM_MODEL ?? 'deepseek-v4-flash',
    protocol: environment.JANUS_LLM_PROTOCOL ?? 'responses',
    timeoutMs: environment.JANUS_LLM_TIMEOUT_MS ?? '30000',
  });
}

export function readVoyageConfig(environment: Environment): VoyageConfig {
  return VoyageConfigSchema.parse({
    apiKey: environment.VOYAGE_API_KEY,
    baseUrl: environment.VOYAGE_BASE_URL ?? 'https://api.voyageai.com',
    model: environment.VOYAGE_EMBEDDING_MODEL ?? 'voyage-4-lite',
    dimensions: environment.VOYAGE_EMBEDDING_DIMENSIONS ?? '1024',
    timeoutMs: environment.VOYAGE_TIMEOUT_MS ?? '30000',
  });
}

export function readResearchRuntimeConfig(environment: Environment): ResearchRuntimeConfig {
  return ResearchRuntimeConfigSchema.parse({
    previewEnabled: environment.JANUS_RESEARCH_PREVIEW_ENABLED ?? 'false',
    liveCallsEnabled: environment.JANUS_AGENT_LIVE_ENABLED ?? 'false',
    hybridRetrievalEnabled: environment.JANUS_RESEARCH_HYBRID_ENABLED ?? 'false',
    embeddingProvider: environment.EMBEDDING_PROVIDER || 'voyage',
    vectorCandidates: environment.JANUS_RESEARCH_VECTOR_CANDIDATES ?? '30',
    maxQuestionChars: environment.JANUS_RESEARCH_MAX_QUESTION_CHARS ?? '600',
    maxPassages: environment.JANUS_RESEARCH_MAX_PASSAGES ?? '8',
    maxToolRounds: environment.JANUS_LLM_MAX_TOOL_ROUNDS ?? '6',
    maxOutputTokens: environment.JANUS_LLM_MAX_OUTPUT_TOKENS ?? '800',
    timeoutMs: environment.JANUS_RESEARCH_TIMEOUT_MS ?? '30000',
    rateLimit: environment.JANUS_RESEARCH_RATE_LIMIT ?? '6',
    rateWindowMs: environment.JANUS_RESEARCH_RATE_WINDOW_MS ?? '60000',
    maxConcurrency: environment.JANUS_RESEARCH_MAX_CONCURRENCY ?? '4',
  });
}

export function inspectAiRuntime(environment: Environment) {
  const research = readResearchRuntimeConfig(environment);
  const deepSeek = DeepSeekConfigSchema.safeParse({
    apiKey: environment.DEEPSEEK_API_KEY,
    baseUrl: environment.JANUS_LLM_BASE_URL ?? 'https://api.deepseek.com',
    model: environment.JANUS_LLM_MODEL ?? 'deepseek-v4-flash',
    protocol: environment.JANUS_LLM_PROTOCOL ?? 'responses',
    timeoutMs: environment.JANUS_LLM_TIMEOUT_MS ?? '30000',
  });
  const voyage = VoyageConfigSchema.safeParse({
    apiKey: environment.VOYAGE_API_KEY,
    baseUrl: environment.VOYAGE_BASE_URL ?? 'https://api.voyageai.com',
    model: environment.VOYAGE_EMBEDDING_MODEL ?? 'voyage-4-lite',
    dimensions: environment.VOYAGE_EMBEDDING_DIMENSIONS ?? '1024',
    timeoutMs: environment.VOYAGE_TIMEOUT_MS ?? '30000',
  });

  return {
    liveCallsEnabled: research.liveCallsEnabled,
    research: {
      previewEnabled: research.previewEnabled,
      lexicalFallbackAvailable: true,
      hybridRetrievalEnabled: research.hybridRetrievalEnabled,
      embeddingProvider: research.embeddingProvider,
      vectorCandidates: research.vectorCandidates,
      maxQuestionChars: research.maxQuestionChars,
      maxPassages: research.maxPassages,
      maxToolRounds: research.maxToolRounds,
      maxOutputTokens: research.maxOutputTokens,
      timeoutMs: research.timeoutMs,
      rateLimit: research.rateLimit,
      rateWindowMs: research.rateWindowMs,
      maxConcurrency: research.maxConcurrency,
    },
    deepSeek: {
      configured: deepSeek.success,
      model: environment.JANUS_LLM_MODEL ?? 'deepseek-v4-flash',
      protocol: environment.JANUS_LLM_PROTOCOL ?? 'responses',
    },
    voyage: {
      configured: voyage.success,
      model: environment.VOYAGE_EMBEDDING_MODEL ?? 'voyage-4-lite',
      dimensions: Number(environment.VOYAGE_EMBEDDING_DIMENSIONS ?? 1024),
    },
    providerCanary: {
      status: 'partial_external_gate',
      implementedProbeCoverage: ['model_list', 'plain_text_generation', 'embedding'],
      unverifiedReleaseCoverage: [
        'json_mode',
        'tool_call_and_result',
        'thinking_multi_tool_replay',
        'live_usage_and_cache',
        'live_timeout',
        'live_rate_limit_429',
      ],
    },
  } as const;
}
