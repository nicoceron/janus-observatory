"""Level-2 continuous-parameter dataset generation.

The published ten scenarios are treated as named anchor points in a continuous seven-
dimensional parameter space, never as the only training inputs and never as equally
likely cases. This module samples that space with a scrambled Sobol sequence over
bounds assembled from the paper's own ranges:

  - r in [0.0001, 0.006]: anchor growth rates from the scenario-modeling paper,
  - R0 in [400, 2700]: anchor resource stocks,
  - delta in [0.1, 2.5] and h in [0, 0.005]: the collapse paper's Table 6 sweep bounds,
  - rd in [0, 100], rf in [0.1, 1.0], cf in [0.2, 1.0]: Table 6 bounds joined with the
    Table 2 governance ranges (Rule by All reaches rd=0 and rf=1).

Each design point is replicated with independent seeds so stochastic run-to-run noise
can be separated from parameter response. Runs are executed by the event-driven
simulator, whose distributional equivalence to the reference simulator is asserted by
the test suite.
"""

from __future__ import annotations

import csv
import gzip
import hashlib
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy.stats import qmc

from .event_sim import simulate_events

DESIGN_SPACE = {
    "r": (0.0001, 0.006),
    "R0": (400.0, 2700.0),
    "delta": (0.1, 2.5),
    "cf": (0.2, 1.0),
    "rd": (0.0, 100.0),
    "rf": (0.1, 1.0),
    "h": (0.0, 0.005),
}
PARAM_ORDER = ("r", "R0", "delta", "cf", "rd", "rf", "h")

DATASET_VERSION = "jrl-dataset-1.0.0"
SIMULATOR_VERSION = "janus-resilience event-driven 0.1.0"


def classify_regime(n_collapses: int, first_collapse_year: int, censored: bool) -> str:
    """Categorical dynamics label; labels describe simulated dynamics, not likelihoods."""
    if censored:
        return "stable"
    if n_collapses == 1:
        return "single_collapse"
    return "recurrent"


def duty_tier(duty_cycle: float) -> str:
    if duty_cycle >= 0.9:
        return "high"
    if duty_cycle >= 0.5:
        return "moderate"
    return "low"


@dataclass(frozen=True)
class DatasetConfig:
    n_design_points: int = 8192
    replicates_per_point: int = 8
    window: int = 1000
    base_seed: int = 20260821


DEFAULT_DATASET_CONFIG = DatasetConfig()


def generate_dataset(
    config: DatasetConfig | None = None,
) -> tuple[list[str], list[list], dict]:
    config = config or DEFAULT_DATASET_CONFIG
    lows = np.array([DESIGN_SPACE[name][0] for name in PARAM_ORDER])
    highs = np.array([DESIGN_SPACE[name][1] for name in PARAM_ORDER])

    sampler = qmc.Sobol(d=len(PARAM_ORDER), scramble=True, seed=config.base_seed)
    unit = sampler.random(config.n_design_points)
    params_unit = lows + unit * (highs - lows)

    rows: list[list] = []
    total_runs = config.n_design_points * config.replicates_per_point
    batch_params: dict[str, list] = {name: [] for name in PARAM_ORDER}
    meta_cols: list[tuple[int, int, int]] = []

    for point_id in range(config.n_design_points):
        for rep in range(config.replicates_per_point):
            for j, name in enumerate(PARAM_ORDER):
                value = params_unit[point_id, j]
                batch_params[name].append(int(round(value)) if name == "rd" else float(value))
            seed = config.base_seed + 1_000_003 * point_id + rep
            meta_cols.append((point_id, rep, seed))

    arrays = {k: np.asarray(v) for k, v in batch_params.items()}
    outcomes = simulate_events(arrays, window=config.window, seed=config.base_seed)

    for i, (point_id, rep, seed) in enumerate(meta_cols):
        censored = bool(outcomes.censored[i])
        first = int(outcomes.first_collapse_year[i])
        n_col = int(outcomes.n_collapses[i])
        duty = float(outcomes.duty_cycle[i])
        rows.append(
            [
                i,
                point_id,
                rep,
                seed,
                *(float(arrays[name][i]) for name in PARAM_ORDER),
                round(duty, 6),
                first if not censored else 0,
                int(censored),
                str(outcomes.first_cause[i]) if not censored else "",
                n_col,
                classify_regime(n_col, first, censored),
                duty_tier(duty),
            ]
        )

    header = [
        "run_id",
        "point_id",
        "replicate",
        "seed",
        *PARAM_ORDER,
        "duty_cycle",
        "first_collapse_year",
        "censored",
        "cause_first",
        "n_collapses",
        "regime",
        "duty_tier",
    ]
    manifest = {
        "datasetVersion": DATASET_VERSION,
        "simulatorVersion": SIMULATOR_VERSION,
        "windowYears": config.window,
        "designPoints": config.n_design_points,
        "replicatesPerPoint": config.replicates_per_point,
        "totalRuns": total_runs,
        "baseSeed": config.base_seed,
        "sampling": "scipy.stats.qmc.Sobol, scrambled",
        "designSpace": {name: list(DESIGN_SPACE[name]) for name in PARAM_ORDER},
        "columns": header,
    }
    return header, rows, manifest


def write_dataset_gzip(path: Path, header: list[str], rows: list[list]) -> str:
    with gzip.open(path, "wt", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)
    return hashlib.sha256(path.read_bytes()).hexdigest()


def summarize_dataset(rows: list[list]) -> dict:
    idx = {name: i for i, name in enumerate(
        ["run_id", "point_id", "replicate", "seed", *PARAM_ORDER, "duty_cycle",
         "first_collapse_year", "censored", "cause_first", "n_collapses", "regime", "duty_tier"]
    )}
    duty = np.array([row[idx["duty_cycle"]] for row in rows])
    ncol = np.array([row[idx["n_collapses"]] for row in rows])
    cens = np.array([row[idx["censored"]] for row in rows])
    causes = [row[idx["cause_first"]] for row in rows if row[idx["cause_first"]]]
    regimes = {}
    for row in rows:
        regimes[row[idx["regime"]]] = regimes.get(row[idx["regime"]], 0) + 1

    by_point: dict[int, list[float]] = {}
    for row in rows:
        by_point.setdefault(row[idx["point_id"]], []).append(row[idx["duty_cycle"]])
    point_means = np.array([np.mean(v) for v in by_point.values()])
    seed_noise = np.array([np.std(v, ddof=1) for v in by_point.values()])

    return {
        "runs": len(rows),
        "meanDutyCycle": round(float(duty.mean()), 6),
        "stdDutyCycle": round(float(duty.std(ddof=1)), 6),
        "meanCollapseCount": round(float(ncol.mean()), 4),
        "fractionNeverCollapsed": round(float(cens.mean()), 5),
        "causeShares": {
            "resource": round(causes.count("resource") / max(len(causes), 1), 5),
            "hazard": round(causes.count("hazard") / max(len(causes), 1), 5),
        },
        "regimeCounts": regimes,
        "perPointSeedNoiseStd": round(float(seed_noise.mean()), 6),
        "pointMeanDutyStd": round(float(point_means.std(ddof=1)), 6),
    }
