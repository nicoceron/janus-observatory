import numpy as np
import pytest

from janus_resilience.sensitivity import ParamSpace, morris_elementary_effects, sobol_indices

NAMES = ("x1", "x2", "x3")


def _space() -> ParamSpace:
    return ParamSpace(names=NAMES, lows=np.zeros(3), highs=np.ones(3))


def test_sobol_recovers_linear_variance_shares():
    weights = np.array([2.0, 1.0, 0.5])
    share = weights**2 / np.sum(weights**2)

    def linear(p):
        X = np.column_stack([p[name] for name in NAMES])
        return X @ weights

    idx = sobol_indices(linear, _space(), n_base=32768, seed=23)
    for i, name in enumerate(NAMES):
        assert idx[name]["first_order"] == pytest.approx(share[i], abs=0.06)
        assert idx[name]["total_order"] == pytest.approx(share[i], abs=0.06)


def test_sobol_matches_analytic_indices_for_pure_interaction():
    def interactive(p):
        return 10.0 * p["x1"] * p["x2"] + 0.01 * p["x3"]

    idx = sobol_indices(interactive, _space(), n_base=8192, seed=13)
    assert idx["x1"]["first_order"] == pytest.approx(3 / 7, abs=0.05)
    assert idx["x2"]["first_order"] == pytest.approx(3 / 7, abs=0.05)
    assert idx["x1"]["total_order"] == pytest.approx(4 / 7, abs=0.05)
    assert idx["x1"]["total_order"] > idx["x1"]["first_order"]
    assert idx["x3"]["total_order"] < 0.01


def test_morris_ranks_by_magnitude():
    weights = np.array([5.0, 1.0, 0.2])

    def linear(p):
        X = np.column_stack([p[name] for name in NAMES])
        return X @ weights

    effects = morris_elementary_effects(linear, _space(), n_trajectories=32, seed=7)
    mus = [effects[name]["mu_star"] for name in NAMES]
    assert mus[0] > mus[1] > mus[2]
    for name, w in zip(NAMES, weights, strict=True):
        assert effects[name]["mu_star"] == pytest.approx(w, rel=0.25)
