# Model Card: janus-resilience surrogate suite

Version: 0.1.0
Benchmark artifact: `reports/surrogate-benchmark.json`
Training data: `DATASET_CARD.md` (jrl-dataset-1.0.0)

## What is being compared

This is not a single model but a benchmark that pits learned surrogates against the
model's own exact expectation structure:

1. `analytic_renewal` - the exact discrete renewal recursions of the published
   dynamics (no training; evaluated at query parameters).
2. `ridge_quadratic` - closed-form ridge on unit-normalized features plus quadratic
   terms (NumPy only).
3. `hist_gradient_boosting` - scikit-learn HistGradientBoostingRegressor.
4. `gaussian_process_rbf` - RBF + white-noise GP on a 3,000-run subsample.

Targets: duty cycle (primary) and collapse count, both fully observed within the
window. Censored first-collapse timing is deliberately NOT regressed naively; it is
handled by survival analysis elsewhere in this experiment.

## Protocols

- `random`: 75/25 split grouped by design point (replicates never straddle splits).
- `region_block`: contiguous sub-box delta >= 1.8 and rf <= 0.375 held out entirely.
- `anchor_out`: for each in-domain scenario anchor, all runs within normalized radius
  0.45 held out (7 folds; S3/S10 anchors sit outside the design space).

Split-conformal bands (90% nominal) are calibrated per fold on a 25% carve-out of
training data; empirical coverage and mean width are reported next to every score.

## Measured behavior (duty cycle, point-level R2)

| Protocol | Analytic | HistGBT | Ridge | GP |
| --- | --- | --- | --- | --- |
| random | 0.954 | 0.937 | 0.772 | -0.001 |
| region_block | 0.975 | 0.905 | 0.584 | -0.363 |
| anchor_out | 0.932 | 0.872 | -2.295 | -7.863 |

Conformal coverage at nominal 90% falls to 0.66-0.87 under shift for the learned
models while the analytic baseline stays near nominal because its residuals are
irreducible seed noise rather than model error.

## Intended interpretation

- The analytic baseline is the reference any learned surrogate must beat, under these
  protocols, before it earns complexity.
- Learned-model degradation under grouped holdouts is the expected signature of fitting
  the simulator's smooth structure without knowing its mechanism.
- Coverage erosion quantifies how far conformal guarantees can be trusted under shift.

## Limitations

- Single dataset version, one window length, no perturbation layer.
- GP is subsampled and its kernel was not exhaustively tuned; its numbers bound naive
  GP use rather than best-possible GP performance.
- No early-warning or partial-trajectory forecasting task yet.
