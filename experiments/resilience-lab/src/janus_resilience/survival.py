"""Censoring-aware survival analysis for collapse timing.

The paper reports mean time to first collapse using the full 1000-year span for runs
that never collapse, which conflates 'collapsed late' with 'never collapsed'. This
module provides the standard right-censoring-aware alternatives:

  - Kaplan-Meier survival curves for time-to-first-collapse,
  - Nelson-Aalen cumulative hazard,
  - Aalen-Johansen cause-specific cumulative incidence for the two competing
    collapse causes (resource depletion vs exogenous hazard),

implemented directly on the integer-year grid so results are reproducible without a
heavy dependency.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class KaplanMeier:
    times: np.ndarray
    survival: np.ndarray


@dataclass(frozen=True)
class CumulativeIncidence:
    times: np.ndarray
    cif_resource: np.ndarray
    cif_hazard: np.ndarray
    km_survival: np.ndarray


def kaplan_meier(time: np.ndarray, event: np.ndarray) -> KaplanMeier:
    """Right-censored KM estimate; event[i]=1 marks an observed first collapse."""
    time = np.asarray(time)
    event = np.asarray(event, dtype=bool)
    times = np.unique(time[event]) if event.any() else np.empty(0, dtype=time.dtype)
    survival = np.ones(times.size + 1)
    for i, t in enumerate(times):
        at_risk = int((time >= t).sum())
        deaths = int(((time == t) & event).sum())
        survival[i + 1] = survival[i] * (1.0 - deaths / at_risk)
    return KaplanMeier(times=np.concatenate(([0], times)), survival=survival)


def nelson_aalen(time: np.ndarray, event: np.ndarray) -> np.ndarray:
    """Cumulative hazard on the KM event grid, prefixed with 0."""
    time = np.asarray(time)
    event = np.asarray(event, dtype=bool)
    grid = np.unique(time[event])
    cum = np.zeros(grid.size + 1)
    for i, t in enumerate(grid):
        at_risk = int((time >= t).sum())
        deaths = int(((time == t) & event).sum())
        cum[i + 1] = cum[i] + deaths / at_risk
    return cum


def aalen_johansen(
    time: np.ndarray,
    event: np.ndarray,
    cause: np.ndarray,
) -> CumulativeIncidence:
    """Cause-specific cumulative incidence for causes 'resource' and 'hazard'.

    Runs with event=False are right-censored (no collapse inside the window) and
    contribute to neither incidence curve beyond their observation time.
    """
    time = np.asarray(time)
    event = np.asarray(event, dtype=bool)
    cause = np.asarray(cause)
    event_times = np.unique(time[event])
    times = np.concatenate(([0], event_times)).astype(float)
    cif_resource = np.zeros(times.size)
    cif_hazard = np.zeros(times.size)
    km = np.ones(times.size)

    for i, t in enumerate(event_times, start=1):
        at_risk = int((time >= t).sum())
        deaths_total = int(((time == t) & event).sum())
        d_res = int(((time == t) & event & (cause == "resource")).sum())
        d_haz = int(((time == t) & event & (cause == "hazard")).sum())
        km_prev = km[i - 1]
        km[i] = km_prev * (1.0 - deaths_total / at_risk)
        cif_resource[i] = cif_resource[i - 1] + km_prev * d_res / at_risk
        cif_hazard[i] = cif_hazard[i - 1] + km_prev * d_haz / at_risk

    return CumulativeIncidence(
        times=times,
        cif_resource=cif_resource,
        cif_hazard=cif_hazard,
        km_survival=km,
    )


def cif_at(cif: CumulativeIncidence, horizons: list[int]) -> dict[int, float]:
    out: dict[int, float] = {}
    total = cif.cif_resource + cif.cif_hazard
    for h in horizons:
        idx = int(np.searchsorted(cif.times, h, side="right")) - 1
        out[h] = float(total[max(idx, 0)])
    return out


def restricted_mean_survival_time(km: KaplanMeier, horizon: int) -> float:
    """Area under the KM STEP curve up to the horizon: expected collapse-free years."""
    t = np.minimum(km.times.astype(float), horizon)
    s = km.survival.astype(float)
    if t[-1] < horizon:
        t = np.concatenate((t, [float(horizon)]))
        s = np.concatenate((s, [s[-1]]))
    widths = np.diff(t)
    return float(np.sum(s[:-1] * widths))
