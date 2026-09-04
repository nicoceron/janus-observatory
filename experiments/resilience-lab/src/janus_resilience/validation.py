"""Replication of the paper's Monte Carlo outcomes and tolerance-based validation.

For every scenario this module runs the independent reimplementation under the
published Table 5 perturbation scheme and compares ensemble aggregates against the
reported values transcribed in the canonical dataset (JANUS-PAPER-05). Two ensembles
are produced per scenario:

  - a 200-run batch seeded like the paper's documented generator seed, for direct
    comparability at the published ensemble size,
  - a large ensemble (default 20,000 replicates) whose Monte Carlo error is small
    enough to expose systematic semantic differences.

Tolerances cover residual ambiguity in yearly-step semantics plus Monte Carlo noise;
they are recorded in the report next to each verdict. A null reported value (the
paper shows it only in a figure) is validated only for qualitative consistency.
"""

from __future__ import annotations

import numpy as np

from .analytics import ensemble_expected_metrics
from .event_sim import simulate_events
from .params import (
    ReportedResults,
    ScenarioParams,
    load_anchors,
    load_reported,
    sample_perturbed,
)
from .reference_sim import ensemble_summary

PAPER_SEED = 12345

DUTY_TOL = 0.05
COUNT_TOL_ABS = 1.2
COUNT_TOL_REL = 0.25
FIRST_TOL_YEARS = 45.0
NEVER_TOL = 0.08


def _count_tol(target: float) -> float:
    return min(COUNT_TOL_ABS, COUNT_TOL_REL * target) if target > 0 else COUNT_TOL_ABS


def _verdict(diff: float, tol: float) -> str:
    if diff <= tol:
        return "pass"
    if diff <= 2.0 * tol:
        return "warn"
    return "fail"


def compare_metric(name: str, ours: float | None, target: float | None, tol: float | None) -> dict:
    if target is None or ours is None:
        return {"metric": name, "ours": ours, "reported": target, "verdict": "not_validated"}
    diff = abs(ours - target)
    effective_tol = tol if tol is not None else _count_tol(target)
    return {
        "metric": name,
        "ours": round(ours, 4),
        "reported": target,
        "absDiff": round(diff, 4),
        "tolerance": round(effective_tol, 4),
        "verdict": _verdict(diff, effective_tol),
    }


def validate_scenario(
    base: ScenarioParams,
    reported: ReportedResults,
    n_large: int = 20000,
    window: int = 1000,
) -> dict:
    seed_offset = PAPER_SEED + int(base.scenario_id[1:]) * 101
    large_rng = np.random.default_rng(seed_offset)
    draws = sample_perturbed(base, n_large, large_rng)
    large = simulate_events(draws, window=window, rng=large_rng)
    summary = ensemble_summary(large, window)

    paper_rng = np.random.default_rng(PAPER_SEED)
    paper_draws = sample_perturbed(base, 200, paper_rng)
    paper_batch = simulate_events(paper_draws, window=window, rng=paper_rng)
    batch_summary = ensemble_summary(paper_batch, window)

    analytic = ensemble_expected_metrics(draws, window)

    comparisons = [
        compare_metric(
            "fraction_never_collapsed",
            summary["fraction_never_collapsed"],
            reported.fraction_never_collapsed,
            NEVER_TOL if reported.precision != "exact_text" else 1e-9,
        ),
        compare_metric(
            "mean_duty_cycle",
            summary["mean_duty_cycle"],
            reported.mean_duty_cycle,
            DUTY_TOL if reported.precision != "exact_text" else 1e-9,
        ),
        compare_metric(
            "mean_time_to_first_collapse",
            summary["mean_time_to_first_collapse"],
            reported.mean_time_to_first_collapse_years,
            FIRST_TOL_YEARS if reported.precision != "exact_text" else 1e-6,
        ),
        compare_metric(
            "mean_collapse_count",
            summary["mean_collapse_count"],
            reported.mean_collapse_count,
            None,
        ),
    ]

    return {
        "scenarioId": base.scenario_id,
        "parameters": base.as_dict(),
        "largeEnsemble": {k: round(v, 5) for k, v in summary.items()},
        "paperSeedBatch200": {k: round(v, 5) for k, v in batch_summary.items()},
        "analyticEnsembleExpectation": {k: round(v, 5) for k, v in analytic.items()},
        "comparisons": comparisons,
        "worstVerdict": _worst_verdict(comparisons),
    }


_VERDICT_RANK = {"pass": 0, "warn": 1, "fail": 2}
_NOT_VALIDATED = 3


def _worst_verdict(comparisons: list[dict]) -> str:
    """Worst verdict among actually-validated comparisons; 'not_validated' only when
    nothing was validated."""
    ranks = [
        _VERDICT_RANK[c["verdict"]]
        for c in comparisons
        if c["verdict"] in _VERDICT_RANK
    ]
    if not ranks:
        return "not_validated"
    worst = max(ranks)
    return next(v for v, rank in _VERDICT_RANK.items() if rank == worst)


def run_replication(n_large: int = 20000, window: int = 1000) -> dict:
    anchors = load_anchors()
    reported = load_reported()
    scenarios = [
        validate_scenario(anchors[sid], reported[sid], n_large=n_large, window=window)
        for sid in sorted(anchors, key=lambda s: int(s[1:]))
    ]
    verdicts = [s["worstVerdict"] for s in scenarios]
    overall = "fail" if "fail" in verdicts else ("warn" if "warn" in verdicts else "pass")
    return {
        "experiment": "janus-resilience-lab replication",
        "overallVerdict": overall,
        "ensembleSizes": {"paperComparableBatch": 200, "large": n_large},
        "seeds": {
            "paperComparableBatch": PAPER_SEED,
            "largeEnsembleRule": "PAPER_SEED + scenario_number * 101",
            "largeEnsembleByScenario": {
                scenario_id: PAPER_SEED + int(scenario_id[1:]) * 101
                for scenario_id in sorted(anchors, key=lambda value: int(value[1:]))
            },
        },
        "toleranceRationale": (
            "Approximate-text targets tolerate Monte Carlo noise plus yearly-step "
            "semantic ambiguity; exact-text targets must match to numerical precision."
        ),
        "scenarios": scenarios,
    }
