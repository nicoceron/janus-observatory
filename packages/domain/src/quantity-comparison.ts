import type { z } from 'zod';
import type { ScenarioGrowthDatasetSchema } from './scientific-dataset';

type ReferenceEarth = z.infer<typeof ScenarioGrowthDatasetSchema>['referenceEarth'];
export type QuantityDimension = 'population' | 'energy';

/** A fixed paper/model reference, never a measurement of current Earth consumption. */
export function compareWithReferenceEarth(
  value: number,
  dimension: QuantityDimension,
  reference: ReferenceEarth,
) {
  const { population, annualEnergyPerPersonGJ } = reference;
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Invalid quantity.');
  if (population.captureStatus !== 'captured') return null;
  if (dimension === 'energy' && annualEnergyPerPersonGJ.captureStatus !== 'captured') return null;
  const referenceValue =
    dimension === 'population'
      ? population.value
      : population.value * annualEnergyPerPersonGJ.value! * 1e9;
  if (!Number.isFinite(referenceValue) || referenceValue <= 0) {
    throw new RangeError('Reference quantity must be finite and positive.');
  }
  return {
    ratio: value / referenceValue,
    referenceValue,
    evidenceKind: 'derived' as const,
    sourceRefs:
      dimension === 'population'
        ? population.sourceRefs
        : [...population.sourceRefs, ...annualEnergyPerPersonGJ.sourceRefs],
  };
}
