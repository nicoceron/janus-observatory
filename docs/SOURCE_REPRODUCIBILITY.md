# Source-lock reproducibility

The committed `data/sources/manifest.json` is the immutable source lock. Its 15 PDF files are
ignored controlled build inputs, not public web assets. In particular, fetching the ten Zenodo
scenario PDFs does not grant redistribution rights and does not change their `metadata_missing`,
link-only public-use boundary.

From a fresh clone with Node 24, pnpm 10.10, and `uv` installed, run:

```sh
pnpm install --frozen-lockfile
uv sync --project pipeline --extra dev --locked
uv sync --project experiments/resilience-lab --extra dev --locked
pnpm source:reproduce:strict
```

The command downloads every declared `directFileUrl` to a staging directory, requires a PDF HTTP
media type (or a PDF-named generic binary response), verifies PDF magic/readability, page count,
byte size, and SHA-256, then replaces declared ignored inputs only after every download passes. It
requests identity encoding so hashes cover the preserved upstream bytes, and does not rewrite
manifest timestamps, versions, URLs, checksums, rights, or other metadata. A failed download leaves
existing inputs untouched.

After installing the exact lock, the command regenerates into a temporary directory and compares
every generated artifact byte-for-byte with `data/generated`. `pnpm data:generate:check` retains a
metadata-only validation fallback for ordinary offline clone checks;
`pnpm data:generate:check:strict` deliberately refuses that fallback.

Before accepting generated data, the strict command also runs the independent resilience
experiment's offline replay gate. That gate recomputes the fixed-seed 20,000-run comparison for all
ten scenarios and requires exact agreement with the committed scientific payload. The report is
bound to the actual experiment Python files, dependency lock, step-semantics ADR, and canonical
collapse input by a deterministic SHA-256 file manifest; a Git commit alone is not accepted as an
implementation identity. This output remains `reimplemented` and `noncanonical`, and the check does
not copy, import, or execute the unlicensed author-hosted implementation.

The same full network-dependent receipt runs in the scheduled/manual **Source reproducibility**
GitHub Actions workflow. It is not placed on every fork pull request because upstream document
hosts are external and occasionally brittle.
