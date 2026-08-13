import { z } from 'zod';

const positiveIntegerFromString = z.coerce.number().int().positive();

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

export type DeepSeekConfig = z.infer<typeof DeepSeekConfigSchema>;
export type VoyageConfig = z.infer<typeof VoyageConfigSchema>;

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

export function inspectAiRuntime(environment: Environment) {
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
    liveCallsEnabled: environment.JANUS_AGENT_LIVE_ENABLED === 'true',
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
  } as const;
}
