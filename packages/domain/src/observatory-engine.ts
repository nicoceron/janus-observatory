import type { SourceRef, Sourced } from './evidence';
import type { ScenarioId } from './scenario';
import { ObservabilityDatasetSchema, type ObservingMissionId } from './scientific-dataset';

export type PublishedObservationResult = {
  scenarioId: ScenarioId;
  instrumentId: ObservingMissionId;
  status: 'reported_listed' | 'no_signature_listed';
  signatures: string[];
  caveat: string;
  sourceRefs: SourceRef[];
  assumptions: {
    distance: Sourced<string>;
    integrationTime: Sourced<string>;
    host: Sourced<string>;
    concept: Sourced<string>;
  };
};

export function resolvePublishedObservation(
  input: unknown,
  scenarioId: ScenarioId,
  instrumentId: ObservingMissionId,
): PublishedObservationResult {
  return createPublishedObservationResolver(input)(scenarioId, instrumentId);
}

/** Validate an immutable input snapshot once, then resolve many canonical cells. */
export function createPublishedObservationResolver(input: unknown) {
  const dataset = ObservabilityDatasetSchema.parse(input);
  return (scenarioId: ScenarioId, instrumentId: ObservingMissionId): PublishedObservationResult => {
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
      sourceRefs: record.detectionProvenance[instrumentId],
      assumptions: dataset.missionAssumptions[instrumentId],
    };
  };
}
