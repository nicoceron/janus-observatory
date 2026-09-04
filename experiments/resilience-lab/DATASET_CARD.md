# Dataset Card: janus-resilience-level2

Version: jrl-dataset-1.0.0
Generator: `janus_resilience.dataset.generate_dataset` (event-driven simulator)
Manifest: `reports/dataset-summary.json` (records sha256, shape, config, environment)

## Motivation

The ten published scenarios are named anchor points in a continuous parameter space,
not a conventional ML dataset. Training or evaluating models on ten rows is
meaningless; training them on millions of yearly states treats non-independent
observations as samples. This dataset occupies the middle rung: tens of thousands of
independent runs over the full seven-dimensional space, with replicate structure that
keeps stochastic noise separable from parameter response.

## Composition

- 8,192 design points x 8 seeds = 65,536 runs; window 1,000 years each.
- Sampling: `scipy.stats.qmc.Sobol` (scrambled) over the bounds below.
- Simulator: event-driven sampler, distributionally equivalent to the year-by-year
  reference implementation (see tests and ADR-0001).
- Per row: run/point/replicate/seed identifiers, seven parameters, duty cycle, first
  collapse year (0 when censored), censoring flag, first-collapse cause, collapse
  count, regime label (`stable`, `single_collapse`, `recurrent`), duty tier.

## Design space and its provenance

| Parameter | Range | Source of bounds |
| --- | --- | --- |
| r | [0.0001, 0.006] | anchor growth rates (scenario-modeling paper Table 9 values) |
| R0 | [400, 2700] | anchor resource stocks |
| delta | [0.1, 2.5] | collapse paper Table 6 sweep bounds |
| cf | [0.2, 1.0] | Table 6 joined with governance ranges (Table 2) |
| rd | [0, 100] | Table 6 sweep bound; lower end from Rule-by-All range |
| rf | [0.1, 1.0] | Table 6 low bound to full-recovery upper end |
| h | [0.0, 0.005] | Table 6 sweep bounds |

Parameters are exact per row: unlike the paper's replication runs there is no
perturbation layer here, so the dataset measures the deterministic-in-parameters,
stochastic-in-hazard response surface.

## Summary statistics (this version)

Mean duty cycle 0.868 (sd 0.120); mean collapse count 2.93; never-collapsed fraction
0.117; cause shares among collapsed runs 85% hazard / 15% resource; regime counts:
47,492 recurrent, 10,375 single-collapse, 7,669 stable; mean within-point seed noise
(sd across replicates) 0.052 duty-cycle units against a between-point spread of 0.104.

## Known gaps

- delta = 0 (the S3/S10 anchor value) has measure zero under continuous sampling;
  those anchors live on the boundary outside this design space.
- Causes are recorded for the FIRST collapse only.
- Technology trajectories are not stored; timing outcomes only.

## Intended uses

- Surrogate emulation benchmarks with grouped holdouts.
- Global sensitivity analysis and regime-boundary studies.
- Teaching example for seed-noise separation and analytic-baseline comparison.

## Non-uses

- Nothing in this dataset is a probability of any real-world outcome.
- Rows must not be treated as independent civilizations; they are draws from one model.
- Do not mix rows from different dataset versions without recording versions.
