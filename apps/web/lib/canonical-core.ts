import type { SourceRef, Sourced } from '@janus/domain/evidence';
import { resolvePublishedObservation } from '@janus/domain/observatory-engine';
import { PublishedNumericTableSchema } from '@janus/domain/published-table';
import type { ScenarioId } from '@janus/domain/scenario';
import {
  CollapseModelDatasetSchema,
  ObservabilityDatasetSchema,
  type ObservingMissionId,
  PlanetaryTechnosignatureDatasetSchema,
  ScenarioGrowthDatasetSchema,
  ScenarioMorphologyDatasetSchema,
  SystemTechnosignatureDatasetSchema,
} from '@janus/domain/scientific-dataset';

import collapseJson from '../../../data/generated/runtime/collapse.json';
import earthAtmosphereJson from '../../../data/generated/runtime/earth-atmosphere.json';
import growthJson from '../../../data/generated/runtime/growth.json';
import morphologyJson from '../../../data/generated/runtime/morphology.json';
import observabilityJson from '../../../data/generated/runtime/observability.json';
import planetaryJson from '../../../data/generated/runtime/planetary.json';
import systemJson from '../../../data/generated/runtime/system.json';

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
): RecordType {
  const record = records.find((candidate) => candidate.scenarioId === scenarioId);
  if (!record) throw new Error(`Canonical record missing for ${scenarioId}.`);
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

const sourceDocuments: Record<string, string> = {
  'JANUS-PAPER-01': 'https://arxiv.org/pdf/2409.00067v3',
  'JANUS-PAPER-03': 'https://arxiv.org/pdf/2511.20329v2',
  'JANUS-PAPER-05': 'https://arxiv.org/pdf/2604.13774v1',
};

export function sourceRefHref(sourceRef: SourceRef): string {
  const base = sourceDocuments[sourceRef.sourceId] ?? sourceRef.locator.url ?? '/sources';
  return sourceRef.locator.page ? `${base}#page=${sourceRef.locator.page}` : base;
}

export function sourceRefLabel(sourceRef: SourceRef): string {
  const locator = sourceRef.locator;
  return [
    locator.table ?? locator.figure ?? locator.section,
    locator.row ? `row ${locator.row}` : undefined,
    locator.column ? `column ${locator.column}` : undefined,
    locator.page ? `page ${locator.page}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function sourcedDisplay(field: Sourced<unknown>): string {
  if (field.captureStatus !== 'captured') {
    return field.captureStatus.replaceAll('_', ' ');
  }
  if (Array.isArray(field.value)) return field.value.join(' / ');
  return String(field.display ?? field.value);
}

export function getScenarioProfile(scenarioId: ScenarioId) {
  const morphology = requireRecord(morphologyDataset.records, scenarioId);
  const growth = requireRecord(growthDataset.records, scenarioId);
  const collapse = requireRecord(collapseDataset.scenarios, scenarioId);
  const atmosphere = Object.fromEntries(
    earthAtmosphere.rows.map((row) => [
      row.id,
      {
        label: row.label,
        unit: row.unit,
        value: row.values[scenarioId],
        sourceRefs: row.fieldProvenance.values[scenarioId],
      },
    ]),
  );
  const planetary = planetaryDataset.rows.map((row) => ({
    signatureId: row.signatureId,
    signatureLabel: row.signatureLabel,
    body: row.body,
    unit: row.unit,
    value: row.values[scenarioId],
    annotations: row.annotations,
    sourceRefs: row.fieldProvenance.values[scenarioId],
  }));
  const system = systemDataset.rows
    .filter((row) => row.presentIn.includes(scenarioId))
    .map((row) => ({
      id: row.signatureId,
      label: row.signatureLabel,
      sourceRefs: row.fieldProvenance.presentIn[scenarioId],
    }));
  const systemCellProvenance = systemDataset.rows.flatMap(
    (row) => row.fieldProvenance.presentIn[scenarioId],
  );
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
    systemCellProvenance,
    observations,
  };
}

export type ScenarioProfile = ReturnType<typeof getScenarioProfile>;

export const allScenarioProfiles = morphologyDataset.records.map(({ scenarioId }) =>
  getScenarioProfile(scenarioId),
);

export const verticalSliceProfiles = (['S1', 'S4', 'S9'] as const).map(getScenarioProfile);
