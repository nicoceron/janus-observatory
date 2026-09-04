# Decision 009: Bounded Research domain tools and truthful call receipts

**Status:** accepted for the release candidate  
**Date:** 2026-08-30

## Context

The Research Companion already had bounded lexical/hybrid retrieval and citation auditing, but it
described retrieval as its only “domain-tool round.” The evaluation then counted workflow stage
labels as tool calls. That did not demonstrate the allowlisted scientific-tool architecture in the
master plan and overstated the evidence behind `toolCallValidity`.

## Decision

- `@janus/agent` depends on `@janus/domain` and exposes schema-validated, read-only tools for
  scenario lookup, field-preserving comparison, the categorical observability matrix, the
  published observer lookup, reported collapse metrics, and the fixed validated independent
  collapse preset.
- The runtime receives generated datasets from its server-only caller. The agent package does not
  read the filesystem, the web, SQL, environment secrets, or arbitrary code.
- Questions are deterministically routed to at most six domain calls in one bounded domain round.
  Retrieval and citation resolution remain explicit allowlisted calls; there is no autonomous tool
  loop.
- The independent-collapse tool accepts only the committed `validated_20000` preset. It returns
  `reimplemented` and `noncanonical` evidence with the serialized seed and limitations; arbitrary
  parameter execution is rejected.
- Every released answer includes a compact tool receipt with the exact allowlisted name, status,
  and a deterministic SHA-256 result hash. Raw tool payloads are not exposed to the browser.
- Provider generation receives deterministic tool outputs alongside source passages. Its prose is
  still released only after exact citation auditing; deterministic corpus synthesis remains the
  fail-safe fallback.
- Provider retries use capped exponential backoff with equal jitter. Attempts, tool rounds,
  concurrency, time, body size, and output tokens remain separately bounded.
- The release evaluation validates and counts actual tool receipts. Workflow-stage validity is a
  separate metric and is never relabeled as tool-call validity.

## Consequences

This adds a workspace dependency from the agent package to the domain package and extends the
Research answer envelope with `toolCalls`. It keeps the core experience static and independent of
AI, while making Research execution inspectable and scientifically bounded. Live provider canaries,
the production vector index, and distributed deployment budgets remain external release gates.
