import numpy as np
import pytest

from janus_resilience.reference_sim import ensemble_summary, simulate_reference


def _fixed(n: int, **overrides) -> dict[str, np.ndarray]:
    values = {
        "r": 0.001,
        "R0": 500.0,
        "delta": 1.0,
        "cf": 0.5,
        "rd": 20,
        "rf": 0.3,
        "h": 0.0,
    }
    values.update(overrides)
    return {k: np.full(n, v) for k, v in values.items()}


def test_deterministic_depletion_hits_exact_year():
    out = simulate_reference(_fixed(50, R0=100.0, delta=10.0, rf=0.0), seed=3)
    assert np.all(out.first_collapse_year[~out.censored] == 10)
    assert (out.first_cause == "resource").all()
    assert not out.censored.any()
    summary = ensemble_summary(out)
    assert summary["mean_collapse_count"] == pytest.approx(1.0)


def test_hazard_only_waiting_time_is_geometric():
    h = 0.01
    n = 40000
    out = simulate_reference(_fixed(n, R0=1e9, delta=0.000001, h=h), seed=4)
    obs = out.first_collapse_year[~out.censored].astype(float)
    assert obs.size > 0.99 * n
    assert abs(obs.mean() - 1 / h) < 6 * np.sqrt((1 - h) / h**2 / n)


def test_zero_recovery_delay_resumes_activity():
    out = simulate_reference(_fixed(200, R0=40.0, delta=2.0, rd=0, rf=1.0), seed=5)
    assert out.n_collapses.mean() > 5
    assert out.duty_cycle.min() > 0.9


def test_zero_recovery_fraction_extinguishes_forever():
    out = simulate_reference(_fixed(300, R0=100.0, delta=5.0, rd=30, rf=0.0), seed=6)
    assert np.all(out.n_collapses == 1)
    assert np.all(out.duty_cycle <= 0.22)


def test_post_scarcity_scenarios_never_flinch():
    out = simulate_reference(_fixed(500, delta=0.0, h=0.0), seed=7)
    assert (out.duty_cycle == 1.0).all()
    assert out.censored.all()
    assert (out.n_collapses == 0).all()


def test_same_seed_reproduces_bitwise():
    a = simulate_reference(_fixed(64, h=0.002), seed=11)
    b = simulate_reference(_fixed(64, h=0.002), seed=11)
    c = simulate_reference(_fixed(64, h=0.002), seed=12)
    np.testing.assert_array_equal(a.first_collapse_year, b.first_collapse_year)
    assert not np.array_equal(a.first_collapse_year, c.first_collapse_year)
