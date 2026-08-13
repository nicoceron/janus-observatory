import {
  CollapseModelDatasetSchema,
  ObservabilityDatasetSchema,
  PlanetaryTechnosignatureDatasetSchema,
  PublishedNumericTableSchema,
  ScenarioGrowthDatasetSchema,
  ScenarioMorphologyDatasetSchema,
  SystemTechnosignatureDatasetSchema,
  resolvePublishedObservation,
  type ObservingMissionId,
  type ScenarioId,
} from '@janus/domain';

import earthAtmosphereJson from '../../../data/canonical/atmosphere/earth-apjl-table-1.json';
import collapseJson from '../../../data/canonical/collapse/model-and-reported-results.json';
import observabilityJson from '../../../data/canonical/observability/figure-6.json';
import growthJson from '../../../data/canonical/scenarios/growth-table-9.json';
import morphologyJson from '../../../data/canonical/scenarios/morphology-table-5.json';
import planetaryJson from '../../../data/canonical/technosignatures/planetary-table-6.json';
import systemJson from '../../../data/canonical/technosignatures/system-table-8.json';

export const earthAtmosphere = PublishedNumericTableSchema.parse(earthAtmosphereJson);
export const collapseDataset = CollapseModelDatasetSchema.parse(collapseJson);
export const observabilityDataset = ObservabilityDatasetSchema.parse(observabilityJson);
export const growthDataset = ScenarioGrowthDatasetSchema.parse(growthJson);
export const morphologyDataset = ScenarioMorphologyDatasetSchema.parse(morphologyJson);
export const planetaryDataset = PlanetaryTechnosignatureDatasetSchema.parse(planetaryJson);
export const systemDataset = SystemTechnosignatureDatasetSchema.parse(systemJson);

export const instrumentCopy: Record<
  ObservingMissionId,
  { short: string; label: string; mode: string }
> = {
  habitable_worlds_observatory: {
    short: 'HWO',
    label: 'Habitable Worlds Observatory',
    mode: 'Reflected light',
  },
  radio: { short: 'Radio', label: 'Radio array', mode: 'Narrowband emissions' },
  large_interferometer_for_exoplanets: {
    short: 'LIFE',
    label: 'Large Interferometer for Exoplanets',
    mode: 'Mid-infrared',
  },
  solar_gravitational_lens: {
    short: 'SGL',
    label: 'Solar Gravitational Lens',
    mode: 'Resolved surface imaging',
  },
  deep_space_probes: {
    short: 'Probe',
    label: 'Deep-space probe',
    mode: 'In situ observation',
  },
};

const scenarioAccents: Record<ScenarioId, string> = {
  S1: '#ff9a68',
  S2: '#e9b769',
  S3: '#f3d86b',
  S4: '#b8f15c',
  S5: '#5ce4a7',
  S6: '#55d5ce',
  S7: '#6fc2f0',
  S8: '#8eafff',
  S9: '#a997ff',
  S10: '#db93ee',
};

function requireRecord<RecordType extends { scenarioId: ScenarioId }>(
  records: RecordType[],
  scenarioId: ScenarioId,
  datasetName: string,
): RecordType {
  const record = records.find((candidate) => candidate.scenarioId === scenarioId);
  if (!record) throw new Error(`${datasetName} is missing ${scenarioId}.`);
  return record;
}

export function scientificNotation(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'scientific',
    maximumFractionDigits: 1,
  })
    .format(value)
    .replace('E', 'e');
}

export function getScenarioProfile(scenarioId: ScenarioId) {
  const morphology = requireRecord(morphologyDataset.records, scenarioId, 'Morphology Table 5');
  const growth = requireRecord(growthDataset.records, scenarioId, 'Growth Table 9');
  const collapse = requireRecord(collapseDataset.scenarios, scenarioId, 'Collapse Table 4');
  const atmosphere = Object.fromEntries(
    earthAtmosphere.rows.map((row) => [
      row.id,
      { label: row.label, unit: row.unit, value: row.values[scenarioId] },
    ]),
  );
  const planetary = planetaryDataset.rows.map((row) => ({
    signatureId: row.signatureId,
    signatureLabel: row.signatureLabel,
    body: row.body,
    unit: row.unit,
    value: row.values[scenarioId],
    annotations: row.annotations,
  }));
  const system = systemDataset.rows
    .filter((row) => row.presentIn.includes(scenarioId))
    .map((row) => ({ id: row.signatureId, label: row.signatureLabel }));
  const observations = observabilityDataset.missions.map((mission) => ({
    ...mission,
    ...instrumentCopy[mission.id],
    result: resolvePublishedObservation(observabilityJson, scenarioId, mission.id),
  }));

  return {
    id: scenarioId,
    accent: scenarioAccents[scenarioId],
    morphology,
    growth,
    collapse,
    atmosphere,
    planetary,
    system,
    observations,
  };
}

export type ScenarioProfile = ReturnType<typeof getScenarioProfile>;

export const allScenarioProfiles = morphologyDataset.records.map(({ scenarioId }) =>
  getScenarioProfile(scenarioId),
);

export const verticalSliceProfiles = (['S1', 'S4', 'S9'] as const).map(getScenarioProfile);
