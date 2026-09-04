# Decision 005: Field-level provenance and explicit missing states

Status: accepted for implementation
Date: 2026-08-29

## Context

Dataset-level citations identify a publication but cannot prove which table cell, figure row, or
reported passage supports an individual canonical fact. The Atlas and Observatory also need to
distinguish a source value that was captured from one that the source did not report or that Janus
has deliberately not transcribed. A bare `null` cannot preserve those distinctions.

## Decision

- Use `Sourced<T>` for canonical summary, expanded morphology, and Observatory mission
  assumptions. A captured value carries its evidence kind and one or more versioned `SourceRef`
  records. An unavailable value carries `null`, a required note, and one of `not_reported`,
  `not_captured`, or `not_transcribed`.
- Use strict typed `fieldProvenance` maps for existing scalar and tabular contracts where wrapping
  every value would break stable consumers. These maps cover scenario construction and trajectory,
  atmosphere column descriptors and cells, planetary and system-technosignature rows and cells,
  Observatory mission/detection cells, and collapse parameters and reported results.
- Require every field reference to resolve to the same source id and version as its canonical
  dataset and to contain an exact `row` and `column` locator. Dataset-header provenance alone does
  not satisfy the release validator.
- Preserve the existing scalar scenario fields as compatibility values for Story and other static
  consumers. They are authoritative only together with their typed provenance maps; new expanded
  fields use `Sourced<T>` directly.
- Pin the migrated facts to the existing locked source versions: `JANUS-PAPER-01` at
  `arXiv:2409.00067v3`, `JANUS-PAPER-03` at `arXiv:2511.20329v2`, and `JANUS-PAPER-05` at
  `arXiv:2604.13774v1`.

`not_transcribed` means the cited source surface exists but Janus has not captured a defensible
value from it. It is not zero, absence, non-detection, or permission to estimate a chart. In
particular, morphology biosphere details and figure-only collapse metrics remain null instead of
being digitized or inferred. `not_reported` means the checked source does not state the requested
assumption, while `not_captured` is reserved for a value that may exist but has not entered the
canonical transcription.

## Consequences

- Canonical schema revisions change the normalized payload hashes and therefore the generated
  `dataVersion`; all downloads, review packets, corpus files, and the generated manifest must be
  regenerated together.
- Atlas and Observatory can display values, missing states, evidence classes, and exact locators
  without component literals or broad dataset-level citations.
- Release validation rejects missing field provenance, source-version drift, and non-exact
  locators before generated data is admitted.
- Mechanical transcription and deterministic generation do not constitute scientific review. The
  generated release remains `candidate_pending_independent_review`, and the review packet remains
  `candidate_not_reviewed` until an independent source-versus-normalized review is recorded.
