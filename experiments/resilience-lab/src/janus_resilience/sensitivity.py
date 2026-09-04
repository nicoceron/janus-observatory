"""Global sensitivity analysis for collapse-recovery outcomes.

The paper's sensitivity study is one-at-a-time sweeping. This module adds variance-
based global measures that capture interactions:

  - Sobol first-order (S_i) and total-effect (ST_i) indices via the Saltelli
    sampling scheme on a scrambled Sobol sequence,
  - Morris-style elementary effects (one-at-a-time finite differences) as a cheap
    screening cross-check.

Every estimator consumes a deterministic scalar function of the seven parameters.
Two functions are used throughout:

  - the EXACT renewal recursions (analytics.expected_metrics), giving noise-free
    indices of the model's expectation structure,
  - the event-driven simulator evaluated under common random numbers, giving
    indices of a finite ensemble.

Agreement between the two sets of indices is itself an internal consistency check
that the reimplementation matches the analytic structure of the published model.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class ParamSpace:
    names: tuple[str, ...]
    lows: np.ndarray
    highs: np.ndarray

    def unit_to_params(self, unit: np.ndarray) -> dict[str, np.ndarray]:
        out = {}
        for i, name in enumerate(self.names):
            out[name] = self.lows[i] + unit[..., i] * (self.highs[i] - self.lows[i])
        return out


def sobol_indices(
    func: Callable[[dict[str, np.ndarray]], np.ndarray],
    space: ParamSpace,
    n_base: int = 512,
    seed: int = 20260821,
    n_replicates: int = 1,
) -> dict[str, dict[str, float | None]]:
    """Saltelli-style Sobol indices with optional replicate-based standard errors.

    All base designs are independent uniform draws; the estimator algebra requires
    statistical independence between designs, which deterministic low-discrepancy
    sequences do not provide when paired (consecutive Sobol blocks are near bitwise
    complements under Gray-code enumeration, and separately scrambled SciPy Sobol
    sequences remain correlated). The dataset generator elsewhere still uses Sobol
    sampling, where space-filling - not estimator algebra - is the goal.

    With A, B independent and two mixed families,

      C_i = B with column i from A   (shares all-but-i with B),
      D_i = A with column i from B   (differs from A only in column i),

    the estimators are

      S_i  = mean[f_A * (f_Ci - f_B)] / Var,
      ST_i = mean[(f_A - f_Di)^2] / (2 Var),

    where the ST form is the average conditional variance across x_i: the pair
    (f_A, f_Di) differs only in coordinate i.

    Point estimates are Monte Carlo noisy: with modest n_base individual S_i values
    can land slightly negative even for strictly influential parameters. When
    n_replicates > 1, the whole design and estimation are repeated with independent
    draws and the returned standard errors (standard deviation of replicate estimates
    divided by sqrt(replicates)) make that noise explicit instead of hiding it.
    """
    dim = len(space.names)
    replicate_s: list[dict[str, float]] = []
    replicate_st: list[dict[str, float]] = []
    for rep in range(max(int(n_replicates), 1)):
        rep_seed = seed + 7919 * rep
        rng = np.random.default_rng(rep_seed)
        a_unit = rng.random((n_base, dim))
        b_unit = rng.random((n_base, dim))

        f_a = np.asarray(func(space.unit_to_params(a_unit)), dtype=float)
        f_b = np.asarray(func(space.unit_to_params(b_unit)), dtype=float)

        f_ci_columns = []
        f_di_columns = []
        for i in range(len(space.names)):
            c_mix = b_unit.copy()
            c_mix[:, i] = a_unit[:, i]
            f_ci_columns.append(np.asarray(func(space.unit_to_params(c_mix)), dtype=float))
            d_mix = a_unit.copy()
            d_mix[:, i] = b_unit[:, i]
            f_di_columns.append(np.asarray(func(space.unit_to_params(d_mix)), dtype=float))

        var_total = float(np.concatenate((f_a, f_b)).var(ddof=1))
        if var_total <= 0:
            raise ValueError("zero outcome variance across the design; widen the parameter space")

        s_row: dict[str, float] = {}
        st_row: dict[str, float] = {}
        for i, name in enumerate(space.names):
            s_row[name] = float(np.mean(f_a * (f_ci_columns[i] - f_b)) / var_total)
            st_row[name] = float(np.mean((f_a - f_di_columns[i]) ** 2) / (2.0 * var_total))
        replicate_s.append(s_row)
        replicate_st.append(st_row)

    result: dict[str, dict[str, float | None]] = {}
    for name in space.names:
        entry: dict[str, float | None] = {}
        for prefix, rows in (("first_order", replicate_s), ("total_order", replicate_st)):
            arr = np.array([row[name] for row in rows])
            entry[prefix] = float(arr.mean())
            entry[f"{prefix}_se"] = (
                float(arr.std(ddof=1) / np.sqrt(len(arr))) if len(rows) > 1 else None
            )
        result[name] = entry
    return result


def morris_elementary_effects(
    func: Callable[[dict[str, np.ndarray]], np.ndarray],
    space: ParamSpace,
    n_trajectories: int = 64,
    step_fraction: float = 0.1,
    seed: int = 20260821,
) -> dict[str, dict[str, float]]:
    """Morris elementary effects on the unit hypercube.

    Each trajectory perturbs one coordinate at a time by a fixed fraction of the
    parameter's range and records EE_i = (f(x + step*e_i) - f(x)) / step in unit-cube
    coordinates, so mu_star values are directly comparable across parameters with
    different physical units. sigma flags parameters whose effect changes strength
    across the design region (interactions or nonlinearities).
    """
    rng = np.random.default_rng(seed)
    dim = len(space.names)

    ee: list[np.ndarray] = []
    for _ in range(n_trajectories):
        x_unit = rng.random(dim)
        f_x = float(np.asarray(func(space.unit_to_params(x_unit[None, :])))[0])
        row = np.zeros(dim)
        order = rng.permutation(dim)
        for i in order:
            bump = step_fraction if x_unit[i] <= 1.0 - step_fraction else -step_fraction
            bumped = x_unit.copy()
            bumped[i] += bump
            f_bumped = float(np.asarray(func(space.unit_to_params(bumped[None, :])))[0])
            row[i] = (f_bumped - f_x) / bump
            x_unit = bumped
            f_x = f_bumped
        ee.append(row)

    ee_arr = np.asarray(ee)
    result = {}
    for i, name in enumerate(space.names):
        col = ee_arr[:, i]
        result[name] = {
            "mu": float(col.mean()),
            "mu_star": float(np.abs(col).mean()),
            "sigma": float(col.std(ddof=1)),
        }
    return result
