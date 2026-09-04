import { afterEach, describe, expect, it } from 'vitest';

import { GET } from './route';

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe('GET /api/health/agent', () => {
  it('never treats configuration alone as provider release readiness', async () => {
    process.env.JANUS_RESEARCH_PREVIEW_ENABLED = 'true';
    process.env.JANUS_AGENT_LIVE_ENABLED = 'true';
    process.env.JANUS_RESEARCH_HYBRID_ENABLED = 'false';
    process.env.DEEPSEEK_API_KEY = 'configured-only-for-test';

    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe('provider_configured_pending_canary');
    expect(body.providerReleaseState).toBe('held_closed_pending_full_provider_canary');
    expect(body.providerCanary.status).toBe('partial_external_gate');
    expect(body.retrieval).toMatchObject({
      actualMode: 'lexical',
      fallbackReason: 'hybrid_disabled',
    });
    expect(JSON.stringify(body)).not.toContain('configured-only-for-test');
  });
});
