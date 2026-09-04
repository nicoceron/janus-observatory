# Decision 008: Generated runtime, reviewer attestation, and exact source identity

Status: accepted for implementation
Date: 2026-08-30

## Context

Canonical transcriptions use public citation labels such as `JANUS-PAPER-03`, while the checksum
lock uses internal source IDs such as `janus.paper.observing-strategies`. Matching an ID and version
independently can join two different sources. The web application also imported mutable
transcription inputs directly, and the generator had no formal path for an independent reviewer to
move a release candidate into a reviewed state.

## Decision

- A source-manifest entry may declare one unique `citationId`. Source resolution is one exact pair:
  `(entry.id === sourceId || entry.citationId === sourceId) && entry.version === sourceVersion`.
  Manifest IDs and public aliases share one uniqueness namespace; versions never resolve a source
  by themselves.
- `data/canonical/` remains the reviewed-input workspace. The generator copies the eight validated
  datasets, unchanged, to individual `data/generated/runtime/*.json` files and emits a compact
  `runtime/release-identity.json`. Web runtime code imports only those generated dataset files.
- Release generation is unsigned and fail-closed by default. `janus-generate --review-record PATH`
  is the only approval path. Its strict JSON record names an independent reviewer, review time,
  independence statement, and rationale; approves every dataset by ID and normalized payload hash;
  records corrections and change rationale; and approves the complete reconciliation by ID and
  stable scientific-payload hash.
- `attestationHash` is SHA-256 over canonical JSON for the entire reviewer record excluding only the
  top-level `attestationHash` field. Missing, duplicate, stale, partial, mismatched, or incorrectly
  hashed records are rejected. A valid record is copied into the generated review directory and its
  attestation is repeated in the review packet, reconciliation, versioned download, runtime release
  identity, generated manifest, and rendered review pages.
- Reconciliation scientific payload hashes exclude only release/review metadata and the hash field,
  so the reviewer approves one stable 120-cell reconciliation payload. Candidate artifacts remain
  `candidate_not_reviewed` / `pending`; only a validated explicit record emits `reviewed` /
  `approved`. No placeholder or synthetic signoff is committed.

## Consequences

- A known source alias paired with another known source version fails instead of silently resolving.
- Components cannot bypass generation and consume mutable transcription inputs.
- Scientific review becomes an auditable state transition tied to exact content, not a label that a
  generator can hardcode.
- Human review is still outstanding for the committed release. Regeneration without
  `--review-record` deterministically removes any reviewed-state artifact.
