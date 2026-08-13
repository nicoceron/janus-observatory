# Concordia comparison experiment

Status: optional research appendix, isolated from the Janus Observatory runtime.

This experiment asks a narrow question: can a recorded Concordia policy-council run produce
terminal dimensions that can be compared with a reviewed Janus scenario? It does not ask Concordia
to predict the future, assign probabilities to scenarios, or replace the authored Janus possibility
space.

The scaffold is intentionally outside `apps/`, `packages/domain`, and `data/canonical`. Nothing here
is loaded by Story, Observatory, or Atlas. A future `/research/concordia` page may consume reviewed
comparison artifacts, but raw model output must never enter canonical data.

## What is implemented

- A ten-job, seeded experiment matrix covering S1-S10.
- A bounded council of governance, resources, ecology, technology, population, and observer agents.
- A withheld-target protocol: agents receive only the reviewed morphology record from Table 5. The
  published population, energy-use, and growth-state endpoints from Table 9 are withheld until
  comparison.
- A live adapter for `gdm-concordia==2.4.0` and an OpenAI-compatible chat endpoint.
- Raw Concordia transcript capture with SHA-256 provenance.
- A strict `model_generated` run-record contract.
- A deterministic comparator that keeps population, annual energy use, and growth state separate.
  It never emits a composite similarity score or ranks scenarios.

Concordia's official repository describes its Entity/Component/Engine model and its requirement for
an LLM plus an embedder: <https://github.com/google-deepmind/concordia>. Version 2.4.0 is pinned to
the latest official release available when this scaffold was created:
<https://github.com/google-deepmind/concordia/releases/tag/v2.4.0>.

## Run the dependency-free checks

From the repository root:

```bash
uv run --project experiments/concordia --extra dev pytest experiments/concordia/tests
uv run --project experiments/concordia --extra dev ruff check experiments/concordia
```

Preview a job without installing Concordia or contacting a model provider:

```bash
uv run --project experiments/concordia \
  janus-concordia-run --scenario S4 --dry-run
```

The dry-run prints the exact source-derived prompt, seed, protocol version, agents, and withheld
comparison dimensions.

## Run Concordia

Install the optional runtime in this experiment's isolated environment:

```bash
uv sync --project experiments/concordia --extra concordia
```

Verify the pinned framework version and the two required Concordia prefabs without an API key or
network request:

```bash
uv run --project experiments/concordia --extra concordia janus-concordia-check
```

Configure an OpenAI-compatible chat endpoint. The defaults match the first-party DeepSeek base URL
and the model ID selected in the master plan; the key is never written into artifacts.

```bash
export CONCORDIA_API_KEY="..."
export CONCORDIA_API_BASE="https://api.deepseek.com"
export CONCORDIA_MODEL="deepseek-v4-flash"

uv run --project experiments/concordia --extra concordia \
  janus-concordia-run --scenario S4
```

The default output is ignored by Git under
`experiments/concordia/artifacts/runs/s4-4104/`:

```text
transcript.json  # raw Concordia structured log
run.json         # portable model_generated result plus hashes and limitations
```

The local seed fixes the configured job and local ordering. It does not promise byte-for-byte remote
LLM determinism. The run record therefore stores the model ID, framework version, protocol version,
prompt-input source/field allowlist, full prompt-configuration hash, transcript-file hash, and seed
so an attempted replay can be audited.

The bundled hash embedder is deterministic and dependency-light, but it only represents lexical
overlap. Replace it with a versioned semantic embedder before interpreting agent memory behavior as a
research result, and record that change as a new protocol version.

## Compare a completed run

```bash
uv run --project experiments/concordia janus-concordia \
  validate experiments/concordia/artifacts/runs/s4-4104/run.json

uv run --project experiments/concordia janus-concordia \
  compare experiments/concordia/artifacts/runs/s4-4104/run.json \
  --output experiments/concordia/artifacts/runs/s4-4104/comparison.json
```

The comparator reads the reviewed
`data/canonical/scenarios/growth-table-9.json` at execution time. Its comparison artifact preserves
the canonical source ID, `arXiv:2409.00067v3`, and the Table 9 locator. Canonical values remain
`reported`/`transcribed`; run values remain `model_generated`; arithmetic deltas remain `derived`.

## Interpretation limits

- This is a plumbing and experimental-design scaffold, not evidence that agents reproduce Janus.
- A categorical or numeric match does not validate either a scenario or a model.
- The label-only morphology context is intentionally sparse. Source-backed scenario briefs must be
  added as versioned experiment inputs before substantive evaluation.
- Agent outputs can be compared across seeds and model versions, but they cannot be interpreted as
  scenario probabilities.
- Missing numeric outputs remain `null`; the extractor is instructed not to invent them.
- No observatory detectability result is generated here. If a later run discusses non-detection, it
  must retain the rule that non-detection by one instrument is not evidence of no technology.

## Source and data versions

- Concordia: `gdm-concordia==2.4.0`, Apache-2.0.
- Janus morphology target: `janus.scenarios.morphology.tfsc-table-5`, source
  `JANUS-PAPER-01`, `arXiv:2409.00067v3`, Table 5, page 8.
- Janus comparison target: `janus.scenarios.growth.tfsc-table-9`, source `JANUS-PAPER-01`,
  `arXiv:2409.00067v3`, Table 9, page 18.

No media or third-party research assets are bundled by this experiment.
