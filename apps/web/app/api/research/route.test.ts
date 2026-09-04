import { afterEach, describe, expect, it, vi } from 'vitest';

import corpus from '../../../../../data/generated/research/corpus.json';

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.doUnmock('../../../lib/research-vector-runtime');
  vi.restoreAllMocks();
  vi.resetModules();
});

async function loadEnabledRoute() {
  process.env.JANUS_RESEARCH_PREVIEW_ENABLED = 'true';
  process.env.JANUS_AGENT_LIVE_ENABLED = 'false';
  process.env.JANUS_RESEARCH_RATE_LIMIT = '20';
  vi.resetModules();
  return import('./route');
}

describe('POST /api/research', () => {
  it('streams a citation-audited lexical answer without a provider', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { POST } = await loadEnabledRoute();
    const response = await POST(
      new Request('http://localhost/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.1' },
        body: JSON.stringify({ question: 'Why does HWO list no signature for S9?' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/x-ndjson');
    const events = (await response.text())
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            type: string;
            data?: {
              audit: { passed: boolean };
              retrievalMode: string;
              toolCalls: Array<{ name: string; resultHash: string }>;
            };
          },
      );
    expect(events.some(({ type }) => type === 'status')).toBe(true);
    expect(events.find(({ type }) => type === 'answer')?.data?.audit.passed).toBe(true);
    expect(events.find(({ type }) => type === 'answer')?.data?.retrievalMode).toBe('lexical');
    expect(
      events.find(({ type }) => type === 'answer')?.data?.toolCalls.map(({ name }) => name),
    ).toEqual(['search_corpus', 'fetch_passages', 'run_observer_model', 'resolve_citations']);
    expect(
      events
        .find(({ type }) => type === 'answer')
        ?.data?.toolCalls.every(({ resultHash }) => /^sha256:[a-f0-9]{64}$/.test(resultHash)),
    ).toBe(true);
    expect(log.mock.calls.flat().join(' ')).not.toContain('192.0.2.1');
  });

  it('ignores spoofed forwarding headers unless a dedicated proxy boundary is authenticated', async () => {
    const { opaqueResearchRequestKey } = await loadEnabledRoute();
    const environment = {
      JANUS_RATE_LIMIT_SALT: 'test-rate-limit-salt-with-enough-entropy',
      JANUS_RESEARCH_TRUSTED_IP_HEADER: 'x-janus-research-client-ip',
      JANUS_RESEARCH_PROXY_SECRET: 'test-proxy-secret-at-least-16-bytes',
    };
    const directHeaders = {
      'user-agent': 'janus-test-client',
      'accept-language': 'en',
    };
    const spoofedOne = new Request('http://localhost/api/research', {
      headers: {
        ...directHeaders,
        'x-forwarded-for': '192.0.2.10',
        'x-real-ip': '192.0.2.11',
        'x-janus-research-client-ip': '192.0.2.12',
      },
    });
    const spoofedTwo = new Request('http://localhost/api/research', {
      headers: {
        ...directHeaders,
        'x-forwarded-for': '198.51.100.20',
        'x-real-ip': '198.51.100.21',
        'x-janus-research-client-ip': '198.51.100.22',
        'x-janus-proxy-auth': 'wrong-secret-value',
      },
    });

    const directKey = opaqueResearchRequestKey(spoofedOne, environment);
    expect(opaqueResearchRequestKey(spoofedTwo, environment)).toBe(directKey);
    expect(directKey).toMatch(/^[a-f0-9]{64}$/);
    expect(directKey).not.toContain('192.0.2.10');

    const trustedOne = new Request('http://localhost/api/research', {
      headers: {
        ...directHeaders,
        'x-janus-research-client-ip': '192.0.2.30',
        'x-janus-proxy-auth': environment.JANUS_RESEARCH_PROXY_SECRET,
      },
    });
    const trustedTwo = new Request('http://localhost/api/research', {
      headers: {
        ...directHeaders,
        'x-janus-research-client-ip': '192.0.2.31',
        'x-janus-proxy-auth': environment.JANUS_RESEARCH_PROXY_SECRET,
      },
    });
    expect(opaqueResearchRequestKey(trustedOne, environment)).not.toBe(
      opaqueResearchRequestKey(trustedTwo, environment),
    );

    const forbiddenStandardHeaderEnvironment = {
      ...environment,
      JANUS_RESEARCH_TRUSTED_IP_HEADER: 'x-forwarded-for',
    };
    const authenticatedForwardedOne = new Request('http://localhost/api/research', {
      headers: {
        ...directHeaders,
        'x-forwarded-for': '192.0.2.40',
        'x-janus-proxy-auth': environment.JANUS_RESEARCH_PROXY_SECRET,
      },
    });
    const authenticatedForwardedTwo = new Request('http://localhost/api/research', {
      headers: {
        ...directHeaders,
        'x-forwarded-for': '192.0.2.41',
        'x-janus-proxy-auth': environment.JANUS_RESEARCH_PROXY_SECRET,
      },
    });
    expect(
      opaqueResearchRequestKey(authenticatedForwardedOne, forbiddenStandardHeaderEnvironment),
    ).toBe(opaqueResearchRequestKey(authenticatedForwardedTwo, forbiddenStandardHeaderEnvironment));
  });

  it('passes validated vector candidates into the workflow and reports hybrid mode', async () => {
    const resolveConfiguredHybridRetrieval = vi.fn().mockResolvedValue({
      vectorRetrieval: {
        dataVersion: corpus.dataVersion,
        candidates: [{ chunkId: 'canonical:s4:collapse', score: 1 }],
      },
      status: {
        requestedMode: 'hybrid',
        actualMode: 'hybrid',
        fallbackReason: null,
        provider: 'voyage',
        model: 'voyage-test',
        dimensions: 1024,
        vectorCandidateCount: 1,
      },
    });
    vi.doMock('../../../lib/research-vector-runtime', () => ({
      resolveConfiguredHybridRetrieval,
    }));
    const { POST } = await loadEnabledRoute();
    const response = await POST(
      new Request('http://localhost/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.44' },
        body: JSON.stringify({ question: 'What is reported about collapse in S4?' }),
      }),
    );
    const events = (await response.text())
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { type: string; data?: { retrievalMode: string } });

    expect(resolveConfiguredHybridRetrieval).toHaveBeenCalledOnce();
    expect(events.find(({ type }) => type === 'answer')?.data?.retrievalMode).toBe('hybrid');
  });

  it('rejects malformed requests before opening a response stream', async () => {
    const { POST } = await loadEnabledRoute();
    const response = await POST(
      new Request('http://localhost/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.2' },
        body: '{not-json',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'INVALID_JSON' });
  });

  it('rejects an oversized body even when content-length is absent', async () => {
    const { POST } = await loadEnabledRoute();
    const request = new Request('http://localhost/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.3' },
      body: JSON.stringify({ question: `S4 ${'x'.repeat(4_200)}` }),
    });
    request.headers.delete('content-length');

    const response = await POST(request);

    expect(request.headers.get('content-length')).toBeNull();
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: 'REQUEST_TOO_LARGE' });
  });

  it('builds structured provider telemetry without research content or secrets', async () => {
    const { buildProviderTelemetryEvent, buildRetrievalTelemetryEvent } = await loadEnabledRoute();
    const event = buildProviderTelemetryEvent(
      {
        provider: 'deepseek',
        responseId: 'opaque-response-id',
        model: 'deepseek-v4-flash',
        status: 'completed',
        inputTokens: 20,
        outputTokens: 8,
        reasoningTokens: 5,
        cachedInputTokens: 4,
      },
      12.6,
      [
        {
          chunkId: 'canonical:s4:collapse',
          sourceId: 'JANUS-PAPER-05',
          sourceVersion: 'arXiv:2604.13774v1',
          pageStart: 7,
          pageEnd: 7,
          heading: 'Collapse',
        },
      ],
    );
    const serialized = JSON.stringify(event);

    expect(event).toMatchObject({
      model: 'deepseek-v4-flash',
      status: 'completed',
      latencyMs: 13,
      cacheHit: true,
      citedSourceIds: ['JANUS-PAPER-05'],
      tokenCounts: { reasoning: 5 },
    });
    expect(serialized).not.toContain('opaque-response-id');
    expect(serialized).not.toContain('question');
    expect(serialized).not.toContain('evidence');
    expect(serialized).not.toContain('outputText');

    const retrievalEvent = buildRetrievalTelemetryEvent(
      {
        requestedMode: 'hybrid',
        actualMode: 'lexical',
        fallbackReason: 'embedding_error',
        provider: 'voyage',
        model: 'voyage-4-lite',
        dimensions: 1024,
        vectorCandidateCount: 0,
      },
      7.7,
    );
    expect(retrievalEvent).toMatchObject({
      requestedMode: 'hybrid',
      actualMode: 'lexical',
      fallbackReason: 'embedding_error',
      latencyMs: 8,
    });
    expect(JSON.stringify(retrievalEvent)).not.toContain('question');
  });

  it('does not combine a known citation alias with a different known source version', async () => {
    const { resolveCitationUrl } = await loadEnabledRoute();
    const citation = {
      chunkId: 'mismatched-known-pair',
      sourceId: 'JANUS-PAPER-01',
      sourceVersion: 'arXiv:2511.20329v2',
      pageStart: 4,
      pageEnd: 4,
      heading: 'Mismatched source identity',
    };

    expect(resolveCitationUrl(citation)).toBeUndefined();
    expect(
      resolveCitationUrl({
        ...citation,
        sourceId: 'JANUS-PAPER-03',
      }),
    ).toBe('https://arxiv.org/pdf/2511.20329v2#page=4');
  });

  it('fails closed when the in-process concurrency budget is exhausted', async () => {
    process.env.JANUS_RESEARCH_MAX_CONCURRENCY = '1';
    let releaseFirstRequest: ((value: unknown) => void) | undefined;
    const lexicalResult = {
      vectorRetrieval: undefined,
      status: {
        requestedMode: 'lexical' as const,
        actualMode: 'lexical' as const,
        fallbackReason: 'hybrid_disabled' as const,
        provider: 'voyage',
        model: 'voyage-4-lite',
        dimensions: 1024,
        vectorCandidateCount: 0,
      },
    };
    const firstRequestGate = new Promise((resolve) => {
      releaseFirstRequest = resolve;
    });
    const resolveConfiguredHybridRetrieval = vi
      .fn()
      .mockImplementationOnce(() => firstRequestGate)
      .mockResolvedValue(lexicalResult);
    vi.doMock('../../../lib/research-vector-runtime', () => ({
      resolveConfiguredHybridRetrieval,
    }));
    const { POST } = await loadEnabledRoute();

    const firstResponse = await POST(
      new Request('http://localhost/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'user-agent': 'first-client' },
        body: JSON.stringify({ question: 'What is reported about collapse in S4?' }),
      }),
    );
    expect(firstResponse.status).toBe(200);
    await vi.waitFor(() => expect(resolveConfiguredHybridRetrieval).toHaveBeenCalledOnce());

    const rejectedResponse = await POST(
      new Request('http://localhost/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'user-agent': 'second-client' },
        body: JSON.stringify({ question: 'What is reported about collapse in S5?' }),
      }),
    );
    expect(rejectedResponse.status).toBe(503);
    expect(rejectedResponse.headers.get('retry-after')).toBe('1');
    await expect(rejectedResponse.json()).resolves.toMatchObject({
      error: 'RESEARCH_CONCURRENCY_EXHAUSTED',
    });
    expect(resolveConfiguredHybridRetrieval).toHaveBeenCalledOnce();

    releaseFirstRequest?.(lexicalResult);
    await firstResponse.text();
    const admittedAfterRelease = await POST(
      new Request('http://localhost/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'user-agent': 'third-client' },
        body: JSON.stringify({ question: 'What is reported about collapse in S6?' }),
      }),
    );
    expect(admittedAfterRelease.status).toBe(200);
    await admittedAfterRelease.text();
    expect(resolveConfiguredHybridRetrieval).toHaveBeenCalledTimes(2);
  });

  it('fails closed when the preview flag is disabled', async () => {
    const resolveConfiguredHybridRetrieval = vi.fn();
    vi.doMock('../../../lib/research-vector-runtime', () => ({
      resolveConfiguredHybridRetrieval,
    }));
    process.env.JANUS_RESEARCH_PREVIEW_ENABLED = 'false';
    vi.resetModules();
    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/research', {
      method: 'POST',
      body: JSON.stringify({ question: 'What is reported for S4?' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(503);
    expect(request.bodyUsed).toBe(false);
    expect(resolveConfiguredHybridRetrieval).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: 'RESEARCH_PREVIEW_DISABLED' });
  });
});
