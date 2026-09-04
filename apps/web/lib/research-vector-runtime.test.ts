import { describe, expect, it, vi } from 'vitest';

import corpus from '../../../data/generated/research/corpus.json';
import {
  inspectConfiguredHybridRetrieval,
  resolveConfiguredHybridRetrieval,
} from './research-vector-runtime';

const dimensions = 8;
const environment = {
  JANUS_RESEARCH_PREVIEW_ENABLED: 'true',
  JANUS_AGENT_LIVE_ENABLED: 'true',
  JANUS_RESEARCH_HYBRID_ENABLED: 'true',
  EMBEDDING_PROVIDER: 'voyage',
  VOYAGE_API_KEY: 'test-key',
  VOYAGE_BASE_URL: 'https://api.voyageai.com',
  VOYAGE_EMBEDDING_MODEL: 'voyage-test',
  VOYAGE_EMBEDDING_DIMENSIONS: String(dimensions),
  VOYAGE_TIMEOUT_MS: '1000',
};
const vectorIndex = {
  schemaVersion: '1.0.0',
  dataVersion: corpus.dataVersion,
  corpusContentHash: corpus.contentHash,
  embedding: { provider: 'voyage', model: 'voyage-test', dimensions },
  entries: corpus.chunks.slice(0, 2).map(({ chunkId }, index) => ({
    chunkId,
    vector: index === 0 ? [1, 0, 0, 0, 0, 0, 0, 0] : [0, 1, 0, 0, 0, 0, 0, 0],
  })),
};

describe('server-only hybrid retrieval runtime', () => {
  it('connects a compatible prebuilt index and injected query embedder', async () => {
    const embed = vi.fn().mockResolvedValue({
      embeddings: [[1, 0, 0, 0, 0, 0, 0, 0]],
      provider: 'voyage',
      model: 'voyage-test',
      dimensions,
    });
    const result = await resolveConfiguredHybridRetrieval({
      environment,
      corpus,
      query: 'Project Janus evidence',
      loadIndex: async () => vectorIndex,
      createClient: () => ({ embed }),
    });

    expect(result.status).toMatchObject({
      requestedMode: 'hybrid',
      actualMode: 'hybrid',
      fallbackReason: null,
      vectorCandidateCount: 2,
    });
    expect(result.vectorRetrieval?.candidates[0]?.chunkId).toBe(vectorIndex.entries[0]?.chunkId);
    expect(embed).toHaveBeenCalledWith(['Project Janus evidence'], 'query');
  });

  it('never loads an index or calls a provider while preview is disabled', async () => {
    const loadIndex = vi.fn().mockResolvedValue(vectorIndex);
    const createClient = vi.fn();
    const result = await resolveConfiguredHybridRetrieval({
      environment: { ...environment, JANUS_RESEARCH_PREVIEW_ENABLED: 'false' },
      corpus,
      query: 'Project Janus evidence',
      loadIndex,
      createClient,
    });

    expect(result.status).toMatchObject({
      requestedMode: 'lexical',
      actualMode: 'lexical',
      fallbackReason: 'preview_disabled',
    });
    expect(loadIndex).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('falls back before provider access for stale indexes', async () => {
    const createClient = vi.fn();
    const result = await resolveConfiguredHybridRetrieval({
      environment,
      corpus,
      query: 'Project Janus evidence',
      loadIndex: async () => ({ ...vectorIndex, dataVersion: `sha256:${'0'.repeat(64)}` }),
      createClient,
    });

    expect(result.vectorRetrieval).toBeUndefined();
    expect(result.status).toMatchObject({
      actualMode: 'lexical',
      fallbackReason: 'data_version_mismatch',
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it('falls back safely on missing indexes and provider errors', async () => {
    const missing = await inspectConfiguredHybridRetrieval({
      environment,
      corpus,
      loadIndex: async () => undefined,
    });
    const providerFailure = await resolveConfiguredHybridRetrieval({
      environment,
      corpus,
      query: 'Project Janus evidence',
      loadIndex: async () => vectorIndex,
      createClient: () => ({ embed: vi.fn().mockRejectedValue(new Error('offline')) }),
    });

    expect(missing).toMatchObject({ actualMode: 'lexical', fallbackReason: 'index_missing' });
    expect(providerFailure.status).toMatchObject({
      actualMode: 'lexical',
      fallbackReason: 'embedding_error',
    });
  });

  it('keeps lexical retrieval available for an unsupported provider setting', async () => {
    const loadIndex = vi.fn();
    const result = await resolveConfiguredHybridRetrieval({
      environment: { ...environment, EMBEDDING_PROVIDER: 'not-supported' },
      corpus,
      query: 'Project Janus evidence',
      loadIndex,
    });

    expect(result.status).toMatchObject({
      actualMode: 'lexical',
      fallbackReason: 'provider_unsupported',
    });
    expect(loadIndex).not.toHaveBeenCalled();
  });
});
