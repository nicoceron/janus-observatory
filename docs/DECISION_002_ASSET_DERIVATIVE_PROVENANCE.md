# Decision 002 — Web asset derivative provenance fields

Date: 2026-08-12
Status: accepted

## Decision

Extend the shared asset-ledger schema with optional SHA-256 source and derivative checksums, a
public derivative path, and a transformation log. Populate those fields for every asset that enters
the distributable web bundle.

## Reason

The master plan requires the original and derivative checksums and transformation history. The
initial ledger described rights and allowed transformations but could not record the exact file
that shipped. A source-page URL alone is insufficient to reproduce or audit a web derivative.

## First admitted derivative

`nasa.texture.blue-marble` now resolves to the exact `Earth (A).jpg` file at NASA 3D Resources
commit `11ebb4ee043715aefbba6aeec8a61746fad67fa7`. The public WebP preserves the 1440 × 720 dimensions
and records both checksums and the `cwebp` conversion settings. The product renders the required
credit and does not use NASA identity as product branding or imply endorsement.
