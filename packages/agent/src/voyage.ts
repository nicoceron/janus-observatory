import { z } from 'zod';

import type { VoyageConfig } from './config';
import { ProviderError, providerHttpError } from './errors';

const VoyageResponseSchema = z.object({
  data: z.array(
    z.object({
      embedding: z.array(z.number()),
      index: z.number().int().nonnegative(),
    }),
  ),
  model: z.string().optional(),
  usage: z
    .object({
      total_tokens: z.number().int().nonnegative().optional(),
    })
    .passthrough()
    .optional(),
});

type Fetch = typeof fetch;

export type EmbeddingInputType = 'document' | 'query';

export type EmbeddingResult = {
  embeddings: number[][];
  provider: 'voyage';
  model: string;
  dimensions: number;
  totalTokens?: number;
};

export class VoyageEmbeddingClient {
  readonly #config: VoyageConfig;
  readonly #fetch: Fetch;

  constructor(config: VoyageConfig, fetchImplementation: Fetch = fetch) {
    this.#config = config;
    this.#fetch = fetchImplementation;
  }

  async embed(input: string[], inputType: EmbeddingInputType): Promise<EmbeddingResult> {
    if (input.length === 0 || input.some((item) => item.trim().length === 0)) {
      throw new ProviderError({
        message: 'Embedding input must contain one or more non-empty strings.',
        code: 'VOYAGE_INVALID_INPUT',
        retryable: false,
      });
    }

    const response = await this.#fetch(`${this.#config.baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.#config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input,
        input_type: inputType,
        model: this.#config.model,
        output_dimension: this.#config.dimensions,
        output_dtype: 'float',
        truncation: false,
      }),
      signal: AbortSignal.timeout(this.#config.timeoutMs),
    });

    if (!response.ok) {
      throw providerHttpError('voyage', response.status);
    }

    const parsed = VoyageResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new ProviderError({
        message: 'Voyage returned a response that failed schema validation.',
        code: 'VOYAGE_INVALID_RESPONSE',
        retryable: false,
      });
    }

    const ordered = [...parsed.data.data].sort((left, right) => left.index - right.index);
    if (
      ordered.length !== input.length ||
      ordered.some(
        ({ embedding }) =>
          embedding.length !== this.#config.dimensions ||
          embedding.some((component) => !Number.isFinite(component)),
      )
    ) {
      throw new ProviderError({
        message: 'Voyage returned an unexpected embedding count or dimension.',
        code: 'VOYAGE_DIMENSION_MISMATCH',
        retryable: false,
      });
    }

    return {
      embeddings: ordered.map(({ embedding }) => embedding),
      provider: 'voyage',
      model: parsed.data.model ?? this.#config.model,
      dimensions: this.#config.dimensions,
      totalTokens: parsed.data.usage?.total_tokens,
    };
  }
}
