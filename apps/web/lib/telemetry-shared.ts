export const publicTelemetryEvents = [
  'chapter_complete',
  'instrument_select',
  'comparison_update',
  'fallback_mode',
  'source_link',
] as const;

export type PublicTelemetryEvent = (typeof publicTelemetryEvents)[number];

const staticRoutes = new Set([
  '/',
  '/accessibility',
  '/atlas',
  '/methods',
  '/observatory',
  '/privacy',
  '/research',
  '/research/concordia',
  '/research/resilience',
  '/sources',
]);

const scenarioRoute = /^\/atlas\/s(?:10|[1-9])$/;

/**
 * Public telemetry intentionally records product surfaces, not arbitrary URLs. Unknown and
 * malformed paths collapse into one non-identifying bucket instead of leaking user-controlled
 * route text into logs.
 */
export function normalizePublicTelemetryRoute(candidate: string | null | undefined) {
  if (!candidate || candidate.length > 120 || candidate.includes('?') || candidate.includes('#')) {
    return '/other';
  }

  const normalized = candidate.length > 1 ? candidate.replace(/\/+$/, '').toLowerCase() : '/';
  if (staticRoutes.has(normalized) || scenarioRoute.test(normalized)) return normalized;
  return '/other';
}

export function isNormalizedPublicTelemetryRoute(candidate: string) {
  return candidate === normalizePublicTelemetryRoute(candidate);
}
