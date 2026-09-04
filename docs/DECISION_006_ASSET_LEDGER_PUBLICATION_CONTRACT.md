# Decision 006 — Asset rights and publication contract

Date: 2026-08-30
Status: accepted

## Decision

Version 2 of the asset ledger makes the Master Plan Section 11.1 fields explicit on every record:
`sourceAgency`, `retrievedAt`, and `maxDisplaySize` now accompany the existing source/version,
credit, rights, checksums, transformation, and public-path fields.

`retrievedAt` is an ISO date (`YYYY-MM-DD`), not an invented time of day. Existing records were
normalized mechanically from a date already present in their pinned `sourceVersion`, the access and
rights log, or the generation record. The field means “the source was acquired or reviewed on this
recorded date”; it does not claim sub-day precision.

`maxDisplaySize` records decoded raster dimensions as `{ widthPx, heightPx }`. It is `null` when no
local derivative exists and for non-raster GLB derivatives, where pixel dimensions are not a
meaningful property. The validator inspects GLB version and byte length independently.

## Rights state and publication state are separate

`rightsStatus` records the underlying legal/reuse basis: verified open license, NASA reuse
guidelines, all rights reserved, or recorded permission. `admissionStatus` records what this project
may do now:

- `approved`: the rights record is compatible with use; this does not itself claim that a local
  derivative exists;
- `link_only`: the site may identify and link the external work, but the ledger must not claim a
  local source checksum, derivative checksum, transformation, or public derivative;
- `excluded`: the work is not admitted to a public product surface or bundle.

This dual-axis contract replaces the earlier simplistic `blocked`/`unknown` build rule. Unresolved
rights do not become a vague warning: they receive a conservative `link_only` or `excluded`
admission while retaining the exact known rights state. CI then blocks incompatible publication,
including an all-rights-reserved `approved` record, any public path outside `approved`, a link-only
local checksum, or an excluded public derivative.

## Derivative integrity

Every public derivative must have:

- a SHA-256 checksum for the acquired original;
- a SHA-256 checksum for the public derivative;
- a non-empty human-readable transformation history;
- a machine-checkable list of applied transformations that is a subset of the rights record's
  allowed transformations;
- required credit text and, for open/NASA records, the license or usage-policy URL.

The validator decodes JPEG/WebP signatures and pixel dimensions, validates GLB 2 headers and
declared length, checks extension/MIME agreement, blocks uncovered files, and requires complete 1K,
2K, and 4K responsive tiers for each runtime Earth map. Duplicate public paths are rejected unless
all contributors explicitly name one `sharedDerivativeGroup` and the checksum matches. The alien
character and telescope records use that exception because both licensed sources are incorporated
into the same combined observer GLB.

## Sources presentation

The searchable Sources ledger renders license links, source agency, retrieval date, maximum raster
size, and transformation history from these records. Detailed provenance stays collapsed until
requested. The page credits the persistent spatial Earth correctly to Solar System Scope under CC
BY 4.0 through the pinned Three.js example; the separate NASA derivative is identified as the
static/deferred poster path, with no endorsement implied.
