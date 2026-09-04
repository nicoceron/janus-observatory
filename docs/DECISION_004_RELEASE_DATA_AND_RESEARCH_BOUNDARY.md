# Decision 004: Generated release data and bounded research boundary

Status: accepted for implementation
Date: 2026-08-29

## Context

The canonical transcriptions predate the full master-plan `SourceRef` shape, use stable paper aliases
such as `JANUS-PAPER-03`, and still require independent human source-versus-normalized sign-off.
The Research Companion also needs a useful no-provider path without moving source text or secrets
into the browser.

## Decision

- Preserve the existing canonical JSON as immutable transcription input. Extend the shared
  `SourceRef` schema with optional row, column, URL, evidence, extraction, and review fields so new
  records can satisfy the full contract without falsifying metadata on old records.
- Resolve legacy paper aliases to the checksum-locked source manifest by exact source version.
- Generate runtime downloads, a lexical corpus, discrepancy records, and source-versus-normalized
  review packets reproducibly under `data/generated/`. The review packet remains
  `candidate_not_reviewed` until an independent reviewer signs it.
- Keep the validated resilience experiment noncanonical. Only a hashed, explicitly
  `reimplemented` validation snapshot may enter generated runtime data.
- Keep provider code server-only. The public research route uses a fixed lexical corpus, bounded
  input/output/passages/tool-round budgets, opaque in-memory rate keys, exact citation auditing,
  and deterministic fallback. It never exposes arbitrary web, SQL, filesystem, or code execution.

## Consequences

- Generated artifacts can be hash-validated in a fresh clone and fully regenerated when the ignored
  source lock is available.
- Published cross-paper discrepancies remain visible instead of being silently reconciled.
- Provider or vector-service failure cannot block the core product, and uncited provider output is
  never released as a canonical answer.
- Human scientific review, production-grade distributed rate limiting, and live provider canaries
  remain deployment gates rather than hidden success claims.
