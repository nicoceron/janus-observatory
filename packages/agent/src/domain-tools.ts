import { createHash } from 'node:crypto';

import {
  CollapseModelDatasetSchema,
  ObservabilityDatasetSchema,
  ObservingMissionSchema,
  PublishedNumericTableSchema,
  ScenarioGrowthDatasetSchema,
  ScenarioIdSchema,
  ScenarioMorphologyDatasetSchema,
  SourceRefSchema,
  SystemTechnosignatureDatasetSchema,
  PlanetaryTechnosignatureDatasetSchema,
  resolvePublishedObservation,
  type EvidenceKind,
  type SourceRef,
} from '@janus/domain';
import { z } from 'zod';

export const ResearchDomainToolNameSchema = z.enum([
  'get_scenario',
  'compare_scenarios',
  'get_observability_matrix',
  'run_observer_model',
  'get_reported_collapse_metrics',
  'run_independent_collapse_model',
]);

export type ResearchDomainToolName = z.infer<typeof ResearchDomainToolNameSchema>;

export const ResearchDomainToolCallSchema = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('get_scenario'),
    input: z.object({ scenarioId: ScenarioIdSchema }),
  }),
  z.object({
    name: z.literal('compare_scenarios'),
    input: z.object({ scenarioIds: z.array(ScenarioIdSchema).min(2).max(3) }),
  }),
  z.object({
    name: z.literal('get_observability_matrix'),
    input: z.object({
      scenarioIds: z.array(ScenarioIdSchema).min(1).max(10).optional(),
      instrumentIds: z.array(ObservingMissionSchema).min(1).max(5).optional(),
    }),
  }),
  z.object({
    name: z.literal('run_observer_model'),
    input: z.object({ scenarioId: ScenarioIdSchema, instrumentId: ObservingMissionSchema }),
  }),
  z.object({
    name: z.literal('get_reported_collapse_metrics'),
    input: z.object({ scenarioId: ScenarioIdSchema }),
  }),
  z.object({
    name: z.literal('run_independent_collapse_model'),
    input: z.object({
      scenarioId: ScenarioIdSchema,
      preset: z.literal('validated_20000'),
    }),
  }),
]);

export type ResearchDomainToolCall = z.infer<typeof ResearchDomainToolCallSchema>;

export const ResearchDomainToolResultSchema = z.object({
  callId: z.string().regex(/^domain-tool-\d+$/),
  name: ResearchDomainToolNameSchema,
  input: z.record(z.string(), z.unknown()),
  status: z.enum(['ok', 'unavailable']),
  evidenceKind: z.enum(['reported', 'transcribed', 'reimplemented']),
  sourceRefs: z.array(SourceRefSchema),
  data: z.unknown(),
  limitation: z.string().min(1).optional(),
});

export type ResearchDomainToolResult = z.infer<typeof ResearchDomainToolResultSchema>;

export const ResearchToolTraceSchema = z.object({
  callId: z.string().min(1),
  name: z.enum([
    'search_corpus',
    'fetch_passages',
    'get_scenario',
    'compare_scenarios',
    'get_observability_matrix',
    'run_observer_model',
    'get_reported_collapse_metrics',
    'run_independent_collapse_model',
    'resolve_citations',
  ]),
  status: z.enum(['ok', 'unavailable']),
  resultHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
});

export type ResearchToolTrace = z.infer<typeof ResearchToolTraceSchema>;

const IndependentCollapseSchema = z.object({
  canonicalStatus: z.literal('noncanonical'),
  evidenceKind: z.literal('reimplemented'),
  status: z.string().min(1),
  ensembleSizes: z
    .object({
      paperComparableBatch: z.number().int().positive(),
      large: z.number().int().positive(),
    })
    .optional(),
  seeds: z
    .object({
      paperComparableBatch: z.number().int(),
      largeEnsembleRule: z.string().min(1),
      largeEnsembleByScenario: z.record(ScenarioIdSchema, z.number().int()),
    })
    .optional(),
  scenarios: z
    .array(
      z.object({
        scenarioId: ScenarioIdSchema,
        largeEnsemble: z.record(z.string(), z.number()),
        paperSeedBatch200: z.record(z.string(), z.number()),
        analyticEnsembleExpectation: z.record(z.string(), z.number()),
        comparisons: z.array(z.record(z.string(), z.unknown())),
        worstVerdict: z.string().min(1),
      }),
    )
    .optional(),
  limitations: z.array(z.string().min(1)).optional(),
});

const ResearchDomainDataSchema = z.object({
  earthAtmosphere: PublishedNumericTableSchema,
  venusAtmosphere: PublishedNumericTableSchema,
  collapse: CollapseModelDatasetSchema,
  observability: ObservabilityDatasetSchema,
  growth: ScenarioGrowthDatasetSchema,
  morphology: ScenarioMorphologyDatasetSchema,
  planetary: PlanetaryTechnosignatureDatasetSchema,
  system: SystemTechnosignatureDatasetSchema,
  independentCollapse: IndependentCollapseSchema,
});

export type ResearchDomainData = {
  earthAtmosphere: unknown;
  venusAtmosphere: unknown;
  collapse: unknown;
  observability: unknown;
  growth: unknown;
  morphology: unknown;
  planetary: unknown;
  system: unknown;
  independentCollapse: unknown;
};

export type ResearchDomainToolRuntime = {
  execute: (call: ResearchDomainToolCall, callIndex: number) => Promise<ResearchDomainToolResult>;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right, 'en'))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function hashResearchToolResult(value: unknown): string {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex')}`;
}

export function traceResearchToolResult(result: ResearchDomainToolResult): ResearchToolTrace {
  return ResearchToolTraceSchema.parse({
    callId: result.callId,
    name: result.name,
    status: result.status,
    resultHash: hashResearchToolResult(result),
  });
}

function flattenReferences(value: unknown): SourceRef[] {
  if (Array.isArray(value)) return value.flatMap(flattenReferences);
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  if (
    typeof record.sourceId === 'string' &&
    typeof record.sourceVersion === 'string' &&
    record.locator &&
    typeof record.locator === 'object'
  ) {
    return [record as SourceRef];
  }
  return Object.values(record).flatMap(flattenReferences);
}

function uniqueReferences(references: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  return references.filter((reference) => {
    const key = JSON.stringify(canonicalize(reference));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function independentSourceRef(source: SourceRef): SourceRef {
  return {
    ...source,
    evidenceKind: 'reimplemented',
    note: 'Independent Observatory reimplementation; not official author code.',
  };
}

export function createResearchDomainToolRuntime(
  input: ResearchDomainData,
): ResearchDomainToolRuntime {
  const data = ResearchDomainDataSchema.parse(input);

  return {
    async execute(rawCall, callIndex) {
      const call = ResearchDomainToolCallSchema.parse(rawCall);
      const callId = `domain-tool-${callIndex}`;
      let payload: unknown;
      let sourceRefs: SourceRef[] = [];
      let evidenceKind: EvidenceKind = 'reported';
      let status: 'ok' | 'unavailable' = 'ok';
      let limitation: string | undefined;

      switch (call.name) {
        case 'get_scenario': {
          const morphology = data.morphology.records.find(
            ({ scenarioId }) => scenarioId === call.input.scenarioId,
          );
          const growth = data.growth.records.find(
            ({ scenarioId }) => scenarioId === call.input.scenarioId,
          );
          if (!morphology || !growth) throw new Error(`Missing ${call.input.scenarioId}.`);
          const planetary = data.planetary.rows.map((row) => ({
            signatureId: row.signatureId,
            body: row.body,
            unit: row.unit,
            value: row.values[call.input.scenarioId],
          }));
          const system = data.system.rows
            .filter(({ presentIn }) => presentIn.includes(call.input.scenarioId))
            .map(({ signatureId, signatureLabel }) => ({ signatureId, signatureLabel }));
          payload = {
            scenarioId: call.input.scenarioId,
            morphology: {
              canonicalSummary: morphology.canonicalSummary,
              economy: morphology.economy,
              politics: morphology.politics,
              society: morphology.society,
              globalFactor: morphology.globalFactor,
              technologyCluster: morphology.technologyCluster,
            },
            growth: {
              population: growth.population,
              annualEnergyUseJ: growth.annualEnergyUseJ,
              growthState: growth.growthState,
              annualGrowthRate: growth.annualGrowthRate,
            },
            planetary,
            system,
          };
          sourceRefs = uniqueReferences([
            ...flattenReferences(morphology),
            ...flattenReferences(growth),
            ...data.planetary.rows.flatMap((row) =>
              flattenReferences(row.fieldProvenance.values[call.input.scenarioId]),
            ),
            ...data.system.rows.flatMap((row) =>
              flattenReferences(row.fieldProvenance.presentIn[call.input.scenarioId]),
            ),
          ]);
          evidenceKind = 'transcribed';
          break;
        }
        case 'compare_scenarios': {
          payload = call.input.scenarioIds.map((scenarioId) => {
            const morphology = data.morphology.records.find(
              (record) => record.scenarioId === scenarioId,
            );
            const growth = data.growth.records.find((record) => record.scenarioId === scenarioId);
            if (!morphology || !growth) throw new Error(`Missing ${scenarioId}.`);
            sourceRefs.push(...flattenReferences(morphology), ...flattenReferences(growth));
            return {
              scenarioId,
              population: growth.population,
              annualEnergyUseJ: growth.annualEnergyUseJ,
              growthState: growth.growthState,
              annualGrowthRate: growth.annualGrowthRate,
              globalFactor: morphology.globalFactor,
              technologyCluster: morphology.technologyCluster,
              canonicalSummary: morphology.canonicalSummary,
            };
          });
          sourceRefs = uniqueReferences(sourceRefs);
          evidenceKind = 'transcribed';
          break;
        }
        case 'get_observability_matrix': {
          const scenarioIds =
            call.input.scenarioIds ??
            data.observability.records.map(({ scenarioId }) => scenarioId);
          const instrumentIds =
            call.input.instrumentIds ?? data.observability.missions.map(({ id }) => id);
          payload = scenarioIds.flatMap((scenarioId) => {
            const record = data.observability.records.find(
              (candidate) => candidate.scenarioId === scenarioId,
            );
            if (!record) throw new Error(`Missing ${scenarioId}.`);
            return instrumentIds.map((instrumentId) => {
              const signatures = record.detections[instrumentId];
              sourceRefs.push(...record.detectionProvenance[instrumentId]);
              return {
                scenarioId,
                instrumentId,
                status: signatures.length > 0 ? 'reported_listed' : 'no_signature_listed',
                signatures,
              };
            });
          });
          sourceRefs = uniqueReferences(sourceRefs);
          break;
        }
        case 'run_observer_model': {
          const result = resolvePublishedObservation(
            data.observability,
            call.input.scenarioId,
            call.input.instrumentId,
          );
          payload = result;
          sourceRefs = uniqueReferences([
            ...result.sourceRefs,
            ...flattenReferences(result.assumptions),
          ]);
          break;
        }
        case 'get_reported_collapse_metrics': {
          const scenario = data.collapse.scenarios.find(
            ({ scenarioId }) => scenarioId === call.input.scenarioId,
          );
          if (!scenario) throw new Error(`Missing ${call.input.scenarioId}.`);
          payload = {
            scenarioId: scenario.scenarioId,
            simulation: data.collapse.simulation,
            parameters: scenario.parameters,
            reportedResults: scenario.reportedResults,
            resultCaptureStatus: scenario.resultCaptureStatus,
          };
          sourceRefs = uniqueReferences(flattenReferences(scenario.fieldProvenance));
          break;
        }
        case 'run_independent_collapse_model': {
          const scenario = data.independentCollapse.scenarios?.find(
            ({ scenarioId }) => scenarioId === call.input.scenarioId,
          );
          if (
            data.independentCollapse.status !== 'validated_experiment_report' ||
            data.independentCollapse.ensembleSizes?.large !== 20_000 ||
            !scenario
          ) {
            status = 'unavailable';
            payload = null;
            limitation =
              'No validated fixed-seed 20,000-run independent experiment preset is available.';
          } else {
            payload = {
              scenarioId: scenario.scenarioId,
              preset: call.input.preset,
              ensembleSize: data.independentCollapse.ensembleSizes.large,
              seed: data.independentCollapse.seeds?.largeEnsembleByScenario[scenario.scenarioId],
              largeEnsemble: scenario.largeEnsemble,
              analyticEnsembleExpectation: scenario.analyticEnsembleExpectation,
              comparisons: scenario.comparisons,
              verdict: scenario.worstVerdict,
              canonicalStatus: data.independentCollapse.canonicalStatus,
              evidenceKind: data.independentCollapse.evidenceKind,
            };
            limitation =
              'Returns the exact precomputed validated preset; arbitrary parameters are not accepted.';
          }
          sourceRefs = [independentSourceRef(data.collapse.source)];
          evidenceKind = 'reimplemented';
          break;
        }
      }

      return ResearchDomainToolResultSchema.parse({
        callId,
        name: call.name,
        input: call.input,
        status,
        evidenceKind,
        sourceRefs,
        data: payload,
        limitation,
      });
    },
  };
}

const scenarioPattern = /\bS(?:10|[1-9])\b/gi;

function mentionedScenarios(question: string) {
  return [...new Set(question.match(scenarioPattern)?.map((value) => value.toUpperCase()) ?? [])]
    .map((value) => ScenarioIdSchema.parse(value))
    .slice(0, 3);
}

function mentionedInstrument(question: string): z.infer<typeof ObservingMissionSchema> | undefined {
  if (/\bHWO\b|habitable worlds observatory|reflected light/i.test(question)) {
    return 'habitable_worlds_observatory';
  }
  if (/\bradio\b|narrowband/i.test(question)) return 'radio';
  if (/\bLIFE\b|infrared interferometer|mid[- ]infrared/i.test(question)) {
    return 'large_interferometer_for_exoplanets';
  }
  if (/\bSGL\b|solar gravitational lens/i.test(question)) return 'solar_gravitational_lens';
  if (/deep[- ]space probe|in situ|\bprobe\b/i.test(question)) return 'deep_space_probes';
  return undefined;
}

export function planResearchDomainToolCalls(question: string): ResearchDomainToolCall[] {
  const scenarios = mentionedScenarios(question);
  const instrument = mentionedInstrument(question);
  const calls: ResearchDomainToolCall[] = [];
  const asksObservation = /detect|observ|instrument|spectrum|signature|telescope|radio|probe/i.test(
    question,
  );
  const asksCollapse = /collapse|recovery|duty|hazard|resource stock/i.test(question);

  if (scenarios.length > 1) {
    calls.push({ name: 'compare_scenarios', input: { scenarioIds: scenarios } });
  } else if (scenarios[0] && !asksObservation && !asksCollapse) {
    calls.push({ name: 'get_scenario', input: { scenarioId: scenarios[0] } });
  }

  if (asksObservation) {
    if (scenarios.length === 1 && instrument) {
      calls.push({
        name: 'run_observer_model',
        input: { scenarioId: scenarios[0]!, instrumentId: instrument },
      });
    } else {
      calls.push({
        name: 'get_observability_matrix',
        input: {
          scenarioIds: scenarios.length > 0 ? scenarios : undefined,
          instrumentIds: instrument ? [instrument] : undefined,
        },
      });
    }
  }

  if (asksCollapse && scenarios.length > 0) {
    for (const scenarioId of scenarios) {
      calls.push({ name: 'get_reported_collapse_metrics', input: { scenarioId } });
      if (/independent|reimplement|replay|20[,.]?000/i.test(question)) {
        calls.push({
          name: 'run_independent_collapse_model',
          input: { scenarioId, preset: 'validated_20000' },
        });
      }
    }
  }

  return z.array(ResearchDomainToolCallSchema).max(6).parse(calls);
}
