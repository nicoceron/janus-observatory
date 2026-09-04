import { describe, expect, it, vi } from 'vitest';

import {
  DeepSeekResponsesClient,
  ProviderError,
  VoyageEmbeddingClient,
  inspectAiRuntime,
  redactCredentials,
} from './index';

const deepSeekConfig = {
  apiKey: 'test-secret',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash',
  protocol: 'responses' as const,
  timeoutMs: 1_000,
};

describe('DeepSeek Responses adapter', () => {
  it('returns public output and telemetry without reasoning text', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        id: 'response-1',
        model: 'deepseek-v4-flash',
        status: 'completed',
        output: [
          {
            type: 'reasoning',
            content: [{ type: 'reasoning_text', text: 'private chain of thought' }],
          },
          { type: 'message', content: [{ type: 'output_text', text: 'Cited answer.' }] },
        ],
        usage: {
          input_tokens: 20,
          output_tokens: 10,
          total_tokens: 30,
          input_tokens_details: { cached_tokens: 4 },
          output_tokens_details: { reasoning_tokens: 6 },
        },
      }),
    );
    const client = new DeepSeekResponsesClient(deepSeekConfig, mockFetch);
    const controller = new AbortController();

    const result = await client.createText({
      instructions: 'Use sources.',
      input: 'Compare S4.',
      signal: controller.signal,
    });

    expect(result.text).toBe('Cited answer.');
    expect(JSON.stringify(result)).not.toContain('private chain of thought');
    expect(result.telemetry.reasoningTokens).toBe(6);
    const forwardedSignal = mockFetch.mock.calls[0]?.[1]?.signal;
    expect(forwardedSignal).toBeInstanceOf(AbortSignal);
    controller.abort();
    expect(forwardedSignal?.aborted).toBe(true);
  });

  it('redacts credential-shaped strings from provider errors', () => {
    const deepSeekShapedSecret = `sk-${'x'.repeat(24)}`;
    const voyageShapedSecret = `pa-${'y'.repeat(24)}`;

    expect(redactCredentials(`failed for ${deepSeekShapedSecret}`)).toBe('failed for [REDACTED]');
    expect(
      new ProviderError({
        message: `bad ${voyageShapedSecret}`,
        code: 'BAD',
        retryable: false,
      }).message,
    ).toBe('bad [REDACTED]');
  });
});

describe('Voyage embedding adapter', () => {
  it('enforces the configured vector dimension', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
        model: 'voyage-test',
        usage: { total_tokens: 4 },
      }),
    );
    const client = new VoyageEmbeddingClient(
      {
        apiKey: 'test-secret',
        baseUrl: 'https://api.voyageai.com',
        model: 'voyage-test',
        dimensions: 3,
        timeoutMs: 1_000,
      },
      mockFetch,
    );

    const result = await client.embed(['Project Janus'], 'document');

    expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
    expect(result.dimensions).toBe(3);
  });
});

describe('runtime status', () => {
  it('never returns secret values', () => {
    const status = inspectAiRuntime({
      DEEPSEEK_API_KEY: 'test-deepseek-secret',
      VOYAGE_API_KEY: 'test-voyage-secret',
      JANUS_RESEARCH_MAX_CONCURRENCY: '7',
    });

    expect(status.deepSeek.configured).toBe(true);
    expect(status.voyage.configured).toBe(true);
    expect(status.research.maxConcurrency).toBe(7);
    expect(JSON.stringify(status)).not.toContain('secret');
  });
});
