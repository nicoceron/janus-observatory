import type { ScenarioId } from './scenario';
import { ObservabilityDatasetSchema, type ObservingMissionId } from './scientific-dataset';

export type PublishedObservationResult = {
  scenarioId: ScenarioId;
  instrumentId: ObservingMissionId;
  status: 'reported_listed' | 'no_signature_listed';
  signatures: string[];
  caveat: string;
  source: {
    sourceId: string;
    sourceVersion: string;
    locator: { page?: number; figure?: string; table?: string; section?: string };
  };
};

export function resolvePublishedObservation(
  input: unknown,
  scenarioId: ScenarioId,
  instrumentId: ObservingMissionId,
): PublishedObservationResult {
  const dataset = ObservabilityDatasetSchema.parse(input);
  const record = dataset.records.find((candidate) => candidate.scenarioId === scenarioId);

  if (!record) {
    throw new Error(`Published observability data is missing for ${scenarioId}.`);
  }

  const signatures = record.detections[instrumentId];
  return {
    scenarioId,
    instrumentId,
    status: signatures.length > 0 ? 'reported_listed' : 'no_signature_listed',
    signatures,
    caveat:
      signatures.length > 0
        ? "Figure 6 lists these signatures for this mission concept under the paper's assumptions."
        : 'A blank Figure 6 cell is not evidence of no technology; it means the figure lists no signature for this mission concept.',
    source: dataset.source,
  };
}
