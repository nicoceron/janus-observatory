import { allScenarioProfiles } from './canonical-core';

/** Scenario names keyed by story chapter id, for the Chapters list. Server-side only. */
export const chapterTitles: Record<string, string> = Object.fromEntries(
  allScenarioProfiles.map((profile) => [profile.id.toLowerCase(), profile.morphology.mythMetaphor]),
);
