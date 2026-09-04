"""Event-driven simulator: exact distributional equivalent of the year-by-year model.

During any active span the next collapse time is the minimum of two independent waiting
times, so the simulation jumps directly between events instead of iterating years:

  - resource exhaustion after ceil(R / delta) further active steps,
  - a hazard hit after k ~ Geometric(h) active steps (the same Bernoulli-per-year law
    as the reference simulator's per-step uniform deviates).

This module is the scalability layer behind the Level-2 dataset: it produces replicate
summaries at event cost rather than year cost. Statistical equivalence with the
reference simulator is asserted by tests through KS tests on first-collapse times and
mean agreement on all outcome metrics.

Tie semantics match the reference simulator: when both triggers land on the same step
the cause is recorded as hazard, because the reference evaluates the hazard deviate
before the resource condition. Technology levels are timing-independent of outcomes and
are not tracked here.
"""

from __future__ import annotations

import numpy as np

from .reference_sim import RunOutcomes

_FOREVER = np.int64(2**31 - 1)


def _geometric_waiting(rng: np.random.Generator, h: np.ndarray) -> np.ndarray:
    """Draws from Geometric(h) on {1, 2, ...} by inverse CDF; FOREVER where h == 0."""
    u = rng.random(h.size)
    safe_h = np.where(h > 0, h, 0.5)
    k = np.ceil(np.log1p(-u) / np.log1p(-safe_h))
    return np.where(h > 0, k, _FOREVER).astype(np.int64)


def simulate_events(
    params: dict[str, np.ndarray],
    window: int = 1000,
    seed: int | None = None,
    rng: np.random.Generator | None = None,
) -> RunOutcomes:
    if rng is None:
        rng = np.random.default_rng(seed)

    R0 = np.asarray(params["R0"], dtype=float)
    delta = np.asarray(params["delta"], dtype=float)
    rf = np.asarray(params["rf"], dtype=float)
    rd = np.asarray(params["rd"], dtype=np.int64)
    h = np.asarray(params["h"], dtype=float)
    n = R0.size
    if np.any(R0 <= 0):
        raise ValueError("R0 must be positive for every replicate")

    stock = R0.copy()
    next_free = np.zeros(n, dtype=np.int64)
    done = np.zeros(n, dtype=bool)

    active_steps = np.zeros(n, dtype=np.int64)
    n_collapses = np.zeros(n, dtype=np.int64)
    first_collapse = np.zeros(n, dtype=np.int64)
    first_cause = np.full(n, "", dtype="<U8")
    last_cause = np.full(n, "", dtype="<U8")

    while not done.all():
        pending = ~done

        k_res = np.full(n, _FOREVER, dtype=np.int64)
        depletes = pending & (delta > 0)
        if depletes.any():
            k_res[depletes] = np.ceil(stock[depletes] / delta[depletes]).astype(np.int64)

        k_haz = np.full(n, _FOREVER, dtype=np.int64)
        hazardous = pending & (h > 0)
        if hazardous.any():
            k_haz[hazardous] = _geometric_waiting(rng, h[hazardous])

        k = np.minimum(k_res, k_haz)
        cause = np.where(k_haz <= k_res, "hazard", "resource")
        collapse_time = next_free + k

        active_steps[pending] += np.minimum(k, np.maximum(window - next_free, 0))[pending]

        just_ended = pending & (collapse_time <= window)
        new_first = just_ended & (first_collapse == 0)
        first_collapse[new_first] = collapse_time[new_first]
        first_cause[new_first] = cause[new_first]
        n_collapses[just_ended] += 1
        last_cause[just_ended] = cause[just_ended]

        next_free[just_ended] = collapse_time[just_ended] + rd[just_ended]
        stock[just_ended] = rf[just_ended] * R0[just_ended]

        still_open = pending & ~just_ended
        done[still_open] = True
        done[just_ended & ~(rf * R0 > 0)] = True

    return RunOutcomes(
        duty_cycle=active_steps / window,
        first_collapse_year=first_collapse,
        first_cause=first_cause,
        n_collapses=n_collapses,
        censored=first_collapse == 0,
        final_technology=np.zeros(n),
        trajectories_T=None,
        trajectories_R=None,
    )
