import { z } from 'zod';

import { FieldSourceRefSchema, SourceRefSchema, sourced } from './evidence';
import { ScenarioIdSchema } from './scenario';

const CanonicalHeaderSchema = z.object({
  schemaVersion: z.string().min(1),
  id: z.string().min(1),
  title: z.string().min(1),
  contentOrigin: z.literal('transcribed'),
  evidenceKind: z.literal('reported'),
  source: SourceRefSchema,
  sourceLicense: z.string().min(1),
  transcriptionMethod: z.string().min(1),
  assumptions: z.array(z.string().min(1)).default([]),
  notes: z.array(z.string().min(1)).default([]),
});

const exactFieldRefs = z.array(FieldSourceRefSchema).min(1);

export const ScenarioMorphologyDatasetSchema = CanonicalHeaderSchema.extend({
  records: z
    .array(
      z.object({
        scenarioId: ScenarioIdSchema,
        globalFactor: z.string().regex(/^GF[1-3]$/),
        technologyCluster: z.number().int().min(1).max(6),
        technologyFactors: z.array(z.string().regex(/^TF([1-9]|10|11)$/)).min(1),
        mythMetaphor: z.string().min(1),
        fieldProvenance: z.object({
          scenarioId: z.array(FieldSourceRefSchema).min(1),
          globalFactor: z.array(FieldSourceRefSchema).min(1),
          technologyCluster: z.array(FieldSourceRefSchema).min(1),
          technologyFactors: z.array(FieldSourceRefSchema).min(1),
          mythMetaphor: z.array(FieldSourceRefSchema).min(1),
        }),
        canonicalSummary: sourced(z.string().min(1)),
        economy: sourced(z.string().min(1)),
        politics: sourced(z.string().min(1)),
        society: sourced(z.string().min(1)),
        technosphere: sourced(z.array(z.string().min(1)).min(1)),
        biosphere: sourced(z.string().min(1)),
        spatialDistribution: sourced(z.array(z.string().min(1)).min(1)),
        development: sourced(z.array(z.string().min(1)).min(1)),
        connectivity: sourced(z.array(z.string().min(1)).min(1)),
        smallestScale: sourced(z.array(z.string().min(1)).min(1)),
      }),
    )
    .length(10),
});

export const PlanetaryTechnosignatureDatasetSchema = CanonicalHeaderSchema.extend({
  nullSemantics: z.string().min(1),
  scenarios: z.array(ScenarioIdSchema).length(10),
  rows: z.array(
    z.object({
      signatureId: z.string().min(1),
      signatureLabel: z.string().min(1),
      body: z.enum(['Earth', 'Moon', 'Mars', 'Venus']),
      unit: z.string().min(1),
      values: z.record(ScenarioIdSchema, z.number().finite().nullable()),
      annotations: z.array(z.string().min(1)).default([]),
      fieldProvenance: z.object({
        signatureId: exactFieldRefs,
        signatureLabel: exactFieldRefs,
        body: exactFieldRefs,
        unit: exactFieldRefs,
        values: z.record(ScenarioIdSchema, exactFieldRefs),
        annotations: exactFieldRefs,
      }),
    }),
  ),
});

export const SystemTechnosignatureDatasetSchema = CanonicalHeaderSchema.extend({
  scenarios: z.array(ScenarioIdSchema).length(10),
  rows: z.array(
    z.object({
      signatureId: z.string().min(1),
      signatureLabel: z.string().min(1),
      presentIn: z.array(ScenarioIdSchema),
      fieldProvenance: z.object({
        signatureId: exactFieldRefs,
        signatureLabel: exactFieldRefs,
        presentIn: z.record(ScenarioIdSchema, exactFieldRefs),
      }),
    }),
  ),
});

export const ScenarioGrowthDatasetSchema = CanonicalHeaderSchema.extend({
  referenceEarth: z.object({
    population: sourced(z.number().positive().finite()),
    annualEnergyPerPersonGJ: sourced(z.number().positive().finite()),
  }),
  records: z
    .array(
      z.object({
        scenarioId: ScenarioIdSchema,
        population: z.number().positive(),
        annualEnergyUseJ: z.number().positive(),
        growthState: z.enum(['stable', 'oscillatory', 'growing']),
        annualGrowthRate: z.number().min(0).nullable(),
        fieldProvenance: z.object({
          scenarioId: z.array(FieldSourceRefSchema).min(1),
          population: z.array(FieldSourceRefSchema).min(1),
          annualEnergyUseJ: z.array(FieldSourceRefSchema).min(1),
          growthState: z.array(FieldSourceRefSchema).min(1),
          annualGrowthRate: z.array(FieldSourceRefSchema).min(1),
        }),
      }),
    )
    .length(10),
});

export const observingMissionIds = [
  'habitable_worlds_observatory',
  'radio',
  'large_interferometer_for_exoplanets',
  'solar_gravitational_lens',
  'deep_space_probes',
] as const;

export const ObservingMissionSchema = z.enum(observingMissionIds);
export type ObservingMissionId = z.infer<typeof ObservingMissionSchema>;

export const ObservabilityDatasetSchema = CanonicalHeaderSchema.extend({
  missions: z.array(z.object({ id: ObservingMissionSchema, label: z.string().min(1) })),
  missionProvenance: z.record(
    ObservingMissionSchema,
    z.object({ id: exactFieldRefs, label: exactFieldRefs }),
  ),
  missionAssumptions: z.record(
    ObservingMissionSchema,
    z.object({
      distance: sourced(z.string().min(1)),
      integrationTime: sourced(z.string().min(1)),
      host: sourced(z.string().min(1)),
      concept: sourced(z.string().min(1)),
    }),
  ),
  records: z
    .array(
      z.object({
        scenarioId: ScenarioIdSchema,
        scenarioProvenance: exactFieldRefs,
        detections: z.record(ObservingMissionSchema, z.array(z.string().min(1))),
        detectionProvenance: z.record(ObservingMissionSchema, z.array(FieldSourceRefSchema).min(1)),
      }),
    )
    .length(10),
});

export const CollapseModelDatasetSchema = CanonicalHeaderSchema.extend({
  simulation: z.object({
    windowYears: z.number().int().positive(),
    timeStepYears: z.number().positive(),
    monteCarloRunsPerScenario: z.number().int().positive(),
  }),
  simulationProvenance: z.object({
    windowYears: exactFieldRefs,
    timeStepYears: exactFieldRefs,
    monteCarloRunsPerScenario: exactFieldRefs,
  }),
  parameterDefinitions: z.array(
    z.object({
      id: z.enum(['r', 'R0', 'delta', 'cf', 'rd', 'rf', 'h']),
      label: z.string().min(1),
      unit: z.string().min(1),
      definition: z.string().min(1),
      fieldProvenance: z.object({
        id: exactFieldRefs,
        label: exactFieldRefs,
        unit: exactFieldRefs,
        definition: exactFieldRefs,
      }),
    }),
  ),
  scenarios: z
    .array(
      z.object({
        scenarioId: ScenarioIdSchema,
        parameters: z.object({
          r: z.number().nonnegative(),
          R0: z.number().nonnegative(),
          delta: z.number().nonnegative(),
          cf: z.number().min(0).max(1),
          rd: z.number().nonnegative(),
          rf: z.number().min(0).max(1),
          h: z.number().nonnegative(),
        }),
        reportedResults: z.object({
          fractionNeverCollapsed: z.number().min(0).max(1).nullable(),
          meanDutyCycle: z.number().min(0).max(1).nullable(),
          meanTimeToFirstCollapseYears: z.number().nonnegative().nullable(),
          meanCollapseCount: z.number().nonnegative().nullable(),
          precision: z.enum(['exact_text', 'approximate_text', 'figure_only']),
          summary: z.string().min(1),
        }),
        fieldProvenance: z.object({
          scenarioId: exactFieldRefs,
          parameters: z.object({
            r: exactFieldRefs,
            R0: exactFieldRefs,
            delta: exactFieldRefs,
            cf: exactFieldRefs,
            rd: exactFieldRefs,
            rf: exactFieldRefs,
            h: exactFieldRefs,
          }),
          reportedResults: z.object({
            fractionNeverCollapsed: exactFieldRefs,
            meanDutyCycle: exactFieldRefs,
            meanTimeToFirstCollapseYears: exactFieldRefs,
            meanCollapseCount: exactFieldRefs,
            precision: exactFieldRefs,
            summary: exactFieldRefs,
          }),
        }),
        resultCaptureStatus: z.object({
          fractionNeverCollapsed: z.enum(['captured', 'not_transcribed']),
          meanDutyCycle: z.enum(['captured', 'not_transcribed']),
          meanTimeToFirstCollapseYears: z.enum(['captured', 'not_transcribed']),
          meanCollapseCount: z.enum(['captured', 'not_transcribed']),
          precision: z.literal('captured'),
          summary: z.literal('captured'),
        }),
      }),
    )
    .length(10),
}).superRefine((dataset, context) => {
  for (const [scenarioIndex, scenario] of dataset.scenarios.entries()) {
    const resultFields = [
      'fractionNeverCollapsed',
      'meanDutyCycle',
      'meanTimeToFirstCollapseYears',
      'meanCollapseCount',
    ] as const;
    for (const field of resultFields) {
      const isNull = scenario.reportedResults[field] === null;
      const isNotTranscribed = scenario.resultCaptureStatus[field] === 'not_transcribed';
      if (isNull !== isNotTranscribed) {
        context.addIssue({
          code: 'custom',
          message:
            'Collapse null values must be not_transcribed and captured values must be non-null.',
          path: ['scenarios', scenarioIndex, 'resultCaptureStatus', field],
        });
      }
    }
  }
});
