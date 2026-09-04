import { describe, expect, it } from 'vitest';

import venusAtmosphere from '../../../data/canonical/atmosphere/venus-apjl-table-2.json';
import collapseModel from '../../../data/canonical/collapse/model-and-reported-results.json';
import observability from '../../../data/canonical/observability/figure-6.json';
import growth from '../../../data/canonical/scenarios/growth-table-9.json';
import morphology from '../../../data/canonical/scenarios/morphology-table-5.json';
import planetary from '../../../data/canonical/technosignatures/planetary-table-6.json';
import system from '../../../data/canonical/technosignatures/system-table-8.json';
import { PublishedNumericTableSchema } from './published-table';
import {
  CollapseModelDatasetSchema,
  ObservabilityDatasetSchema,
  PlanetaryTechnosignatureDatasetSchema,
  ScenarioGrowthDatasetSchema,
  ScenarioMorphologyDatasetSchema,
  SystemTechnosignatureDatasetSchema,
} from './scientific-dataset';

describe('canonical scientific datasets', () => {
  it('validates the scenario morphology and growth tables', () => {
    const parsedMorphology = ScenarioMorphologyDatasetSchema.parse(morphology);
    const parsedGrowth = ScenarioGrowthDatasetSchema.parse(growth);

    expect(parsedMorphology.records.find(({ scenarioId }) => scenarioId === 'S9')).toMatchObject({
      technologyCluster: 2,
      technologyFactors: ['TF8', 'TF11'],
    });
    expect(parsedGrowth.records.find(({ scenarioId }) => scenarioId === 'S9')).toMatchObject({
      annualEnergyUseJ: 1e25,
      annualGrowthRate: 0.0098,
    });
  });

  it('validates planetary and system technosignatures', () => {
    const parsedPlanetary = PlanetaryTechnosignatureDatasetSchema.parse(planetary);
    const parsedSystem = SystemTechnosignatureDatasetSchema.parse(system);

    expect(
      parsedPlanetary.rows.find(
        ({ signatureId, body }) => signatureId === 'surface_modification' && body === 'Mars',
      )?.values.S9,
    ).toBe(1);
    expect(
      parsedSystem.rows.find(({ signatureId }) => signatureId === 'dyson_sphere')?.presentIn,
    ).toEqual(['S9']);
  });

  it('validates the Venus atmosphere and mission detectability tables', () => {
    const parsedVenus = PublishedNumericTableSchema.parse(venusAtmosphere);
    const parsedObservability = ObservabilityDatasetSchema.parse(observability);

    expect(parsedVenus.rows.find(({ id }) => id === 'na_emission')?.values.S6).toBe(0.001);
    expect(
      parsedObservability.records.find(({ scenarioId }) => scenarioId === 'S9')?.detections
        .habitable_worlds_observatory,
    ).toEqual([]);
  });

  it('validates collapse model parameters without inventing figure-only results', () => {
    const parsed = CollapseModelDatasetSchema.parse(collapseModel);
    const s4 = parsed.scenarios.find(({ scenarioId }) => scenarioId === 'S4');
    const s2 = parsed.scenarios.find(({ scenarioId }) => scenarioId === 'S2');

    expect(s4?.reportedResults.meanDutyCycle).toBe(0.381);
    expect(s2?.reportedResults.meanDutyCycle).toBeNull();
    expect(parsed.simulation.monteCarloRunsPerScenario).toBe(200);
  });

  it('rejects a collapse null that is mislabeled as captured', () => {
    const broken = structuredClone(collapseModel);
    broken.scenarios[1]!.resultCaptureStatus.meanDutyCycle = 'captured';

    expect(CollapseModelDatasetSchema.safeParse(broken).success).toBe(false);
  });
});
