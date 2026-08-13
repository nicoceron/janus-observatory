import { z } from 'zod';

import { SourceRefSchema } from './evidence';
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

export const ScenarioMorphologyDatasetSchema = CanonicalHeaderSchema.extend({
  records: z
    .array(
      z.object({
        scenarioId: ScenarioIdSchema,
        globalFactor: z.string().regex(/^GF[1-3]$/),
        technologyCluster: z.number().int().min(1).max(6),
        technologyFactors: z.array(z.string().regex(/^TF([1-9]|10|11)$/)).min(1),
        mythMetaphor: z.string().min(1),
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
    }),
  ),
});

export const ScenarioGrowthDatasetSchema = CanonicalHeaderSchema.extend({
  records: z
    .array(
      z.object({
        scenarioId: ScenarioIdSchema,
        population: z.number().positive(),
        annualEnergyUseJ: z.number().positive(),
        growthState: z.enum(['stable', 'oscillatory', 'growing']),
        annualGrowthRate: z.number().min(0).nullable(),
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
  records: z
    .array(
      z.object({
        scenarioId: ScenarioIdSchema,
        detections: z.record(ObservingMissionSchema, z.array(z.string().min(1))),
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
  parameterDefinitions: z.array(
    z.object({
      id: z.enum(['r', 'R0', 'delta', 'cf', 'rd', 'rf', 'h']),
      label: z.string().min(1),
      unit: z.string().min(1),
      definition: z.string().min(1),
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
      }),
    )
    .length(10),
});
