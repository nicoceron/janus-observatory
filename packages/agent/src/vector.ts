import { z } from 'zod';

import { ResearchCorpusSchema, type ResearchCorpus, type VectorRetrieval } from './research';
import type { EmbeddingResult } from './voyage';

const sha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const vectorComponentSchema = z.number().finite();

export const VectorIndexSchema = z
  .object({
    schemaVersion: z.literal('1.0.0'),
    dataVersion: sha256Schema,
    corpusContentHash: sha256Schema,
    embedding: z.object({
      provider: z.string().min(1).max(50),
      model: z.string().min(1).max(100),
      dimensions: z.number().int().min(8).max(4_096),
    }),
    entries: z
      .array(
        z.object({
          chunkId: z.string().min(1).max(240),
          vector: z.array(vectorComponentSchema).min(8).max(4_096),
        }),
      )
      .min(1)
      .max(20_000),
  })
  .superRefine((index, context) => {
    const seen = new Set<string>();
    for (const [position, entry] of index.entries.entries()) {
      if (seen.has(entry.chunkId)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate vector entry for ${entry.chunkId}.`,
          path: ['entries', position, 'chunkId'],
        });
      }
      seen.add(entry.chunkId);
      if (entry.vector.length !== index.embedding.dimensions) {
        context.addIssue({
          code: 'custom',
          message: 'Vector dimension does not match the index declaration.',
          path: ['entries', position, 'vector'],
        });
      }
      if (!entry.vector.some((component) => component !== 0)) {
        context.addIssue({
          code: 'custom',
          message: 'Vector entries must have a non-zero norm.',
          path: ['entries', position, 'vector'],
        });
      }
    }
  });

export type VectorIndex = z.infer<typeof VectorIndexSchema>;
export type VectorIndexFallbackReason =
  | 'index_invalid'
  | 'data_version_mismatch'
  | 'corpus_hash_mismatch'
  | 'provider_mismatch'
  | 'model_mismatch'
  | 'dimension_mismatch'
  | 'unknown_chunk';

export type VectorIndexCompatibility =
  | { compatible: true; index: VectorIndex; corpus: ResearchCorpus }
  | { compatible: false; reason: VectorIndexFallbackReason };

export type VectorIndexExpectation = {
  provider: 'voyage';
  model: string;
  dimensions: number;
};

export function inspectVectorIndexCompatibility(
  indexInput: unknown,
  corpusInput: unknown,
  expectation: VectorIndexExpectation,
): VectorIndexCompatibility {
  const corpus = ResearchCorpusSchema.safeParse(corpusInput);
  const index = VectorIndexSchema.safeParse(indexInput);
  if (!corpus.success || !index.success) return { compatible: false, reason: 'index_invalid' };
  if (index.data.dataVersion !== corpus.data.dataVersion) {
    return { compatible: false, reason: 'data_version_mismatch' };
  }
  if (index.data.corpusContentHash !== corpus.data.contentHash) {
    return { compatible: false, reason: 'corpus_hash_mismatch' };
  }
  if (index.data.embedding.provider !== expectation.provider) {
    return { compatible: false, reason: 'provider_mismatch' };
  }
  if (index.data.embedding.model !== expectation.model) {
    return { compatible: false, reason: 'model_mismatch' };
  }
  if (index.data.embedding.dimensions !== expectation.dimensions) {
    return { compatible: false, reason: 'dimension_mismatch' };
  }
  const chunkIds = new Set(corpus.data.chunks.map(({ chunkId }) => chunkId));
  if (index.data.entries.some(({ chunkId }) => !chunkIds.has(chunkId))) {
    return { compatible: false, reason: 'unknown_chunk' };
  }
  return { compatible: true, index: index.data, corpus: corpus.data };
}

export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) {
    throw new Error('Cosine similarity requires equal, non-empty vector dimensions.');
  }
  let dot = 0;
  let leftSquared = 0;
  let rightSquared = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftComponent = left[index];
    const rightComponent = right[index];
    if (!Number.isFinite(leftComponent) || !Number.isFinite(rightComponent)) {
      throw new Error('Cosine similarity requires finite vector components.');
    }
    dot += leftComponent * rightComponent;
    leftSquared += leftComponent * leftComponent;
    rightSquared += rightComponent * rightComponent;
  }
  if (leftSquared === 0 || rightSquared === 0) {
    throw new Error('Cosine similarity requires vectors with non-zero norms.');
  }
  return Math.max(-1, Math.min(1, dot / Math.sqrt(leftSquared * rightSquared)));
}

export function rankVectorIndex(options: {
  compatibility: Extract<VectorIndexCompatibility, { compatible: true }>;
  queryEmbedding: EmbeddingResult;
  maximumCandidates?: number;
}): VectorRetrieval {
  const { index, corpus } = options.compatibility;
  const maximumCandidates = options.maximumCandidates ?? 30;
  if (!Number.isInteger(maximumCandidates) || maximumCandidates < 1 || maximumCandidates > 100) {
    throw new Error('Vector candidate limit must be an integer between one and 100.');
  }
  if (
    options.queryEmbedding.provider !== index.embedding.provider ||
    options.queryEmbedding.model !== index.embedding.model ||
    options.queryEmbedding.dimensions !== index.embedding.dimensions ||
    options.queryEmbedding.embeddings.length !== 1 ||
    options.queryEmbedding.embeddings[0]?.length !== index.embedding.dimensions
  ) {
    throw new Error('Query embedding does not match the validated vector index contract.');
  }

  const queryVector = options.queryEmbedding.embeddings[0];
  return {
    dataVersion: corpus.dataVersion,
    candidates: index.entries
      .map(({ chunkId, vector }) => ({
        chunkId,
        score: cosineSimilarity(queryVector, vector),
      }))
      .sort(
        (left, right) =>
          right.score - left.score || left.chunkId.localeCompare(right.chunkId, 'en'),
      )
      .slice(0, maximumCandidates),
  };
}
