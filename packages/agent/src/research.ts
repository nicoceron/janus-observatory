import { z } from 'zod';

import {
  hashResearchToolResult,
  planResearchDomainToolCalls,
  ResearchToolTraceSchema,
  traceResearchToolResult,
  type ResearchDomainToolResult,
  type ResearchDomainToolRuntime,
  type ResearchToolTrace,
} from './domain-tools';

const ScenarioIdSchema = z.enum(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']);

export const CorpusChunkSchema = z.object({
  chunkId: z.string().min(1),
  sourceId: z.string().min(1),
  sourceVersion: z.string().min(1),
  scenarioIds: z.array(ScenarioIdSchema),
  pageStart: z.number().int().positive(),
  pageEnd: z.number().int().positive(),
  headingPath: z.array(z.string().min(1)).min(1),
  text: z.string().min(1),
  contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  rights: z.string().min(1),
  evidenceKind: z.enum(['reported', 'transcribed']),
});

export const ResearchCorpusSchema = z.object({
  schemaVersion: z.string().min(1),
  dataVersion: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  generatedAt: z.string().datetime({ offset: true }),
  retrievalMode: z.string().min(1),
  chunks: z.array(CorpusChunkSchema).min(1),
});

export const ResearchRequestSchema = z.object({
  question: z.string().trim().min(8).max(600),
});

export const ResearchCitationSchema = z.object({
  chunkId: z.string().min(1),
  sourceId: z.string().min(1),
  sourceVersion: z.string().min(1),
  pageStart: z.number().int().positive(),
  pageEnd: z.number().int().positive(),
  heading: z.string().min(1),
  url: z.string().url().optional(),
});

export const ResearchAnswerSchema = z.object({
  kind: z.enum(['answer', 'refusal', 'no_evidence']),
  answer: z.string().min(1),
  citations: z.array(ResearchCitationSchema),
  stages: z.array(z.enum(['route', 'retrieve', 'analyze', 'audit', 'fallback'])),
  retrievalMode: z.enum(['lexical', 'hybrid']),
  generationMode: z.enum(['deterministic', 'provider']),
  providerFallback: z.boolean(),
  dataVersion: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  toolCalls: z.array(ResearchToolTraceSchema).max(12),
  audit: z.object({
    passed: z.boolean(),
    factualParagraphs: z.number().int().nonnegative(),
    citedParagraphs: z.number().int().nonnegative(),
    invalidMarkers: z.array(z.string()),
  }),
});

export type CorpusChunk = z.infer<typeof CorpusChunkSchema>;
export type ResearchCorpus = z.infer<typeof ResearchCorpusSchema>;
export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;
export type ResearchCitation = z.infer<typeof ResearchCitationSchema>;
export type ResearchAnswer = z.infer<typeof ResearchAnswerSchema>;

export type RankedPassage = { chunk: CorpusChunk; score: number };

export const VectorRetrievalSchema = z.object({
  dataVersion: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  candidates: z
    .array(
      z.object({
        chunkId: z.string().min(1),
        score: z.number().finite().optional(),
      }),
    )
    .max(100),
});

export type VectorRetrieval = z.infer<typeof VectorRetrievalSchema>;
export type RetrievalResult = {
  passages: RankedPassage[];
  retrievalMode: 'lexical' | 'hybrid';
};

const stopWords = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'do',
  'does',
  'for',
  'from',
  'how',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'to',
  'what',
  'which',
  'why',
  'with',
]);

function tokens(value: string): string[] {
  return (value.toLocaleLowerCase('en').match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (token) => token.length > 1 && !stopWords.has(token),
  );
}

export function searchCorpus(
  corpusInput: unknown,
  query: string,
  maximumPassages = 8,
): RankedPassage[] {
  const corpus = ResearchCorpusSchema.parse(corpusInput);
  const queryTokens = [...new Set(tokens(query))];
  const scenarioMentions = query.toUpperCase().match(/\bS(?:10|[1-9])\b/g) ?? [];
  if (queryTokens.length === 0) return [];

  return corpus.chunks
    .map((chunk) => {
      const textTokens = tokens(`${chunk.headingPath.join(' ')} ${chunk.text}`);
      const frequencies = new Map<string, number>();
      for (const token of textTokens) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
      let score = queryTokens.reduce(
        (total, token) => total + Math.min(frequencies.get(token) ?? 0, 4),
        0,
      );
      score /= Math.sqrt(Math.max(textTokens.length, 1));
      score +=
        scenarioMentions.filter((scenario) =>
          chunk.scenarioIds.includes(scenario as z.infer<typeof ScenarioIdSchema>),
        ).length * 4;
      if (score > 0 && chunk.chunkId.startsWith('canonical:')) score += 6;
      return { chunk, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.chunk.chunkId.localeCompare(right.chunk.chunkId, 'en'),
    )
    .slice(0, Math.max(1, Math.min(maximumPassages, 12)));
}

/**
 * Fuse lexical and optional vector ranks with reciprocal-rank fusion. Vector candidates are used
 * only when they declare the exact corpus data version and resolve to corpus chunks. This keeps a
 * stale or partially built vector index from silently changing the evidence set.
 */
export function retrieveCorpus(
  corpusInput: unknown,
  query: string,
  maximumPassages = 8,
  vectorInput?: unknown,
): RetrievalResult {
  const corpus = ResearchCorpusSchema.parse(corpusInput);
  const limit = Math.max(1, Math.min(maximumPassages, 12));
  const lexical = searchCorpus(corpus, query, 12);
  const vector = VectorRetrievalSchema.safeParse(vectorInput);
  if (
    !vector.success ||
    vector.data.dataVersion !== corpus.dataVersion ||
    vector.data.candidates.length === 0
  ) {
    return { passages: lexical.slice(0, limit), retrievalMode: 'lexical' };
  }

  const chunks = new Map(corpus.chunks.map((chunk) => [chunk.chunkId, chunk]));
  const seenVectorIds = new Set<string>();
  const vectorCandidates = vector.data.candidates.filter(({ chunkId }) => {
    if (!chunks.has(chunkId) || seenVectorIds.has(chunkId)) return false;
    seenVectorIds.add(chunkId);
    return true;
  });
  if (vectorCandidates.length === 0) {
    return { passages: lexical.slice(0, limit), retrievalMode: 'lexical' };
  }

  const rrfConstant = 60;
  const fused = new Map<string, number>();
  lexical.forEach(({ chunk }, index) => {
    fused.set(chunk.chunkId, (fused.get(chunk.chunkId) ?? 0) + 1 / (rrfConstant + index + 1));
  });
  vectorCandidates.forEach(({ chunkId }, index) => {
    fused.set(chunkId, (fused.get(chunkId) ?? 0) + 1 / (rrfConstant + index + 1));
  });

  return {
    passages: [...fused.entries()]
      .map(([chunkId, score]) => ({ chunk: chunks.get(chunkId)!, score }))
      .sort(
        (left, right) =>
          right.score - left.score || left.chunk.chunkId.localeCompare(right.chunk.chunkId, 'en'),
      )
      .slice(0, limit),
    retrievalMode: 'hybrid',
  };
}

function citationFor(chunk: CorpusChunk): ResearchCitation {
  return {
    chunkId: chunk.chunkId,
    sourceId: chunk.sourceId,
    sourceVersion: chunk.sourceVersion,
    pageStart: chunk.pageStart,
    pageEnd: chunk.pageEnd,
    heading: chunk.headingPath.join(' › '),
  };
}

function marker(citation: ResearchCitation): string {
  const pages =
    citation.pageStart === citation.pageEnd
      ? String(citation.pageStart)
      : `${citation.pageStart}-${citation.pageEnd}`;
  return `[${citation.sourceId} p.${pages}]`;
}

const citationMarkerPattern = /\[([A-Za-z0-9._-]+) p\.(\d+)(?:-(\d+))?\]/g;

export function filterCitationsToUsedTargets(
  answer: string,
  citations: ResearchCitation[],
): ResearchCitation[] {
  const targets = [...answer.matchAll(citationMarkerPattern)].map((match) => ({
    sourceId: match[1],
    pageStart: Number(match[2]),
    pageEnd: Number(match[3] ?? match[2]),
  }));
  return citations.filter((citation) =>
    targets.some(
      (target) =>
        target.sourceId === citation.sourceId &&
        target.pageStart <= citation.pageEnd &&
        target.pageEnd >= citation.pageStart,
    ),
  );
}

export function auditCitations(answer: string, citations: ResearchCitation[]) {
  const factualParagraphs = answer
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !paragraph.startsWith('I cannot') && !paragraph.startsWith('I found'));
  let citedParagraphs = 0;
  const invalidMarkers: string[] = [];
  const valid = new Set(
    citations.flatMap((citation) => {
      const markers = [];
      for (let page = citation.pageStart; page <= citation.pageEnd; page += 1) {
        markers.push(`${citation.sourceId}:${page}`);
      }
      return markers;
    }),
  );

  for (const paragraph of factualParagraphs) {
    const matches = [...paragraph.matchAll(citationMarkerPattern)];
    let paragraphHasValidCitation = false;
    for (const match of matches) {
      const start = Number(match[2]);
      const end = Number(match[3] ?? match[2]);
      const isValid = Array.from({ length: end - start + 1 }, (_, index) => start + index).every(
        (page) => valid.has(`${match[1]}:${page}`),
      );
      if (!isValid) invalidMarkers.push(match[0]);
      paragraphHasValidCitation ||= isValid;
    }
    if (paragraphHasValidCitation) citedParagraphs += 1;
  }
  return {
    passed: factualParagraphs.length === citedParagraphs && invalidMarkers.length === 0,
    factualParagraphs: factualParagraphs.length,
    citedParagraphs,
    invalidMarkers,
  };
}

function isProbabilityRequest(question: string): boolean {
  return /\b(most likely|least likely|probabilit(?:y|ies)|rank(?:ing)? scenarios|janus predict)/i.test(
    question,
  );
}

function preferredTopics(question: string): string[] {
  if (/detect|observ|instrument|spectrum|signature|hwo|radio|life|probe/i.test(question)) {
    return ['observability'];
  }
  if (/collapse|recovery|duty|resilien|hazard/i.test(question)) return ['collapse'];
  if (/population|energy|growth/i.test(question)) return ['growth'];
  if (/factor|cluster|morpholog|myth|metaphor/i.test(question)) return ['scenario'];
  return [];
}

function deterministicAnswer(
  question: string,
  passages: RankedPassage[],
  dataVersion: string,
  retrievalMode: 'lexical' | 'hybrid',
  toolCalls: ResearchToolTrace[],
): ResearchAnswer {
  if (isProbabilityRequest(question)) {
    const answer =
      'I cannot rank the Janus scenarios by probability or call one “most likely.” The source set defines self-consistent possibilities, not forecasts or equally weighted probabilities.';
    return ResearchAnswerSchema.parse({
      kind: 'refusal',
      answer,
      citations: [],
      stages: ['route', 'fallback', 'audit'],
      retrievalMode,
      generationMode: 'deterministic',
      providerFallback: false,
      dataVersion,
      toolCalls: [...toolCalls, citationResolutionTrace(answer, [], 'citation-tool-1')],
      audit: auditCitations(answer, []),
    });
  }

  const requestsUnsupportedParameterEffects =
    /\b(parameter effect|sensitivity|parameter sweep|raise duty|increase duty|decrease duty)/i.test(
      question,
    );
  const topics = requestsUnsupportedParameterEffects ? [] : preferredTopics(question);
  const scenarios = question.toUpperCase().match(/\bS(?:10|[1-9])\b/g) ?? [];
  const structured = passages.filter(({ chunk }) => {
    if (!chunk.chunkId.startsWith('canonical:')) return false;
    const topicMatch = topics.some((topic) => chunk.chunkId.endsWith(`:${topic}`));
    const scenarioMatch =
      scenarios.length === 0 ||
      scenarios.some((scenario) =>
        chunk.scenarioIds.includes(scenario as z.infer<typeof ScenarioIdSchema>),
      );
    return topicMatch && scenarioMatch;
  });
  const selected = structured.slice(0, Math.max(1, Math.min(scenarios.length || 2, 3)));
  const citations = selected.map(({ chunk }) => citationFor(chunk));
  if (selected.length === 0) {
    const relevant = passages.slice(0, 5).map(({ chunk }) => citationFor(chunk));
    const answer = passages.length
      ? 'I found relevant approved passages, but the deterministic fallback has no bounded synthesis template for this question. Inspect the citations or ask about a named scenario, observing method, growth field, or reported collapse metric.'
      : 'I found no approved corpus passage that supports an answer. Try naming a Janus scenario, observing method, growth field, or reported collapse metric.';
    return ResearchAnswerSchema.parse({
      kind: 'no_evidence',
      answer,
      citations: relevant,
      stages: ['route', 'retrieve', 'fallback', 'audit'],
      retrievalMode,
      generationMode: 'deterministic',
      providerFallback: false,
      dataVersion,
      toolCalls: [...toolCalls, citationResolutionTrace(answer, [], 'citation-tool-1')],
      audit: auditCitations(answer, []),
    });
  }

  const answer = selected
    .map(({ chunk }, index) => `${chunk.text} ${marker(citations[index])}`)
    .join('\n\n');
  const audit = auditCitations(answer, citations);
  if (!audit.passed) throw new Error('Deterministic research answer failed its citation audit.');
  return ResearchAnswerSchema.parse({
    kind: 'answer',
    answer,
    citations,
    stages: ['route', 'retrieve', 'analyze', 'audit'],
    retrievalMode,
    generationMode: 'deterministic',
    providerFallback: false,
    dataVersion,
    toolCalls: [...toolCalls, citationResolutionTrace(answer, citations, 'citation-tool-1')],
    audit,
  });
}

function workflowToolTrace(
  callId: string,
  name: 'search_corpus' | 'fetch_passages' | 'resolve_citations',
  payload: unknown,
): ResearchToolTrace {
  return ResearchToolTraceSchema.parse({
    callId,
    name,
    status: 'ok',
    resultHash: hashResearchToolResult(payload),
  });
}

function citationResolutionTrace(
  answer: string,
  citations: ResearchCitation[],
  callId: string,
): ResearchToolTrace {
  return workflowToolTrace(callId, 'resolve_citations', auditCitations(answer, citations));
}

export type LiveGenerator = (input: {
  question: string;
  passages: CorpusChunk[];
  citations: ResearchCitation[];
  toolResults: ResearchDomainToolResult[];
  signal?: AbortSignal;
}) => Promise<string>;

export async function runResearchWorkflow(options: {
  request: unknown;
  corpus: unknown;
  liveGenerator?: LiveGenerator;
  maximumPassages?: number;
  maximumToolRounds?: number;
  domainTools?: ResearchDomainToolRuntime;
  signal?: AbortSignal;
  vectorRetrieval?: unknown;
}): Promise<ResearchAnswer> {
  const request = ResearchRequestSchema.parse(options.request);
  const corpus = ResearchCorpusSchema.parse(options.corpus);
  const maximumToolRounds = Math.floor(options.maximumToolRounds ?? 3);
  if (maximumToolRounds < 1 || maximumToolRounds > 6) {
    throw new Error('Research workflow tool-round budget must be between one and six.');
  }
  options.signal?.throwIfAborted();

  const plannedDomainCalls = options.domainTools
    ? planResearchDomainToolCalls(request.question)
    : [];
  const toolRoundsUsed = 2 + Number(plannedDomainCalls.length > 0);
  if (toolRoundsUsed > maximumToolRounds) {
    throw new Error('Research workflow exhausted its tool-round budget.');
  }
  const retrieval = retrieveCorpus(
    corpus,
    request.question,
    options.maximumPassages ?? 8,
    options.vectorRetrieval,
  );
  options.signal?.throwIfAborted();
  const passages = retrieval.passages;
  const toolCalls: ResearchToolTrace[] = [
    workflowToolTrace(
      'corpus-tool-1',
      'search_corpus',
      passages.map(({ chunk, score }) => ({ chunkId: chunk.chunkId, score })),
    ),
    workflowToolTrace(
      'corpus-tool-2',
      'fetch_passages',
      passages.map(({ chunk }) => ({ chunkId: chunk.chunkId, contentHash: chunk.contentHash })),
    ),
  ];
  const toolResults = options.domainTools
    ? await Promise.all(
        plannedDomainCalls.map((call, index) => options.domainTools!.execute(call, index + 1)),
      )
    : [];
  toolCalls.push(...toolResults.map(traceResearchToolResult));
  options.signal?.throwIfAborted();
  const fallback = deterministicAnswer(
    request.question,
    passages,
    corpus.dataVersion,
    retrieval.retrievalMode,
    toolCalls,
  );
  if (!options.liveGenerator || fallback.kind !== 'answer') return fallback;

  const citations = passages.map(({ chunk }) => citationFor(chunk));
  try {
    const answer = await options.liveGenerator({
      question: request.question,
      passages: passages.map(({ chunk }) => chunk),
      citations,
      toolResults,
      signal: options.signal,
    });
    options.signal?.throwIfAborted();
    const audit = auditCitations(answer, citations);
    if (!audit.passed) {
      return ResearchAnswerSchema.parse({
        ...fallback,
        stages: [...fallback.stages.slice(0, -1), 'fallback', 'audit'],
        providerFallback: true,
      });
    }
    const usedCitations = filterCitationsToUsedTargets(answer, citations);
    return ResearchAnswerSchema.parse({
      kind: 'answer',
      answer,
      citations: usedCitations,
      stages: ['route', 'retrieve', 'analyze', 'audit'],
      retrievalMode: retrieval.retrievalMode,
      generationMode: 'provider',
      providerFallback: false,
      dataVersion: corpus.dataVersion,
      toolCalls: [...toolCalls, citationResolutionTrace(answer, citations, 'citation-tool-1')],
      audit,
    });
  } catch {
    return ResearchAnswerSchema.parse({
      ...fallback,
      stages: [...fallback.stages.slice(0, -1), 'fallback', 'audit'],
      providerFallback: true,
    });
  }
}
