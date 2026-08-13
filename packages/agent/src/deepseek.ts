import { z } from 'zod';

import type { DeepSeekConfig } from './config';
import { ProviderError, providerHttpError } from './errors';

const UsageSchema = z
  .object({
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
    total_tokens: z.number().int().nonnegative(),
    input_tokens_details: z
      .object({ cached_tokens: z.number().int().nonnegative().optional() })
      .passthrough()
      .optional(),
    output_tokens_details: z
      .object({ reasoning_tokens: z.number().int().nonnegative().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

const ContentPartSchema = z
  .object({
    type: z.string(),
    text: z.string().optional(),
  })
  .passthrough();

const OutputItemSchema = z
  .object({
    type: z.string(),
    content: z.array(ContentPartSchema).optional(),
  })
  .passthrough();

const DeepSeekResponseSchema = z
  .object({
    id: z.string(),
    model: z.string().optional(),
    status: z.string(),
    output_text: z.string().optional(),
    output: z.array(OutputItemSchema).default([]),
    usage: UsageSchema.optional(),
  })
  .passthrough();

const ModelListSchema = z.object({
  data: z.array(z.object({ id: z.string(), owned_by: z.string().optional() }).passthrough()),
});

type Fetch = typeof fetch;

export type TextGenerationRequest = {
  instructions: string;
  input: string;
  maxOutputTokens?: number;
  reasoningEffort?: 'high' | 'max';
};

export type GenerationTelemetry = {
  provider: 'deepseek';
  responseId: string;
  model: string;
  status: string;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
};

export type TextGenerationResult = {
  text: string;
  telemetry: GenerationTelemetry;
};

export class DeepSeekResponsesClient {
  readonly #config: DeepSeekConfig;
  readonly #fetch: Fetch;

  constructor(config: DeepSeekConfig, fetchImplementation: Fetch = fetch) {
    this.#config = config;
    this.#fetch = fetchImplementation;
  }

  async listModels(): Promise<string[]> {
    const response = await this.#fetch(`${this.#config.baseUrl}/models`, {
      headers: this.#headers(),
      signal: AbortSignal.timeout(this.#config.timeoutMs),
    });

    if (!response.ok) {
      throw await this.#httpError(response);
    }

    const parsed = ModelListSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new ProviderError({
        message: 'DeepSeek returned an invalid model-list response.',
        code: 'DEEPSEEK_INVALID_RESPONSE',
        retryable: false,
      });
    }
    return parsed.data.data.map(({ id }) => id);
  }

  async createText(request: TextGenerationRequest): Promise<TextGenerationResult> {
    const body: Record<string, unknown> = {
      model: this.#config.model,
      instructions: request.instructions,
      input: request.input,
      max_output_tokens: request.maxOutputTokens ?? 800,
    };
    if (request.reasoningEffort) {
      body.reasoning = { effort: request.reasoningEffort };
    }

    const response = await this.#fetch(`${this.#config.baseUrl}/responses`, {
      method: 'POST',
      headers: this.#headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.#config.timeoutMs),
    });

    if (!response.ok) {
      throw await this.#httpError(response);
    }

    const parsed = DeepSeekResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new ProviderError({
        message: 'DeepSeek returned a response that failed schema validation.',
        code: 'DEEPSEEK_INVALID_RESPONSE',
        retryable: false,
      });
    }

    const text = extractOutputText(parsed.data);
    if (!text) {
      throw new ProviderError({
        message: 'DeepSeek returned no public output text.',
        code: 'DEEPSEEK_EMPTY_OUTPUT',
        retryable: true,
      });
    }

    return {
      text,
      telemetry: {
        provider: 'deepseek',
        responseId: parsed.data.id,
        model: parsed.data.model ?? this.#config.model,
        status: parsed.data.status,
        inputTokens: parsed.data.usage?.input_tokens,
        outputTokens: parsed.data.usage?.output_tokens,
        reasoningTokens: parsed.data.usage?.output_tokens_details?.reasoning_tokens,
        cachedInputTokens: parsed.data.usage?.input_tokens_details?.cached_tokens,
      },
    };
  }

  #headers(): HeadersInit {
    return {
      Accept: 'application/json',
      Authorization: `Bearer ${this.#config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async #httpError(response: Response): Promise<ProviderError> {
    let detail: string | undefined;
    try {
      const errorBody = (await response.json()) as { error?: { message?: unknown } };
      if (typeof errorBody.error?.message === 'string') {
        detail = errorBody.error.message;
      }
    } catch {
      // A generic status-only error is safer than logging an untrusted response body.
    }
    return providerHttpError('deepseek', response.status, detail);
  }
}

function extractOutputText(response: z.infer<typeof DeepSeekResponseSchema>): string {
  if (response.output_text?.trim()) {
    return response.output_text.trim();
  }
  return response.output
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === 'output_text' && part.text)
    .map((part) => part.text?.trim())
    .filter((part): part is string => Boolean(part))
    .join('\n');
}
