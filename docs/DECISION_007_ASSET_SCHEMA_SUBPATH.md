# Decision 007 — Keep the asset schema out of the core browser domain entry

Date: 2026-08-30

Status: accepted

## Decision

`@janus/domain/asset` is the public import path for the asset-ledger schema. The package root keeps
the scientific evidence, scenario, observability, and release contracts used by the core story,
but no longer evaluates the asset schema in that browser graph.

## Why

Asset-ledger schema v2 added the publication, rights, dimensions, and transformation checks required
by the master plan. Those server/build-time checks do not participate in the story runtime. Keeping
them in the package barrel caused Turbopack to include their Zod construction in the home route and
exceeded the unchanged 250 KiB initial-JavaScript guard by 415 gzip bytes.

The explicit subpath preserves one shared schema for Sources, health, and asset validation while
removing unrelated code from the initial client graph. No scientific contract, runtime value, or
budget threshold changes.

## Verification

- Type checking must resolve both `@janus/domain` and `@janus/domain/asset`.
- Asset validation and asset-ledger tests must still use schema v2.
- The production bundle gate must account for the emitted Next.js script graph and remain at or
  below 256,000 gzip bytes for the home route.
