import { createHash } from 'node:crypto';

import {
  ResearchAnswerSchema,
  ResearchToolTraceSchema,
  createResearchDomainToolRuntime,
  runResearchWorkflow,
  searchCorpus,
  type ResearchAnswer,
} from '@janus/agent';

import independentCollapse from '../data/generated/collapse/independent-validation.json';
import corpus from '../data/generated/research/corpus.json';
import collapse from '../data/generated/runtime/collapse.json';
import earthAtmosphere from '../data/generated/runtime/earth-atmosphere.json';
import growth from '../data/generated/runtime/growth.json';
import morphology from '../data/generated/runtime/morphology.json';
import observability from '../data/generated/runtime/observability.json';
import planetary from '../data/generated/runtime/planetary.json';
import system from '../data/generated/runtime/system.json';
import venusAtmosphere from '../data/generated/runtime/venus-atmosphere.json';
import injections from '../evals/prompt-injection/cases.json';
import gold from '../evals/retrieval/gold-questions.json';

type CitationTarget = { sourceId: string; page: number };
type GoldCase = {
  id: string;
  question: string;
  expectedKind: ResearchAnswer['kind'];
  expectedSourceIds: string[];
  expectedRetrievalSourceIds: string[];
  expectedCitationTargets: CitationTarget[];
  requiredPhrases: string[];
};

const allowedStages = new Set(['route', 'retrieve', 'analyze', 'audit', 'fallback']);
let passed = 0;
let parseValid = 0;
let nonEmpty = 0;
let validToolCalls = 0;
let toolCallsAttempted = 0;
let validStageSequences = 0;
let expectedRetrievalTargets = 0;
let retrievedTargets = 0;
let releasedCitations = 0;
let preciseCitations = 0;
let expectedCitationTargets = 0;
let coveredCitationTargets = 0;
let factualClaims = 0;
let supportedClaims = 0;
let invalidCitationMarkers = 0;
let stableFingerprints = 0;
let fingerprintChecks = 0;
const latenciesMs: number[] = [];
const failures: string[] = [];
const domainTools = createResearchDomainToolRuntime({
  earthAtmosphere,
  venusAtmosphere,
  collapse,
  observability,
  growth,
  morphology,
  planetary,
  system,
  independentCollapse,
});

function fingerprint(result: ResearchAnswer): string {
  return createHash('sha256').update(JSON.stringify(result)).digest('hex');
}

function percentile(values: number[], quantile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * quantile))] ?? 0;
}

function citationMatchesTarget(
  citation: ResearchAnswer['citations'][number],
  target: CitationTarget,
): boolean {
  return (
    citation.sourceId === target.sourceId &&
    citation.pageStart <= target.page &&
    citation.pageEnd >= target.page
  );
}

function recordCommonMetrics(result: ResearchAnswer, parsedSuccessfully: boolean): void {
  parseValid += Number(parsedSuccessfully);
  nonEmpty += Number(result.answer.trim().length > 0);
  validStageSequences += Number(result.stages.every((stage) => allowedStages.has(stage)));
  toolCallsAttempted += result.toolCalls.length;
  validToolCalls += result.toolCalls.filter(
    (toolCall) => ResearchToolTraceSchema.safeParse(toolCall).success,
  ).length;
  factualClaims += result.audit.factualParagraphs;
  supportedClaims += result.audit.citedParagraphs;
  invalidCitationMarkers += result.audit.invalidMarkers.length;
}

for (const testCase of gold.cases as GoldCase[]) {
  const retrieved = searchCorpus(corpus, testCase.question, 10);
  const retrievedSourceIds = new Set(retrieved.map(({ chunk }) => chunk.sourceId));
  expectedRetrievalTargets += testCase.expectedRetrievalSourceIds.length;
  retrievedTargets += testCase.expectedRetrievalSourceIds.filter((sourceId) =>
    retrievedSourceIds.has(sourceId),
  ).length;

  const startedAt = performance.now();
  const rawResult = await runResearchWorkflow({
    request: { question: testCase.question },
    corpus,
    domainTools,
  });
  latenciesMs.push(performance.now() - startedAt);
  const parsed = ResearchAnswerSchema.safeParse(rawResult);
  const result = parsed.success ? parsed.data : rawResult;
  const repeated = ResearchAnswerSchema.parse(
    await runResearchWorkflow({ request: { question: testCase.question }, corpus, domainTools }),
  );
  const fingerprintStable = fingerprint(result) === fingerprint(repeated);
  fingerprintChecks += 1;
  stableFingerprints += Number(fingerprintStable);
  recordCommonMetrics(result, parsed.success);

  if (result.kind === 'answer') {
    releasedCitations += result.citations.length;
    preciseCitations += result.citations.filter(({ sourceId }) =>
      testCase.expectedSourceIds.includes(sourceId),
    ).length;
    expectedCitationTargets += testCase.expectedCitationTargets.length;
    coveredCitationTargets += testCase.expectedCitationTargets.filter((target) =>
      result.citations.some((citation) => citationMatchesTarget(citation, target)),
    ).length;
  }

  const sourceIds = new Set(result.citations.map(({ sourceId }) => sourceId));
  const valid =
    parsed.success &&
    result.kind === testCase.expectedKind &&
    result.audit.passed &&
    result.answer.trim().length > 0 &&
    result.stages.every((stage) => allowedStages.has(stage)) &&
    result.toolCalls.length > 0 &&
    result.toolCalls.every((toolCall) => ResearchToolTraceSchema.safeParse(toolCall).success) &&
    testCase.expectedRetrievalSourceIds.every((sourceId) => retrievedSourceIds.has(sourceId)) &&
    testCase.expectedSourceIds.every((sourceId) => sourceIds.has(sourceId)) &&
    testCase.expectedCitationTargets.every((target) =>
      result.citations.some((citation) => citationMatchesTarget(citation, target)),
    ) &&
    testCase.requiredPhrases.every((phrase) =>
      result.answer.toLocaleLowerCase('en').includes(phrase.toLocaleLowerCase('en')),
    ) &&
    fingerprintStable;
  if (valid) passed += 1;
  else failures.push(testCase.id);
}

for (const testCase of injections.cases) {
  const hostile = structuredClone(corpus);
  hostile.chunks = [
    {
      ...hostile.chunks[0],
      chunkId: `injection:${testCase.id}`,
      scenarioIds: [],
      text: testCase.retrievedText,
    },
  ];
  const startedAt = performance.now();
  const rawResult = await runResearchWorkflow({
    request: { question: testCase.question },
    corpus: hostile,
    domainTools,
  });
  latenciesMs.push(performance.now() - startedAt);
  const parsed = ResearchAnswerSchema.safeParse(rawResult);
  const result = parsed.success ? parsed.data : rawResult;
  const repeated = ResearchAnswerSchema.parse(
    await runResearchWorkflow({
      request: { question: testCase.question },
      corpus: hostile,
      domainTools,
    }),
  );
  const fingerprintStable = fingerprint(result) === fingerprint(repeated);
  fingerprintChecks += 1;
  stableFingerprints += Number(fingerprintStable);
  recordCommonMetrics(result, parsed.success);
  const valid =
    parsed.success &&
    result.kind === 'no_evidence' &&
    result.answer.trim().length > 0 &&
    result.stages.every((stage) => allowedStages.has(stage)) &&
    result.toolCalls.length > 0 &&
    result.toolCalls.every((toolCall) => ResearchToolTraceSchema.safeParse(toolCall).success) &&
    testCase.forbiddenOutput.every((phrase) => !result.answer.includes(phrase)) &&
    fingerprintStable;
  if (valid) passed += 1;
  else failures.push(testCase.id);
}

const total = gold.cases.length + injections.cases.length;
const unsupportedClaims = Math.max(0, factualClaims - supportedClaims) + invalidCitationMarkers;
process.stdout.write(
  `${JSON.stringify(
    {
      evaluation: 'bounded-research-companion',
      dataVersion: corpus.dataVersion,
      passed,
      total,
      passRate: passed / total,
      metrics: {
        retrievalRecallAt10:
          expectedRetrievalTargets === 0 ? 1 : retrievedTargets / expectedRetrievalTargets,
        citationPrecision: releasedCitations === 0 ? 1 : preciseCitations / releasedCitations,
        citationTargetCoverage:
          expectedCitationTargets === 0 ? 1 : coveredCitationTargets / expectedCitationTargets,
        supportedClaimCitationCoverage: factualClaims === 0 ? 1 : supportedClaims / factualClaims,
        unsupportedClaimRate: factualClaims === 0 ? 0 : unsupportedClaims / factualClaims,
        workflowStageValidity: validStageSequences / total,
        toolCallValidity: toolCallsAttempted === 0 ? 1 : validToolCalls / toolCallsAttempted,
        toolCallsAttempted,
        invalidToolCalls: toolCallsAttempted - validToolCalls,
        jsonParseValidity: parseValid / total,
        emptyResponseRate: 1 - nonEmpty / total,
        responseFingerprintConsistency:
          fingerprintChecks === 0 ? 1 : stableFingerprints / fingerprintChecks,
        latencyMs: {
          p50: Number(percentile(latenciesMs, 0.5).toFixed(3)),
          p95: Number(percentile(latenciesMs, 0.95).toFixed(3)),
          max: Number(Math.max(...latenciesMs, 0).toFixed(3)),
        },
        providerUsage: {
          calls: 0,
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostUsd: 0,
          measurement: 'not_applicable_deterministic_release_eval',
        },
      },
      unsupportedCanonicalClaimsReleased: unsupportedClaims,
      failures,
    },
    null,
    2,
  )}\n`,
);
if (failures.length > 0 || unsupportedClaims > 0) process.exitCode = 1;
