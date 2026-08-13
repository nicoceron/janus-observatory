# Janus Observatory acquisition guide

Status: actionable
Last verified: 2026-08-12

This guide covers the resources that cannot be safely inferred or manufactured. The project owner
has a direct Project Janus Slack route, so the research and permission requests may be sent by Slack
instead of email. Use the exact request language below, omitting email-style greetings if useful.
Export or screenshot the complete response so the sender, date, and scope remain attributable.
Attach received files in this chat or place them in the listed `incoming/` folder. These folders are
ignored by Git.

## Priority and ownership

| Priority | Resource                 | What you must do                                                    | Destination                                 |
| -------- | ------------------------ | ------------------------------------------------------------------- | ------------------------------------------- |
| Done     | DeepSeek production key  | Configured locally; promote separately through host secrets         | `.env.local` or host secret store           |
| Done     | Embedding provider       | Voyage `voyage-4-lite` passed a 1,024-dimension canary              | `.env.local` or host secret store           |
| P1       | Collapse rights/raw runs | Request a code/data license, raw trajectories, and environment lock | `incoming/janus-authors/collapse-recovery/` |
| P1       | Zenodo PDF reuse license | Ask the depositor to update metadata or grant written permission    | `incoming/permissions/zenodo-pipelines/`    |
| P2       | Water Zither permission  | Ask the project lead to forward a rights request to CJ Baal         | `incoming/permissions/water-zither/`        |
| Optional | Original spectral runs   | Request only for replication comparison, not as source data         | `incoming/janus-authors/spectra/`           |

## 1. Collapse code rights, environment, and raw runs

The code is public. The collapse–recovery paper's Code Availability statement on rendered page 20
links the author-hosted [`celiablanco/technocycles`](https://github.com/celiablanco/technocycles)
repository. The reproducibility audit is pinned to commit
[`910770dbe9224a9f7b1e003fdc7c000c2d78a5c2`](https://github.com/celiablanco/technocycles/tree/910770dbe9224a9f7b1e003fdc7c000c2d78a5c2)
(2026-05-24), rather than the moving `main` branch.

At that commit:

- `notebooks/figures.ipynb` contains the simulation and figure-generation code;
- the main 200-replicate Monte Carlo generator is initialized with seed `12345`;
- sensitivity batches use seed `54321`;
- [`notebooks/technosphere_summary.csv`](https://github.com/celiablanco/technocycles/blob/910770dbe9224a9f7b1e003fdc7c000c2d78a5c2/notebooks/technosphere_summary.csv)
  contains aggregate metrics for all ten scenarios; and
- no per-run trajectories, dependency lock, `LICENSE`, or `COPYING` file are committed, and GitHub's
  repository metadata reports no license.

Public availability is not a software/data license. Janus Observatory therefore links to the code
and aggregate CSV but does not copy, bundle, adapt, execute as a project dependency, or normalize
their values into canonical runtime data. Canonical collapse metrics remain transcribed from the CC
BY 4.0 paper until rights are clarified.

Send to:

- **To:** `celia.blanco@cab.inta-csic.es` — corresponding author named in the preprint.
- **CC:** `jacob@bmsis.org` — Project Janus lead and coauthor.

Subject:

```text
License and remaining replication materials for technocycles (arXiv:2604.13774)
```

Message:

```text
Dear Dr. Blanco and Dr. Haqq-Misra,

I am building Janus Observatory, a nonprofit/portfolio-oriented interactive scientific atlas that
will explain the ten Project Janus scenarios with explicit citations and clear separation between
published results, modeled outputs, and editorial interpretation.

I found the public technocycles repository linked by the paper and pinned my audit to commit
910770dbe9224a9f7b1e003fdc7c000c2d78a5c2. That commit contains figures.ipynb, uses seed 12345 for
the main ensemble and 54321 for sensitivity batches, and includes technosphere_summary.csv.

Could you clarify or provide the remaining replication materials:

1. an explicit software license for the repository and data license for the committed CSV;
2. confirmation that commit 910770d and its documented seeds correspond to the submitted/reported
   ensembles;
3. a dependency/environment lock with package versions;
4. per-run time-series outputs and run identifiers, not only summary statistics;
5. any separate parameter/configuration files or post-processing scripts not committed there;
6. units and field definitions for the raw trajectories and aggregate CSV; and
7. the required software/data citation and attribution.

Updating the GitHub repository with a LICENSE plus a versioned Zenodo/OSF archive would be ideal. A
ZIP plus written permission and a README is also useful. I will preserve provenance, display
caveats, and will not redistribute files beyond the permission or license you provide.

Thank you,
[YOUR NAME]
[PROJECT OR PORTFOLIO URL, if available]
```

What counts as complete: an explicit license covering code and data, author confirmation of the
public commit/seed lineage, an environment lock, raw trajectories, any external parameter files,
schema/units, and required citation. The public notebook and aggregate CSV already satisfy the
basic code and machine-readable-summary availability questions; they do not supply reuse rights or
per-run data.

When it arrives, place the untouched archive and the email/exported permission beside it in:

```text
incoming/janus-authors/collapse-recovery/
```

## 2. Spectral inputs and optional author run products

The published tables are the source. In particular:

- Table 6 and Table 7 of the
  [scenario-modeling paper](https://arxiv.org/abs/2409.00067) provide technosignature scaling and
  future-Earth atmospheric mixing ratios.
- Table 1 of the [observing-strategies paper](https://arxiv.org/abs/2511.20329), DOI
  [`10.3847/2041-8213/ae23c6`](https://doi.org/10.3847/2041-8213/ae23c6), consolidates the published
  Earth inputs used to generate the paper's synthetic observing products.

Janus Observatory will generate its own versioned PSG/LIFEsim products from those tables and the
published observing assumptions. Those outputs must be labeled `derived` and `model_generated`,
with simulator version/configuration and source-table lineage. Original author curves are optional
replication evidence, not a missing canonical data source.

Only if we want byte-level comparison against the authors' original runs, send the following:

Send to:

- **To:** `jacob@bmsis.org`
- **CC:** `ravikumar.kopparapu@nasa.gov` — address published on Ravi Kopparapu's
  [official NASA profile](https://science.gsfc.nasa.gov/699/bio/ravikumar.kopparapu).

Subject:

```text
Machine-readable PSG/LIFEsim products for Janus technosignature observability
```

Message:

```text
Dear Dr. Haqq-Misra and Dr. Kopparapu,

I am building Janus Observatory, an evidence-backed interactive explanation of the ten Project
Janus futures and the observing ladder described in ApJL 995:L22
(DOI: 10.3847/2041-8213/ae23c6).

Could you share the original machine-readable run products behind the PSG and LIFE/LIFEsim figures
for replication comparison, including:

1. the exact PSG input configurations and returned output files;
2. wavelength grids, spectra/fluxes, uncertainties or noise terms, and units in CSV, TSV, FITS,
   HDF5, or another documented numeric format;
3. LIFE/LIFEsim configuration and output files;
4. the mapping from each file/run to scenario, atmospheric case, target distance, integration time,
   telescope/instrument configuration, and detection threshold;
5. simulator/software versions and any post-processing scripts; and
6. the reuse license and requested attribution.

I am treating the published tables as the canonical source inputs and will label our regenerated
curves as derived/model-generated. The original products would be used to validate that independent
pipeline and will not be redistributed beyond the permission or license you provide.

Thank you,
[YOUR NAME]
[PROJECT OR PORTFOLIO URL, if available]
```

When it arrives, preserve the original directory/archive without renaming its internal files:

```text
incoming/janus-authors/spectra/
```

## 3. Explicit license for the ten Zenodo scenario PDFs

The files are downloadable at [Zenodo record 11174443](https://zenodo.org/records/11174443), but
the record API currently returns no `rights`/license metadata. This is a metadata and permission
problem, not a missing-download problem.

Send to:

- **To:** `jacob@bmsis.org` — first listed creator and Project Janus lead.

Subject:

```text
License clarification for Project Janus Worldbuilding Pipelines (Zenodo 11174443)
```

Message:

```text
Dear Dr. Haqq-Misra,

I am building Janus Observatory, an interactive scientific atlas based on the Project Janus corpus.
The ten Worldbuilding Pipeline PDFs at Zenodo record 11174443 are publicly downloadable, but the
record currently exposes no explicit license in its rights metadata.

Would you be willing either to add the intended license to the Zenodo record or provide written
permission covering these uses:

1. storing preservation copies for the project;
2. extracting and normalizing factual/scenario fields into JSON with page-level citations;
3. displaying short attributed excerpts and derived charts on the public website; and
4. publishing the normalized JSON and provenance metadata under a stated license?

Please identify the exact license, required credit line, and any uses you do not authorize. If the
ten PDFs have different rights, a file-by-file statement would be ideal.

Thank you,
[YOUR NAME]
[PROJECT OR PORTFOLIO URL, if available]
```

Best outcome: the authors update Zenodo itself with an explicit license. Otherwise, save a PDF or
`.eml` export of the written response in:

```text
incoming/permissions/zenodo-pipelines/
```

Until this is resolved, the application may cite and link to these PDFs, but it will not ship their
full contents or assume an open-content license.

## 4. Permission to embed “Water Zither of the Ba-i”

The official [S7 Restoration page](https://futures.bmsis.org/scenarios/s7-restoration) credits
**CJ Baal** and labels the image **all rights reserved**. Public availability is not permission to
embed or create responsive derivatives.

No verified public email for CJ Baal is listed on the Project Janus site. Use the project lead as
the contact route:

- **To:** `jacob@bmsis.org`
- Ask explicitly for the message to be forwarded to CJ Baal or the current rights holder.

Subject:

```text
Permission request: Water Zither of the Ba-i (Project Janus S7.1.3)
```

Message:

```text
Dear Dr. Haqq-Misra,

Would you please forward this request to CJ Baal or the current rights holder for “Water Zither of
the Ba-i” (Project Janus artifact S7.1.3)?

I am requesting a non-exclusive, worldwide, no-fee license to display the work in Janus Observatory,
an educational/portfolio interactive about the Project Janus scenarios. The requested permission
would include:

1. embedding the image on the public website;
2. generating technically necessary WebP/AVIF versions and responsive sizes;
3. generating uncropped thumbnails and a social-preview image;
4. retaining the image in deployment backups; and
5. displaying the credit and copyright line specified by the rights holder.

I will not sell the image, sublicense it as a standalone asset, remove the creator credit, or make
substantive artistic alterations. Please state whether any crop is allowed, the exact required
credit, the permission duration, and whether permission can be revoked for future distributions.

If permission is not available, I will keep a link to the official Project Janus page instead of
embedding the work.

Thank you,
[YOUR NAME]
[PROJECT OR PORTFOLIO URL, if available]
```

The response must come from CJ Baal or another person who confirms they control the rights. Save the
response in:

```text
incoming/permissions/water-zither/
```

## 5. Production DeepSeek API key

DeepSeek V4 Flash is a current official API model as of the verification date. The model identifier
is exactly `deepseek-v4-flash`; the OpenAI-compatible base URL is `https://api.deepseek.com`.

Do this:

1. Open [DeepSeek Platform](https://platform.deepseek.com/) and sign in or create an account.
2. Open **API Keys** in the console and choose **Create new secret key**. If the direct route is
   available after login, it is `https://platform.deepseek.com/api_keys`.
3. Copy the key immediately and store it in a password manager or deployment secret manager.
4. Open **Top Up/Billing**, add a deliberately small initial balance, and set any account spending
   protection available to you. DeepSeek returns HTTP 402 when the balance is exhausted.
5. In this repository, copy `.env.example` to `apps/web/.env.local` and set:

   ```dotenv
   DEEPSEEK_API_KEY=your_key_here
   JANUS_LLM_BASE_URL=https://api.deepseek.com
   JANUS_LLM_MODEL=deepseek-v4-flash
   JANUS_LLM_PROTOCOL=responses
   ```

6. For deployment, add the same values in the host's encrypted environment-variable settings.

Never paste the key into chat, a screenshot, browser-side JavaScript, `NEXT_PUBLIC_*`, or a tracked
file. If a key is pasted into chat, revoke it and create a replacement before use. The key must only
be read by server-side routes/jobs. Official references:
[first API call](https://api-docs.deepseek.com/),
[current model and pricing table](https://api-docs.deepseek.com/quick_start/pricing/), and
[error codes](https://api-docs.deepseek.com/quick_start/error_codes/).

## 6. Production embedding service: decision made

Use **Voyage AI `voyage-4-lite` at 1,024 dimensions** for the production corpus index. DeepSeek is
the reasoning/generation provider; it does not need to be the embedding provider. The choice is
appropriate for a compact English scientific corpus, is substantially cheaper than the larger
Voyage models, and keeps the embedding interface independent from the agent model.

Do this:

1. Create/sign in to a Voyage AI account.
2. Open the [Voyage API Keys dashboard](https://dashboard.voyageai.com/organization/api-keys).
3. Click **Create new secret key** and save it in the same password/secret manager as the DeepSeek
   key.
4. Add to `apps/web/.env.local` and to deployment secrets:

   ```dotenv
   EMBEDDING_PROVIDER=voyage
   VOYAGE_API_KEY=your_key_here
   VOYAGE_EMBEDDING_MODEL=voyage-4-lite
   ```

5. Do not send the key in chat or expose it to the browser.

The index contract will be `vector(1024)`, document embeddings generated with
`input_type=document`, query embeddings generated with `input_type=query`, cosine similarity, and
model/version recorded on every embedding row. Changing model or dimension requires a new index,
not an in-place mixture. Keyword/full-text retrieval remains available if Voyage is unavailable.

Official references: [API-key instructions](https://docs.voyageai.com/docs/api-key-and-installation),
[embedding API and dimensions](https://docs.voyageai.com/reference/embeddings-api), and
[current pricing](https://docs.voyageai.com/docs/pricing).

## Intake checklist

For every received research archive or permission:

- keep the untouched original;
- save the email or signed permission alongside it;
- record sender, received date, license, required attribution, and restrictions;
- generate SHA-256 checksums before normalization;
- never infer a license from “publicly downloadable”;
- never reconstruct missing numeric curves from a plotted image and label them as original data.
