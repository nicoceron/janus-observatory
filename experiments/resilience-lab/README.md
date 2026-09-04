# Janus Resilience Lab

Status: experiments-track research scaffold, isolated from the Janus Observatory runtime.

This experiment treats Project Janus's published collapse-recovery model the way a
scientific platform would: reimplement it independently from its equations, validate the
reimplementation against reported aggregates, then build upward - censoring-aware
survival analysis, global sensitivity analysis, a continuous-parameter dataset,
surrogate benchmarking under grouped holdouts, and technosignature persistence math -
while keeping every number traceable to reviewed sources.

The ten scenarios are self-consistent possibilities, not forecasts. Nothing here ranks
scenarios, assigns them probabilities, or implies they are equally likely. Every metric
describes the behavior of the published model under stated assumptions.

## What is implemented

### Layer 0 - Three mutually validating representations of one model

| Representation | File | Cost | Role |
| --- | --- | --- | --- |
| Exact renewal recursions | `src/janus_resilience/analytics.py` | O(window) | Analytic baseline; no Monte Carlo noise |
| Year-by-year simulator | `src/janus_resilience/reference_sim.py` | O(window) per run | Literal transcription of paper Eqs. (1)-(3) |
| Event-driven sampler | `src/janus_resilience/event_sim.py` | O(events) per run | Scalability layer for datasets |

The model follows JANUS-PAPER-05 (`arXiv:2604.13774v1`, CC BY 4.0): linear technology
growth, constant resource depletion, Bernoulli existential hazard during active years,
collapse fraction cf, recovery delay rd, resource restoration to rf x R0, duty cycle =
fraction of active years, and the paper-style truncated mean for first-collapse time.
Step semantics fixed by ADR-0001 include hazard-before-resource tie-breaking, immediate
recovery at rd=0, and permanent extinction when rf x R0 = 0.

Validation performed by the test suite:

- Both simulators match the EXACT first-collapse distribution (continuous-part KS <
  0.02 across three parameter regimes plus binned chi-square including the terminal
  atom; naive whole-distribution KS fails against mixed distributions with large atoms,
  which was itself a useful lesson).
- Ensemble means of both simulators agree within 2% on perturbed ensembles.
- Replication against every numeric value the paper reports in prose passes; see
  `reports/replication-report.json`. Highlights: S4 duty cycle 0.3819 vs reported 0.381;
  S9 0.9112 vs ~0.91; S8 collapse count 1.95 vs ~2; S3/S10 exact.

### Layer 1 - Survival analysis (`survival.py`, `reports/survival-report.json`)

Kaplan-Meier curves, Nelson-Aalen cumulative hazard, Aalen-Johansen cause-specific
cumulative incidence separating resource-depletion collapses from exogenous-hazard
collapses, restricted mean collapse-free time. Never-collapsed runs are right-censored
at year 1000 instead of being folded into a truncated mean.

### Layer 2 - Global sensitivity (`sensitivity.py`, `reports/sensitivity-report.json`)

Sobol first-order and total-order indices (Saltelli construction on independent uniform
designs, replicated for Monte Carlo standard errors) and Morris elementary effects in
unit-cube coordinates, evaluated both on the exact analytic expectations and on the
event-driven simulator under common random numbers. Structural confirmations:

- cf has exactly zero effect on every timing outcome - the paper's stated reason for
  omitting cf reappears here as an exact zero, not an approximation.
- r has exactly zero effect for the same structural reason.
- Recovery delay rd and hazard h dominate total-order variance for the duty cycle;
  hazard dominates expected collapse count.
- Analytic and CRN-simulated index estimates agree within their standard errors.

### Layer 3 - Level-2 continuous-parameter dataset (`dataset.py`, `reports/dataset-summary.json`)

65,536 runs (8,192 design points x 8 seeds) over the seven-dimensional space bounded by
the paper's own ranges (Table 6 sweep bounds joined with anchor envelopes), sampled with
a scrambled Sobol sequence. Each run keeps its parameters, seed, outcomes, cause of
first collapse, regime label, and duty tier. Per-point replicate structure separates
stochastic seed noise from parameter response. See `DATASET_CARD.md`.

### Layer 4 - Surrogate benchmark (`surrogate.py`, `reports/surrogate-benchmark.json`)

Candidates: the exact analytic baseline, quadratic ridge, histogram gradient boosting,
and an RBF Gaussian process (the latter two need the `ml` extra). Evaluation protocols
get progressively harder: point-grouped random split; a contiguous region block held out
(delta >= 1.8 and rf <= 0.375); and leave-one-anchor-out folds that exclude everything
within a normalized radius of each in-domain scenario anchor. Split-conformal bands are
calibrated per fold and their empirical coverage is reported.

Headline result (duty-cycle target, point-level R2):

| Protocol | Analytic | HistGBT | Ridge | GP |
| --- | --- | --- | --- | --- |
| random | 0.954 | 0.937 | 0.772 | -0.001 |
| region_block | 0.975 | 0.905 | 0.584 | -0.363 |
| anchor_out (7 folds) | 0.932 | 0.872 | -2.295 | -7.863 |

The honest finding is the point: the analytic baseline wins everywhere, learned models
degrade under distribution shift while the exact model does not, and conformal coverage
erodes under shift (e.g., GP 0.662 at nominal 0.90 in the region block). Any claim that
a learned surrogate 'beats' this simulator must be demonstrated against these protocols,
not a random split.

### Layer 5 - Technosignature persistence (`persistence.py`, `reports/persistence-report.json`)

Paper Eq. (7), p_i = {Dc + min[Ti/Tspan, 1-Dc]} delta_i, computed with lifetimes from
the paper's prose (CFC-11 55 yr, CFC-12 140 yr, CF4 about 50 kyr, NO2 hours-days) and
presence flags DERIVED from the reviewed canonical detection matrix
(`data/canonical/observability/figure-6.json`). CF4 presence stays explicitly
`not_evaluated` rather than guessed. Probabilities are computed twice: once from this
experiment's reimplemented duty cycles (`reimplemented`) and once from canonical
reported duty cycles (`reported`).

### Adjacent data - NASA Exoplanet Archive snapshot

`scripts/fetch_stellar_context.py` pulls confirmed planet-host stars within 15 pc in the
solar temperature range (5300-6000 K) via the Archive TAP service into
`data/generated/nasa/`, with query text, retrieval timestamp, row count, and the
required acknowledgment in `snapshot.json`. This is contextual input for future
observer-side work; failure offline degrades gracefully.

## Run it

```bash
uv sync --project experiments/resilience-lab --extra dev --extra ml

uv run --project experiments/resilience-lab pytest experiments/resilience-lab/tests
uv run --project experiments/resilience-lab ruff check experiments/resilience-lab

uv run --project experiments/resilience-lab janus-resilience replicate      # replication + validation report
uv run --project experiments/resilience-lab janus-resilience verify         # exact seeded replay gate
uv run --project experiments/resilience-lab janus-resilience survival       # KM / Aalen-Johansen report
uv run --project experiments/resilience-lab janus-resilience sensitivity    # Sobol + Morris report
uv run --project experiments/resilience-lab janus-resilience dataset        # 65,536-run Level-2 dataset
uv run --project experiments/resilience-lab janus-resilience surrogate      # holdout benchmark report
uv run --project experiments/resilience-lab janus-resilience persistence    # Eq. 7 probabilities report
uv run --project experiments/resilience-lab janus-resilience figures        # render PNG figures
uv run --project experiments/resilience-lab janus-resilience report         # build the LaTeX/PDF report

uv run --project experiments/resilience-lab python \
  experiments/resilience-lab/scripts/fetch_stellar_context.py               # optional NASA snapshot
```

Reports land in `experiments/reports/...` relative to this directory
(`experiments/resilience-lab/reports/`); generated data lands under
`experiments/resilience-lab/data/generated/` and is git-ignored.

`janus-resilience verify` does not trust the committed report's verdict. It reruns the
20,000-member seeded ensemble for every scenario, compares the deterministic scientific payload
exactly, and requires a SHA-256 manifest of the implementation source, dependency lock, ADR, and
canonical collapse input. The Git commit is retained only as environmental provenance because a
dirty or untracked experiment tree cannot be identified by a commit alone. The replay is offline:
it uses the locked local environment and makes no provider, API, or source-download calls.

## The one file to read

**`reports/latex/janus-resilience-lab.pdf`** - a 12-page scientific report compiled by
`janus-resilience report`. Every table in it is generated directly from the committed
JSON artifacts (never hand-transcribed), every figure is re-rendered from seeded
ensembles, and the appendix lists the exact commands that reproduce each number. The
`.tex` source sits next to it and builds anywhere (tectonic, TeX Live, Overleaf).

## Figures

`janus-resilience figures` renders PNGs into `reports/figures/` from the committed
reports and seeded ensembles:

| File | What it shows |
| --- | --- |
| `fig-trajectories.png` | Ensemble T(t) and R(t) for all ten scenarios - the paper's Figure 1 pattern reproduced independently |
| `fig-replication.png` | Reimplementation vs reported aggregates on the identity line, with validation tolerances |
| `fig-survival.png` | Kaplan-Meier collapse-free survival per scenario; Aalen-Johansen cause-specific incidence |
| `fig-duty-distributions.png` | Run-level duty-cycle distributions per scenario |
| `fig-sensitivity.png` | Sobol total-order indices with standard errors (analytic vs CRN-simulated); Morris mu* ranking |
| `fig-regime-boundary.png` | Exact expected oscillation count across the rf-delta plane at S8 settings (paper Fig. 2 analog) |
| `fig-dataset-map.png` | Level-2 design space: expected duty cycle per point over the delta-rf plane with anchors |
| `fig-surrogate.png` | Benchmark degradation under random / region-block / anchor-out holdouts; conformal coverage erosion |
| `fig-persistence.png` | Eq. 7 observation probabilities by scenario and signature lifetime |

## Provenance and rights

- Model equations, parameters, uncertainty scheme, sweep bounds, and persistence
  equation: JANUS-PAPER-05, `arXiv:2604.13774v1`, CC BY 4.0, loaded at runtime from
  `data/canonical/collapse/model-and-reported-results.json`.
- Presence flags: derived from `data/canonical/observability/figure-6.json`
  (JANUS-PAPER-03, CC BY 4.0).
- The author-hosted `technocycles` repository is public but unlicensed. It is cited,
  not copied: this reimplementation was written from the paper's equations alone, and
  its agreement with reported aggregates stands on its own validation.
- NASA Exoplanet Archive data carries the acknowledgment written into its snapshot.
- No scenario probability, ranking, or forecast is produced anywhere in this pipeline.

## Known limitations

- Yearly-step semantics involve small ambiguities the paper does not fully pin down
  (same-step tie-breaking, whether the collapse year itself counts as active); choices
  are recorded in ADR-0001 and covered by validation tolerances.
- The paper's Table 5 distribution parameters are interpreted as standard deviations
  (normal) and symmetric triangular supports around modes; clamping to [0,1] is ours.
- S5's never-collapsed fraction reproduces to 0.61 vs the reported ~0.66; with the
  analytic value pinned at 0.9995^1000 = 0.6066, the residual gap is consistent with
  200-run Monte Carlo noise or unstated semantic detail.
- First-order Sobol indices carry wide standard errors because the product estimator is
  heavy-tailed; total-order indices are the stable ranking. Standard errors are printed
  next to every estimate.
- Leave-one-anchor-out folds exclude S3 and S10 because their delta = 0 sits outside
  the continuous design space, which deliberately starts at the Table 6 low bound.

## Roadmap pointers

Natural extensions, deliberately out of scope here: robust intervention optimization
over policy levers, partial-trajectory early-warning forecasting with strict temporal
cutoffs, coupling duty cycles to atmospheric trajectories and instrument noise, and
simulation-based inference over hidden parameters from synthetic observations.
