# Research retrieval and deployment gates

The bounded Research Companion is implemented with lexical retrieval, real deterministic domain
tools, exact citation auditing, and a deterministic fallback answer. It remains hidden unless the
preview flag is enabled. Hybrid retrieval is also implemented, but activates only when the preview,
live-provider, and hybrid flags are all enabled and a compatible prebuilt index is present. A
missing, malformed, stale, or provider-incompatible index falls back to lexical retrieval for that
request.

## Implemented bounded workflow

The runtime exposes only the fixed allowlist from the master plan:

```text
search_corpus
fetch_passages
get_scenario
compare_scenarios
get_observability_matrix
run_observer_model
get_reported_collapse_metrics
run_independent_collapse_model
resolve_citations
```

The six domain tools are schema-validated, read-only functions over generated runtime data. Routing
is deterministic and may schedule at most six domain calls in one bounded domain round; it is not an
autonomous tool loop. `run_independent_collapse_model` accepts only the committed
`validated_20000` preset and returns the precomputed fixed-seed result as `reimplemented` and
`noncanonical`, with its seed and limitations. It does not accept arbitrary simulation parameters.

Provider generation, when enabled, receives the selected source passages and deterministic tool
outputs. It cannot replace a canonical calculation. The citation auditor validates released markers
against retrieved source/version/page targets, and invalid or uncited provider prose falls back to
the deterministic evidence answer. Every answer includes a compact receipt with each allowlisted
call's name, status, and deterministic SHA-256 result hash; raw tool payloads are not returned to the
browser.

## Current deterministic release evidence

On 2026-08-30, `pnpm eval:research` ran against data version
`sha256:46a0e94a969301c49cfafe00463e5c7e9be5dce423ddcdeb21fe4ad0614d2046` and passed all 18
gold and prompt-injection cases. Retrieval recall@10, citation precision, citation target coverage,
supported-claim citation coverage, workflow-stage validity, tool-call validity, JSON validity, and
repeat-response fingerprint consistency were all `1`. Unsupported-claim rate was `0`. The harness
validated 70 actual tool receipts and found 0 invalid calls.

That receipt covers the deterministic release harness only: provider usage was 0 calls. It does not
stand in for live DeepSeek behavior, live Voyage embeddings, deployment latency, provider usage and
cache fields, timeout/429 handling, or distributed admission control.

## Controlled runtime input

Provision the reviewed prebuilt index at the fixed server-only path
`data/runtime/research/vector-index.json` in the immutable deployment artifact. The path is not
configurable from a request or environment variable. Do not place credentials in the index.

The JSON contract is:

```json
{
  "schemaVersion": "1.0.0",
  "dataVersion": "sha256:<canonical-data-version>",
  "corpusContentHash": "sha256:<generated-corpus-content-hash>",
  "embedding": {
    "provider": "voyage",
    "model": "voyage-4-lite",
    "dimensions": 1024
  },
  "entries": [{ "chunkId": "<exact generated corpus chunkId>", "vector": [0.0] }]
}
```

The illustrative vector above is not a valid production vector. Every real entry must have exactly
the declared dimension, finite components, a non-zero norm, a unique generated-corpus `chunkId`, and
the exact model used to build it. The runtime rejects the complete vector path if its data version,
corpus hash, provider, model, dimensions, schema, or chunk ownership differs from the deployed
generated corpus. It never silently mixes embeddings from different models or corpus releases.

## Activation

After building and independently recording the index artifact and checksum:

1. Provision the fixed index file alongside the matching generated corpus.
2. Configure `EMBEDDING_PROVIDER=voyage`, `VOYAGE_API_KEY`, `VOYAGE_EMBEDDING_MODEL`, and
   `VOYAGE_EMBEDDING_DIMENSIONS` to exactly match the index declaration.
3. Keep `JANUS_RESEARCH_PREVIEW_ENABLED=false` during initial deployment. The runtime will not read
   the index or call Voyage while preview is disabled.
4. Enable the preview and lexical path first, then set `JANUS_AGENT_LIVE_ENABLED=true` and
   `JANUS_RESEARCH_HYBRID_ENABLED=true` only in the provider/index canary deployment.
5. Verify `/api/health/agent` reports `retrieval.actualMode: "hybrid"` and no fallback reason.
6. Exercise `/api/research` and confirm `janus.research.retrieval` telemetry reports
   `actualMode: "hybrid"`. Provider or index failures must instead report lexical mode with a bounded
   fallback reason.

Before enabling the preview, also configure the bounded request controls documented in
`OPERATIONS_RUNBOOK.md`: a deployment-secret `JANUS_RATE_LIMIT_SALT`, the per-window rate limit,
`JANUS_RESEARCH_MAX_CONCURRENCY`, and—when per-client edge buckets are required—a dedicated
authenticated research proxy header. Raw `X-Forwarded-For` and `X-Real-IP` are never identity
inputs. Concurrency exhaustion fails closed before retrieval/provider work and returns a short
`Retry-After`; a multi-replica deployment must add a shared edge or datastore budget.

No production index or paid provider call is created by the repository build. Those remain explicit
deployment gates. Query text, source passages, vector components, credentials, and arbitrary paths
are never included in retrieval telemetry or health responses.

## External public-release gates

Keep the public prompt surface closed until all of these are recorded for the deployed artifact:

1. The canonical candidate has an independent human review attestation matching its exact data
   version, dataset hashes, and reconciliation artifact.
2. Live provider canaries pass JSON mode, tool-call/result round trips, thinking-mode multi-tool
   replay, usage/cache fields, timeout behavior, and 429 behavior for the deployed model and adapter.
3. The release golden-answer and prompt-injection suites pass against that deployed provider
   configuration, not only the deterministic fallback.
4. Hybrid mode has a matching checksummed vector index and a compatible deployed embedding service;
   otherwise the health and telemetry receipts must truthfully report lexical fallback.
5. Multi-replica deployments enforce a shared edge or datastore rate/concurrency budget in addition
   to the implemented process-local cap, with monitoring and rollback configured as described in
   `OPERATIONS_RUNBOOK.md`.
