import numpy as np
import pytest

from janus_resilience.analytics import (
    expected_metrics,
    first_collapse_distribution,
    renewal_tables,
)


def test_deterministic_depletion_s9_baseline():
    m = expected_metrics(r0=900.0, delta=1.3, h=0.0, rd=70, rf=0.35, window=1000)
    assert m.expected_collapses == pytest.approx(1.0)
    assert m.expected_duty_cycle == pytest.approx(930 / 1000)
    assert m.prob_never_collapsed == 0.0
    assert m.paper_style_mean_first_collapse == pytest.approx(693.0)


def test_deterministic_depletion_s4_cycle_train():
    m = expected_metrics(r0=600.0, delta=2.5, h=0.0, rd=100, rf=0.1, window=1000)
    assert m.expected_collapses == pytest.approx(7.0)
    assert m.expected_duty_cycle == pytest.approx(384 / 1000)


def test_pure_hazard_regime_matches_closed_form():
    window, h = 1000, 0.001
    q = 1 - h
    m = expected_metrics(r0=500.0, delta=0.0, h=h, rd=5000, rf=0.2, window=window)
    never = q**window
    expected_active = (1 - q**window) / h
    assert m.prob_never_collapsed == pytest.approx(never)
    assert m.expected_duty_cycle == pytest.approx(expected_active / window, rel=1e-9)
    assert m.expected_collapses == pytest.approx(1 - q**window)


def test_recovering_pure_hazard_exceeds_first_span_only():
    m = expected_metrics(r0=500.0, delta=0.0, h=0.01, rd=10, rf=0.2, window=1000)
    first_span_only = (1 - 0.99**1000) / 0.01 / 1000
    assert m.expected_duty_cycle > first_span_only
    assert m.expected_collapses > 1 - 0.99**1000


def test_stable_scenario_exact():
    m = expected_metrics(r0=2400.0, delta=0.0, h=0.0, rd=0, rf=1.0, window=1000)
    assert m.expected_duty_cycle == 1.0
    assert m.expected_collapses == 0.0
    assert m.prob_never_collapsed == 1.0


def test_first_collapse_distribution_sums_to_one():
    pmf, never = first_collapse_distribution(r0=400.0, delta=1.2, h=0.003, window=1000)
    assert pmf.sum() + never == pytest.approx(1.0, abs=1e-9)
    assert never == 0.0
    assert pmf.argmax() == 334

    pmf2, never2 = first_collapse_distribution(r0=2500.0, delta=0.1, h=0.0005, window=1000)
    assert pmf2.sum() + never2 == pytest.approx(1.0, abs=1e-9)
    assert never2 == pytest.approx(0.9995**1000)


def test_hazard_only_first_collapse_geometric_mean():
    h = 0.004
    window = 2000
    tables = renewal_tables(r0=900.0, delta=0.0, h=h, rd=0, rf=0.5, window=window)
    mean_t = float(np.dot(tables.first_collapse_pmf[1:], np.arange(1, window + 1)))
    mean_t += tables.prob_never_collapsed * window
    assert mean_t == pytest.approx((1 - (1 - h) ** window) / h, rel=1e-6)
