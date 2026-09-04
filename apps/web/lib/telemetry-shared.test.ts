import { describe, expect, it } from 'vitest';

import {
  isNormalizedPublicTelemetryRoute,
  normalizePublicTelemetryRoute,
} from './telemetry-shared';

describe('public telemetry route allowlist', () => {
  it('keeps only named product surfaces and canonical scenario routes', () => {
    expect(normalizePublicTelemetryRoute('/research/concordia')).toBe('/research/concordia');
    expect(normalizePublicTelemetryRoute('/atlas/S10/')).toBe('/atlas/s10');
    expect(isNormalizedPublicTelemetryRoute('/atlas/s3')).toBe(true);
  });

  it('coalesces arbitrary, malformed, and query-bearing paths', () => {
    expect(normalizePublicTelemetryRoute('/private/user-created-slug')).toBe('/other');
    expect(normalizePublicTelemetryRoute('/sources?question=private')).toBe('/other');
    expect(normalizePublicTelemetryRoute('https://example.com/sources')).toBe('/other');
    expect(isNormalizedPublicTelemetryRoute('/private/user-created-slug')).toBe(false);
  });
});
