import { z } from 'zod';

import type { SourceRefSchema } from './evidence';
import { PublishedNumericTableSchema } from './published-table';
import { scenarioIds, type ScenarioId } from './scenario';
import {
  CollapseModelDatasetSchema,
  ObservabilityDatasetSchema,
  PlanetaryTechnosignatureDatasetSchema,
  ScenarioGrowthDatasetSchema,
  ScenarioMorphologyDatasetSchema,
  SystemTechnosignatureDatasetSchema,
  observingMissionIds,
} from './scientific-dataset';
import { matchingSourceManifestEntries, SourceManifestSchema } from './source-manifest';

export type CanonicalReleaseInput = {
  earthAtmosphere: unknown;
  venusAtmosphere: unknown;
  collapse: unknown;
  observability: unknown;
  growth: unknown;
  morphology: unknown;
  planetary: unknown;
  system: unknown;
  sourceManifest: unknown;
};

const Sha256DigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const ReviewCorrectionSchema = z
  .object({
    fieldPath: z.string().min(1),
    rationale: z.string().min(10),
  })
  .strict();

export const DatasetReviewApprovalSchema = z
  .object({
    datasetId: z.string().min(1),
    normalizedPayloadHash: Sha256DigestSchema,
    decision: z.literal('approved'),
    corrections: z.array(ReviewCorrectionSchema),
    changeRationale: z.string().min(20),
  })
  .strict();

export const ReconciliationReviewApprovalSchema = z
  .object({
    reconciliationId: z.string().min(1),
    reconciliationPayloadHash: Sha256DigestSchema,
    decision: z.literal('approved'),
    rationale: z.string().min(20),
  })
  .strict();

export const ReviewerRecordSchema = z
  .object({
    schemaVersion: z.literal('1.0.0'),
    dataVersion: Sha256DigestSchema,
    reviewer: z
      .object({
        name: z.string().min(2),
        organization: z.string().min(2).optional(),
        persistentIdentifier: z.string().min(3).optional(),
        reviewedAt: z.string().datetime({ offset: true }),
        independence: z.literal('independent'),
        independenceStatement: z.string().min(20),
        reviewRationale: z.string().min(20),
      })
      .strict(),
    datasetApprovals: z.array(DatasetReviewApprovalSchema).min(1),
    reconciliationApprovals: z.array(ReconciliationReviewApprovalSchema).min(1),
    attestationAlgorithm: z.literal('sha256-canonical-json-v1'),
    attestationHash: Sha256DigestSchema,
  })
  .strict()
  .superRefine(({ datasetApprovals, reconciliationApprovals }, context) => {
    for (const [path, ids] of [
      ['datasetApprovals', datasetApprovals.map(({ datasetId }) => datasetId)],
      [
        'reconciliationApprovals',
        reconciliationApprovals.map(({ reconciliationId }) => reconciliationId),
      ],
    ] as const) {
      ids.forEach((id, index) => {
        if (ids.indexOf(id) !== index) {
          context.addIssue({
            code: 'custom',
            message: `${id} must be approved exactly once.`,
            path: [path, index],
          });
        }
      });
    }
  });

export type ReviewerRecord = z.infer<typeof ReviewerRecordSchema>;

export type ReleaseFinding = {
  severity: 'warning' | 'error';
  code: string;
  message: string;
  datasets: string[];
  scenarioIds?: ScenarioId[];
};

export type CanonicalReleaseValidation = {
  valid: boolean;
  datasets: Array<{
    id: string;
    sourceId: string;
    sourceVersion: string;
    resolvedManifestId: string;
    locator: z.infer<typeof SourceRefSchema>['locator'];
  }>;
  findings: ReleaseFinding[];
  coverage: {
    scenarios: number;
    missions: number;
    atmosphereRows: number;
    planetaryRows: number;
    systemRows: number;
    provenancedFields: number;
  };
};

const requiredScenarioIds = new Set<string>(scenarioIds);

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right, 'en'));
}

function assertExactIds(
  label: string,
  ids: string[],
  expected: Set<string>,
  findings: ReleaseFinding[],
): void {
  const actual = new Set(ids);
  const missing = sorted([...expected].filter((id) => !actual.has(id)));
  const unexpected = sorted([...actual].filter((id) => !expected.has(id)));
  const duplicates = sorted(ids.filter((id, index) => ids.indexOf(id) !== index));

  if (missing.length || unexpected.length || duplicates.length) {
    findings.push({
      severity: 'error',
      code: 'CANONICAL_ID_COVERAGE',
      message: `${label} has missing [${missing.join(', ')}], unexpected [${unexpected.join(
        ', ',
      )}], or duplicate [${duplicates.join(', ')}] IDs.`,
      datasets: [label],
    });
  }
}

function expandScenarioColumnId(id: string): string[] {
  return id.split('_').flatMap((part) => {
    const range = /^S(\d+)-S(\d+)$/.exec(part);
    if (!range) return [part];
    const start = Number(range[1]);
    const end = Number(range[2]);
    return Array.from({ length: end - start + 1 }, (_, index) => `S${start + index}`);
  });
}

type FieldRef = z.infer<typeof SourceRefSchema> & { evidenceKind: string };

function validateFieldReferences(
  label: string,
  references: FieldRef[],
  expected: { sourceId: string; sourceVersion: string },
  findings: ReleaseFinding[],
): number {
  for (const reference of references) {
    if (
      reference.sourceId !== expected.sourceId ||
      reference.sourceVersion !== expected.sourceVersion
    ) {
      findings.push({
        severity: 'error',
        code: 'FIELD_SOURCE_MISMATCH',
        message: `${label} points to ${reference.sourceId}@${reference.sourceVersion} instead of ${expected.sourceId}@${expected.sourceVersion}.`,
        datasets: [label],
      });
    }
    if (!reference.locator.row || !reference.locator.column) {
      findings.push({
        severity: 'error',
        code: 'FIELD_LOCATOR_NOT_EXACT',
        message: `${label} must identify an exact source row and column.`,
        datasets: [label],
      });
    }
  }
  return references.length > 0 ? 1 : 0;
}

export function validateCanonicalRelease(input: CanonicalReleaseInput): CanonicalReleaseValidation {
  const earthAtmosphere = PublishedNumericTableSchema.parse(input.earthAtmosphere);
  const venusAtmosphere = PublishedNumericTableSchema.parse(input.venusAtmosphere);
  const collapse = CollapseModelDatasetSchema.parse(input.collapse);
  const observability = ObservabilityDatasetSchema.parse(input.observability);
  const growth = ScenarioGrowthDatasetSchema.parse(input.growth);
  const morphology = ScenarioMorphologyDatasetSchema.parse(input.morphology);
  const planetary = PlanetaryTechnosignatureDatasetSchema.parse(input.planetary);
  const system = SystemTechnosignatureDatasetSchema.parse(input.system);
  const sourceManifest = SourceManifestSchema.parse(input.sourceManifest);
  const findings: ReleaseFinding[] = [];
  let provenancedFields = 0;

  for (const table of [earthAtmosphere, venusAtmosphere]) {
    for (const column of table.columns) {
      for (const [field, references] of Object.entries(column.fieldProvenance)) {
        provenancedFields += validateFieldReferences(
          `${table.id}.column.${column.id}.${field}`,
          references,
          table.source,
          findings,
        );
      }
    }
    for (const row of table.rows) {
      for (const field of ['id', 'label', 'unit'] as const) {
        provenancedFields += validateFieldReferences(
          `${table.id}.${row.id}.${field}`,
          row.fieldProvenance[field],
          table.source,
          findings,
        );
      }
      for (const [column, references] of Object.entries(row.fieldProvenance.values)) {
        provenancedFields += validateFieldReferences(
          `${table.id}.${row.id}.${column}`,
          references,
          table.source,
          findings,
        );
      }
    }
  }

  for (const record of morphology.records) {
    for (const [field, references] of Object.entries(record.fieldProvenance)) {
      provenancedFields += validateFieldReferences(
        `${morphology.id}.${record.scenarioId}.${field}`,
        references,
        morphology.source,
        findings,
      );
    }
    for (const field of [
      'canonicalSummary',
      'economy',
      'politics',
      'society',
      'technosphere',
      'biosphere',
      'spatialDistribution',
      'development',
      'connectivity',
      'smallestScale',
    ] as const) {
      provenancedFields += validateFieldReferences(
        `${morphology.id}.${record.scenarioId}.${field}`,
        record[field].sourceRefs,
        morphology.source,
        findings,
      );
    }
  }
  for (const record of growth.records) {
    for (const [field, references] of Object.entries(record.fieldProvenance)) {
      provenancedFields += validateFieldReferences(
        `${growth.id}.${record.scenarioId}.${field}`,
        references,
        growth.source,
        findings,
      );
    }
  }
  for (const record of observability.records) {
    provenancedFields += validateFieldReferences(
      `${observability.id}.${record.scenarioId}.scenarioId`,
      record.scenarioProvenance,
      observability.source,
      findings,
    );
    for (const missionId of observingMissionIds) {
      provenancedFields += validateFieldReferences(
        `${observability.id}.${record.scenarioId}.${missionId}`,
        record.detectionProvenance[missionId],
        observability.source,
        findings,
      );
    }
  }
  for (const missionId of observingMissionIds) {
    for (const [field, references] of Object.entries(observability.missionProvenance[missionId])) {
      provenancedFields += validateFieldReferences(
        `${observability.id}.${missionId}.${field}`,
        references,
        observability.source,
        findings,
      );
    }
    for (const [field, assumption] of Object.entries(observability.missionAssumptions[missionId])) {
      provenancedFields += validateFieldReferences(
        `${observability.id}.${missionId}.${field}`,
        assumption.sourceRefs,
        observability.source,
        findings,
      );
    }
  }
  for (const row of planetary.rows) {
    for (const field of ['signatureId', 'signatureLabel', 'body', 'unit', 'annotations'] as const) {
      provenancedFields += validateFieldReferences(
        `${planetary.id}.${row.signatureId}.${row.body}.${field}`,
        row.fieldProvenance[field],
        planetary.source,
        findings,
      );
    }
    for (const [scenarioId, references] of Object.entries(row.fieldProvenance.values)) {
      provenancedFields += validateFieldReferences(
        `${planetary.id}.${row.signatureId}.${row.body}.${scenarioId}`,
        references,
        planetary.source,
        findings,
      );
    }
  }
  for (const row of system.rows) {
    for (const field of ['signatureId', 'signatureLabel'] as const) {
      provenancedFields += validateFieldReferences(
        `${system.id}.${row.signatureId}.${field}`,
        row.fieldProvenance[field],
        system.source,
        findings,
      );
    }
    for (const [scenarioId, references] of Object.entries(row.fieldProvenance.presentIn)) {
      provenancedFields += validateFieldReferences(
        `${system.id}.${row.signatureId}.${scenarioId}`,
        references,
        system.source,
        findings,
      );
    }
  }
  for (const [field, references] of Object.entries(collapse.simulationProvenance)) {
    provenancedFields += validateFieldReferences(
      `${collapse.id}.simulation.${field}`,
      references,
      collapse.source,
      findings,
    );
  }
  for (const definition of collapse.parameterDefinitions) {
    for (const [field, references] of Object.entries(definition.fieldProvenance)) {
      provenancedFields += validateFieldReferences(
        `${collapse.id}.parameterDefinitions.${definition.id}.${field}`,
        references,
        collapse.source,
        findings,
      );
    }
  }
  for (const scenario of collapse.scenarios) {
    provenancedFields += validateFieldReferences(
      `${collapse.id}.${scenario.scenarioId}.scenarioId`,
      scenario.fieldProvenance.scenarioId,
      collapse.source,
      findings,
    );
    for (const [field, references] of Object.entries(scenario.fieldProvenance.parameters)) {
      provenancedFields += validateFieldReferences(
        `${collapse.id}.${scenario.scenarioId}.parameters.${field}`,
        references,
        collapse.source,
        findings,
      );
    }
    for (const [field, references] of Object.entries(scenario.fieldProvenance.reportedResults)) {
      provenancedFields += validateFieldReferences(
        `${collapse.id}.${scenario.scenarioId}.reportedResults.${field}`,
        references,
        collapse.source,
        findings,
      );
    }
  }

  assertExactIds(
    morphology.id,
    morphology.records.map(({ scenarioId }) => scenarioId),
    requiredScenarioIds,
    findings,
  );
  assertExactIds(
    growth.id,
    growth.records.map(({ scenarioId }) => scenarioId),
    requiredScenarioIds,
    findings,
  );
  assertExactIds(
    collapse.id,
    collapse.scenarios.map(({ scenarioId }) => scenarioId),
    requiredScenarioIds,
    findings,
  );
  assertExactIds(
    observability.id,
    observability.records.map(({ scenarioId }) => scenarioId),
    requiredScenarioIds,
    findings,
  );
  assertExactIds(system.id, system.scenarios, requiredScenarioIds, findings);
  assertExactIds(planetary.id, planetary.scenarios, requiredScenarioIds, findings);
  assertExactIds(
    observability.id,
    observability.missions.map(({ id }) => id),
    new Set(observingMissionIds),
    findings,
  );

  const headers = [
    earthAtmosphere,
    venusAtmosphere,
    collapse,
    observability,
    growth,
    morphology,
    planetary,
    system,
  ];
  const resolvedDatasets = headers.map((dataset) => {
    const matches = matchingSourceManifestEntries(
      sourceManifest,
      dataset.source.sourceId,
      dataset.source.sourceVersion,
    );
    if (matches.length !== 1) {
      findings.push({
        severity: 'error',
        code: 'SOURCE_REF_UNRESOLVED',
        message: `${dataset.id} source ${dataset.source.sourceId}@${dataset.source.sourceVersion} resolved to ${matches.length} source-manifest entries.`,
        datasets: [dataset.id],
      });
    } else if (matches[0].rightsStatus !== 'verified_open') {
      findings.push({
        severity: 'error',
        code: 'CANONICAL_SOURCE_RIGHTS',
        message: `${dataset.id} resolves to ${matches[0].id}, which is not verified open.`,
        datasets: [dataset.id],
      });
    }
    return {
      id: dataset.id,
      sourceId: dataset.source.sourceId,
      sourceVersion: dataset.source.sourceVersion,
      resolvedManifestId: matches[0]?.id ?? 'unresolved',
      locator: dataset.source.locator,
    };
  });

  const growthByScenario = new Map(growth.records.map((record) => [record.scenarioId, record]));
  const growthRateDiscrepancies = collapse.scenarios
    .filter(({ scenarioId, parameters }) => {
      const tableNineRate = growthByScenario.get(scenarioId)?.annualGrowthRate;
      return (
        tableNineRate !== null && tableNineRate !== undefined && tableNineRate !== parameters.r
      );
    })
    .map(({ scenarioId }) => scenarioId);
  if (growthRateDiscrepancies.length > 0) {
    findings.push({
      severity: 'warning',
      code: 'PUBLISHED_GROWTH_RATE_DISCREPANCY',
      message:
        'The collapse paper Table 4 growth-rate parameter differs from the foundational paper Table 9 annual growth rate for the listed scenarios. Both published values remain separate; neither is silently reconciled.',
      datasets: [growth.id, collapse.id],
      scenarioIds: growthRateDiscrepancies,
    });
  }

  const earthColumns = earthAtmosphere.columns
    .filter(({ kind }) => kind === 'scenario')
    .map(({ id }) => id);
  assertExactIds(earthAtmosphere.id, earthColumns, requiredScenarioIds, findings);
  const venusColumns = venusAtmosphere.columns
    .filter(({ kind }) => kind === 'scenario')
    .flatMap(({ id }) => expandScenarioColumnId(id));
  assertExactIds(venusAtmosphere.id, venusColumns, requiredScenarioIds, findings);

  return {
    valid: findings.every(({ severity }) => severity !== 'error'),
    datasets: resolvedDatasets,
    findings,
    coverage: {
      scenarios: scenarioIds.length,
      missions: observingMissionIds.length,
      atmosphereRows: earthAtmosphere.rows.length + venusAtmosphere.rows.length,
      planetaryRows: planetary.rows.length,
      systemRows: system.rows.length,
      provenancedFields,
    },
  };
}
