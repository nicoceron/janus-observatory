"""Reference year-by-year simulator implementing published Equations (1)-(3).

This is the direct transcription of the model as stated in JANUS-PAPER-05 section 3.1,
vectorized across independent replicates with NumPy. It is intentionally literal: every
year performs the full state update so that trajectories can be inspected directly.

Step semantics fixed here and in ADR-0001:

  - A step is active iff the system is outside recovery delay and holds resources.
  - Active steps grow technology by r and deplete resources by delta.
  - A per-step uniform deviate below h triggers a hazard collapse regardless of
    resource level; otherwise R <= 0 after depletion triggers a resource collapse.
  - A collapse multiplies technology by cf, zeroes resources, starts rd dormant years,
    and restores rf * R0 once the delay elapses; activity resumes the next year.
  - The collapse year itself counts as an active year.
  - Hazard deviates are drawn for every replicate each step so results depend on the
    seed alone, never on vectorization details.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class RunOutcomes:
    duty_cycle: np.ndarray
    first_collapse_year: np.ndarray
    first_cause: np.ndarray
    n_collapses: np.ndarray
    censored: np.ndarray
    final_technology: np.ndarray
    trajectories_T: np.ndarray | None
    trajectories_R: np.ndarray | None


def simulate_reference(
    params: dict[str, np.ndarray],
    window: int = 1000,
    seed: int | None = None,
    rng: np.random.Generator | None = None,
    record_trajectories: bool = False,
) -> RunOutcomes:
    if rng is None:
        rng = np.random.default_rng(seed)

    r = np.asarray(params["r"], dtype=float)
    R0 = np.asarray(params["R0"], dtype=float)
    delta = np.asarray(params["delta"], dtype=float)
    cf = np.asarray(params["cf"], dtype=float)
    rd = np.asarray(params["rd"], dtype=np.int64)
    rf = np.asarray(params["rf"], dtype=float)
    h = np.asarray(params["h"], dtype=float)

    n = R0.size
    if np.any(R0 <= 0):
        raise ValueError("R0 must be positive for every replicate")

    tech = np.ones(n)
    stock = R0.copy()
    countdown = np.zeros(n, dtype=np.int64)
    active_years = np.zeros(n, dtype=np.int64)
    n_collapses = np.zeros(n, dtype=np.int64)
    first_collapse = np.zeros(n, dtype=np.int64)
    first_cause = np.full(n, "", dtype="<U8")
    last_cause = np.full(n, "", dtype="<U8")

    traj_t = np.zeros((n, window)) if record_trajectories else None
    traj_r = np.zeros((n, window)) if record_trajectories else None

    for step in range(1, window + 1):
        active = (countdown == 0) & (stock > 0)

        tech = np.where(active, tech + r, tech)
        stock = np.where(active, stock - delta, stock)

        draws = rng.random(n)
        hazard_hit = active & (draws < h)
        depleted = active & ~hazard_hit & (stock <= 0)
        collapsed = hazard_hit | depleted

        active_years += active

        new_collapse = collapsed & (first_collapse == 0)
        first_collapse = np.where(new_collapse, step, first_collapse)
        cause_now = np.where(hazard_hit, "hazard", "resource")
        first_cause = np.where(new_collapse, cause_now, first_cause)
        last_cause = np.where(collapsed, cause_now, last_cause)

        tech = np.where(collapsed, cf * tech, tech)
        stock = np.where(collapsed, 0.0, stock)
        countdown = np.where(collapsed, rd, countdown)
        n_collapses += collapsed.astype(np.int64)
        instant_recovery = collapsed & (rd == 0)
        stock = np.where(instant_recovery, rf * R0, stock)

        dormant = ~collapsed & (countdown > 0)
        countdown = np.where(dormant, countdown - 1, countdown)
        restored = dormant & (countdown == 0)
        stock = np.where(restored, rf * R0, stock)

        if record_trajectories:
            traj_t[:, step - 1] = tech
            traj_r[:, step - 1] = stock

    censored = first_collapse == 0
    return RunOutcomes(
        duty_cycle=active_years / window,
        first_collapse_year=first_collapse,
        first_cause=first_cause,
        n_collapses=n_collapses,
        censored=censored,
        final_technology=tech,
        trajectories_T=traj_t,
        trajectories_R=traj_r,
    )


def ensemble_summary(outcomes: RunOutcomes, window: int = 1000) -> dict[str, float]:
    """Paper-style aggregate metrics: censored runs contribute the full timespan."""
    naive_first = np.where(outcomes.censored, window, outcomes.first_collapse_year)
    return {
        "fraction_never_collapsed": float(outcomes.censored.mean()),
        "mean_duty_cycle": float(outcomes.duty_cycle.mean()),
        "mean_time_to_first_collapse": float(naive_first.mean()),
        "mean_collapse_count": float(outcomes.n_collapses.mean()),
    }
