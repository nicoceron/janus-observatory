"""Scenario parameters, canonical anchor loading, and Monte Carlo perturbation sampling.

The ten scenario anchor parameter sets are loaded at runtime from the reviewed canonical
transcription of JANUS-PAPER-05 (arXiv:2604.13774v1, CC BY 4.0), Table 4. Nothing in this
package hard-codes scientific values; all reported targets used for validation come from
the same canonical file.

Monte Carlo perturbations follow the published uncertainty scheme (Table 5 of the same
paper): R0 and delta normal with standard deviation 5% of the mean, cf and rf triangular
spanning +/-5% of the mode, rd normal with a 10-year standard deviation, and r and h held
fixed per run batch. The paper does not state how bounded fractions behave under
perturbation near their limits; triangular supports are clamped to [0, 1] here as an
explicit implementation choice recorded in ADR-0001.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

PARAM_ORDER = ("r", "R0", "delta", "cf", "rd", "rf", "h")
PARAM_NAMES = {
    "r": "technological growth rate",
    "R0": "initial resource stock",
    "delta": "resource depletion rate",
    "cf": "collapse survival fraction",
    "rd": "recovery delay",
    "rf": "recovery fraction",
    "h": "existential hazard rate",
}


@dataclass(frozen=True)
class ScenarioParams:
    scenario_id: str
    r: float
    R0: float
    delta: float
    cf: float
    rd: int
    rf: float
    h: float

    def as_dict(self) -> dict[str, float | int | str]:
        return {
            "scenarioId": self.scenario_id,
            **{name: getattr(self, name) for name in PARAM_ORDER},
        }


@dataclass(frozen=True)
class ReportedResults:
    fraction_never_collapsed: float | None
    mean_duty_cycle: float | None
    mean_time_to_first_collapse_years: float | None
    mean_collapse_count: float | None
    precision: str
    summary: str


def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def canonical_path() -> Path:
    return repo_root() / "data" / "canonical" / "collapse" / "model-and-reported-results.json"


def load_canonical() -> dict:
    with canonical_path().open(encoding="utf-8") as handle:
        return json.load(handle)


def load_anchors() -> dict[str, ScenarioParams]:
    anchors: dict[str, ScenarioParams] = {}
    for entry in load_canonical()["scenarios"]:
        p = entry["parameters"]
        anchors[entry["scenarioId"]] = ScenarioParams(
            scenario_id=entry["scenarioId"],
            r=float(p["r"]),
            R0=float(p["R0"]),
            delta=float(p["delta"]),
            cf=float(p["cf"]),
            rd=int(p["rd"]),
            rf=float(p["rf"]),
            h=float(p["h"]),
        )
    return anchors


def load_reported() -> dict[str, ReportedResults]:
    reported: dict[str, ReportedResults] = {}
    for entry in load_canonical()["scenarios"]:
        res = entry["reportedResults"]
        reported[entry["scenarioId"]] = ReportedResults(
            fraction_never_collapsed=res.get("fractionNeverCollapsed"),
            mean_duty_cycle=res.get("meanDutyCycle"),
            mean_time_to_first_collapse_years=res.get("meanTimeToFirstCollapseYears"),
            mean_collapse_count=res.get("meanCollapseCount"),
            precision=res["precision"],
            summary=res["summary"],
        )
    return reported


def canonical_source_ref() -> dict:
    data = load_canonical()
    return {
        "sourceId": data["source"]["sourceId"],
        "sourceVersion": data["source"]["sourceVersion"],
        "locator": data["source"]["locator"],
        "license": data["sourceLicense"],
    }


def _triangular(center: float, spread: float, n_runs: int, rng: np.random.Generator) -> np.ndarray:
    lo = max(0.0, center - spread)
    hi = min(1.0, center + spread)
    if hi <= lo:
        return np.full(n_runs, lo)
    mode = min(max(center, lo), hi)
    return rng.triangular(lo, mode, hi, size=n_runs)


def sample_perturbed(
    base: ScenarioParams, n_runs: int, rng: np.random.Generator
) -> dict[str, np.ndarray]:
    """Draw one perturbed parameter set per replicate following the paper's Table 5."""
    R0 = rng.normal(base.R0, 0.05 * base.R0, size=n_runs)
    if base.delta > 0:
        delta = np.clip(rng.normal(base.delta, 0.05 * base.delta, size=n_runs), 0.0, None)
    else:
        delta = np.zeros(n_runs)
    cf = _triangular(min(base.cf, 1.0), 0.05 * base.cf, n_runs, rng)
    rf = _triangular(min(base.rf, 1.0), 0.05 * base.rf, n_runs, rng)
    rd = np.maximum(0, np.round(rng.normal(base.rd, 10.0, size=n_runs))).astype(np.int64)
    return {
        "r": np.full(n_runs, base.r),
        "R0": R0,
        "delta": delta,
        "cf": cf,
        "rd": rd,
        "rf": rf,
        "h": np.full(n_runs, base.h),
    }
