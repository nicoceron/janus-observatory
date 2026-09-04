import { describe, expect, it } from 'vitest';

import corpus from '../../../data/generated/research/corpus.json';
import {
  VectorIndexSchema,
  cosineSimilarity,
  inspectVectorIndexCompatibility,
  rankVectorIndex,
} from './vector';

const dimensions = 8;
const chunkIds = corpus.chunks.slice(0, 3).map(({ chunkId }) => chunkId);
const index = {
  schemaVersion: '1.0.0',
  dataVersion: corpus.dataVersion,
  corpusContentHash: corpus.contentHash,
  embedding: { provider: 'voyage', model: 'voyage-test', dimensions },
  entries: [
    { chunkId: chunkIds[0], vector: [1, 0, 0, 0, 0, 0, 0, 0] },
    { chunkId: chunkIds[1], vector: [0.8, 0.2, 0, 0, 0, 0, 0, 0] },
    { chunkId: chunkIds[2], vector: [0, 1, 0, 0, 0, 0, 0, 0] },
  ],
} as const;
const expectation = { provider: 'voyage' as const, model: 'voyage-test', dimensions };

describe('prebuilt vector-index contract', () => {
  it('rejects duplicate, zero-norm, and wrong-dimension entries', () => {
    const invalid = {
      ...index,
      entries: [
        index.entries[0],
        { chunkId: index.entries[0].chunkId, vector: [0, 0, 0, 0, 0, 0, 0] },
      ],
    };

    expect(VectorIndexSchema.safeParse(invalid).success).toBe(false);
  });

  it.each([
    ['data_version_mismatch', { dataVersion: `sha256:${'0'.repeat(64)}` }],
    ['corpus_hash_mismatch', { corpusContentHash: `sha256:${'1'.repeat(64)}` }],
  ])('fails compatibility on %s', (reason, override) => {
    expect(inspectVectorIndexCompatibility({ ...index, ...override }, corpus, expectation)).toEqual(
      { compatible: false, reason },
    );
  });

  it('validates provider model, dimension, and corpus chunk ownership', () => {
    expect(
      inspectVectorIndexCompatibility(
        { ...index, embedding: { ...index.embedding, provider: 'other-provider' } },
        corpus,
        expectation,
      ),
    ).toEqual({ compatible: false, reason: 'provider_mismatch' });
    expect(
      inspectVectorIndexCompatibility(index, corpus, { ...expectation, model: 'other-model' }),
    ).toEqual({ compatible: false, reason: 'model_mismatch' });
    expect(
      inspectVectorIndexCompatibility(index, corpus, { ...expectation, dimensions: 16 }),
    ).toEqual({ compatible: false, reason: 'dimension_mismatch' });
    expect(
      inspectVectorIndexCompatibility(
        { ...index, entries: [{ ...index.entries[0], chunkId: 'unknown:chunk' }] },
        corpus,
        expectation,
      ),
    ).toEqual({ compatible: false, reason: 'unknown_chunk' });
  });

  it('ranks finite cosine similarity deterministically and enforces top-k bounds', () => {
    const compatibility = inspectVectorIndexCompatibility(index, corpus, expectation);
    expect(compatibility.compatible).toBe(true);
    if (!compatibility.compatible) throw new Error('expected compatible fixture');
    const result = rankVectorIndex({
      compatibility,
      queryEmbedding: {
        embeddings: [[1, 0, 0, 0, 0, 0, 0, 0]],
        provider: 'voyage',
        model: 'voyage-test',
        dimensions,
      },
      maximumCandidates: 2,
    });

    expect(result.candidates.map(({ chunkId }) => chunkId)).toEqual(chunkIds.slice(0, 2));
    expect(result.candidates[0]?.score).toBeCloseTo(1);
    expect(() =>
      rankVectorIndex({
        compatibility,
        queryEmbedding: {
          embeddings: [[1, 0, 0, 0, 0, 0, 0, 0]],
          provider: 'voyage',
          model: 'voyage-test',
          dimensions,
        },
        maximumCandidates: 101,
      }),
    ).toThrow('between one and 100');
  });

  it('rejects invalid cosine inputs and query embedding contracts', () => {
    expect(() => cosineSimilarity([0, 0], [1, 0])).toThrow('non-zero norms');
    expect(() => cosineSimilarity([1], [1, 0])).toThrow('equal, non-empty');
    const compatibility = inspectVectorIndexCompatibility(index, corpus, expectation);
    if (!compatibility.compatible) throw new Error('expected compatible fixture');
    expect(() =>
      rankVectorIndex({
        compatibility,
        queryEmbedding: {
          embeddings: [[1, 0, 0, 0, 0, 0, 0, 0]],
          provider: 'voyage',
          model: 'wrong-model',
          dimensions,
        },
      }),
    ).toThrow('does not match');
  });
});
