import { z } from 'zod';

import { sourced } from './evidence';

export const scenarioIds = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'] as const;
export const ScenarioIdSchema = z.enum(scenarioIds);

export const ScenarioSchema = z.object({
  id: ScenarioIdSchema,
  title: sourced(z.string().min(1)),
  summary: sourced(z.string().min(1)),
  growthClass: sourced(
    z.enum(['zero_growth', 'post_collapse', 'oscillatory', 'continuing_growth']),
  ),
  timeHorizonYears: sourced(z.number().int().positive()),
  tags: z.array(z.string().min(1)).default([]),
});

export type ScenarioId = z.infer<typeof ScenarioIdSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
