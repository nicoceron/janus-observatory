import { z } from 'zod';

import { sourced } from './evidence';
import { ScenarioIdSchema } from './scenario';

export const observationStatuses = [
  'detected',
  'not_detected',
  'ambiguous',
  'not_observable',
  'not_modeled',
] as const;

export const ObservationStatusSchema = z.enum(observationStatuses);

export const ObservationSchema = z.object({
  scenarioId: ScenarioIdSchema,
  instrumentId: z.string().min(1),
  targetId: z.string().min(1),
  status: sourced(ObservationStatusSchema),
  signalToNoise: sourced(z.number().nonnegative()).optional(),
  caveat: z.string().min(1).optional(),
});

export type Observation = z.infer<typeof ObservationSchema>;
