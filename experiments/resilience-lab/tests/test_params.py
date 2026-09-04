import numpy as np
import pytest

from janus_resilience.params import (
    load_anchors,
    load_reported,
    sample_perturbed,
)


def test_anchors_load_with_canonical_values():
    anchors = load_anchors()
    assert set(anchors) == {f"S{i}" for i in range(1, 11)}
    s1 = anchors["S1"]
    assert (s1.r, s1.R0, s1.delta, s1.cf, s1.rd, s1.rf, s1.h) == (
        0.002,
        400,
        1.2,
        0.6,
        40,
        0.15,
        0.003,
    )
    s3 = anchors["S3"]
    assert s3.delta == 0 and s3.h == 0


def test_reported_targets_present():
    reported = load_reported()
    assert reported["S4"].mean_duty_cycle == pytest.approx(0.381)
    assert reported["S7"].mean_time_to_first_collapse_years == pytest.approx(223)
    assert reported["S3"].fraction_never_collapsed == 1
    assert reported["S2"].mean_duty_cycle is None


def test_perturbation_shapes_and_bounds():
    base = load_anchors()["S6"]
    draws = sample_perturbed(base, 5000, np.random.default_rng(0))
    assert all(v.shape == (5000,) for v in draws.values())
    assert (draws["R0"] > 0).all()
    assert (draws["delta"] >= 0).all()
    assert ((draws["cf"] >= 0) & (draws["cf"] <= 1)).all()
    assert ((draws["rf"] >= 0) & (draws["rf"] <= 1)).all()
    assert (draws["rd"] >= 0).all()
    assert np.issubdtype(draws["rd"].dtype, np.integer)
    np.testing.assert_allclose(draws["h"], base.h)
    np.testing.assert_allclose(draws["r"], base.r)


def test_stable_scenario_perturbation_keeps_zero_depletion():
    base = load_anchors()["S10"]
    draws = sample_perturbed(base, 100, np.random.default_rng(1))
    assert (draws["delta"] == 0).all()
