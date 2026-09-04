import numpy as np
import pytest

from janus_resilience.survival import (
    aalen_johansen,
    cif_at,
    kaplan_meier,
    nelson_aalen,
    restricted_mean_survival_time,
)


def test_kaplan_meier_textbook_example():
    time = np.array([2, 4, 6, 8, 10])
    event = np.array([True, False, True, False, True])
    km = kaplan_meier(time, event)
    assert km.times.tolist() == [0, 2, 6, 10]
    assert km.survival[1] == pytest.approx(0.8)
    assert km.survival[2] == pytest.approx(0.8 * (2 / 3))
    assert km.survival[3] == pytest.approx(0.0)


def test_no_events_gives_flat_survival():
    time = np.array([5, 5, 9, 9, 9])
    event = np.array([False, False, False, False, False])
    km = kaplan_meier(time, event)
    assert (km.survival == 1.0).all()


def test_aalen_johansen_single_cause_matches_one_minus_km():
    rng = np.random.default_rng(0)
    n = 400
    time = rng.integers(1, 200, size=n).astype(float)
    event = np.ones(n, dtype=bool)
    cause = np.full(n, "resource")
    aj = aalen_johansen(time, event, cause)
    km = kaplan_meier(time, event)
    np.testing.assert_allclose(1.0 - km.survival, aj.cif_resource, atol=1e-10)
    np.testing.assert_allclose(aj.cif_hazard, 0.0)


def test_aalen_johansen_competing_risks_partition_probability():
    rng = np.random.default_rng(1)
    n = 500
    time = rng.integers(1, 300, size=n).astype(float)
    event = rng.random(n) < 0.85
    cause = np.where(rng.random(n) < 0.7, "resource", "hazard")
    aj = aalen_johansen(time, event, cause)
    total = aj.cif_resource + aj.cif_hazard + aj.km_survival
    np.testing.assert_allclose(total, 1.0, atol=1e-10)
    assert (np.diff(aj.cif_resource) >= -1e-12).all()


def test_cif_horizons_and_nelson_aalen():
    time = np.array([50.0, 120.0, 120.0, 400.0, 900.0])
    event = np.array([True, True, True, False, False])
    cause = np.array(["hazard", "resource", "hazard", "", ""])
    aj = aalen_johansen(time, event, cause)
    at = cif_at(aj, [100, 250, 1000])
    assert at[100] == pytest.approx(1 / 5)
    assert at[250] == pytest.approx(0.6)
    assert at[1000] == pytest.approx(0.6)
    na = nelson_aalen(time, event)
    assert na[0] == 0.0
    assert na[-1] == pytest.approx(1 / 5 + 2 / 4)


def test_rmst_area_under_curve():
    km = kaplan_meier(np.array([100.0]), np.array([True]))
    assert restricted_mean_survival_time(km, 1000) == pytest.approx(100 + 900 * 0.0)
