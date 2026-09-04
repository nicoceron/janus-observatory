import numpy as np
import pytest
from scipy import stats

from janus_resilience.analytics import first_collapse_distribution, renewal_tables
from janus_resilience.event_sim import simulate_events
from janus_resilience.params import load_anchors, sample_perturbed
from janus_resilience.reference_sim import ensemble_summary, simulate_reference


def _fixed(n: int, **overrides) -> dict[str, np.ndarray]:
    values = {"r": 0.002, "R0": 400.0, "delta": 1.2, "cf": 0.6, "rd": 40, "rf": 0.15, "h": 0.003}
    values.update(overrides)
    return {k: np.full(n, v) for k, v in values.items()}


def _continuous_ks(obs: np.ndarray, pmf: np.ndarray, atom_year: int) -> float:
    """KS statistic restricted to the continuous part of a mixed distribution."""
    cdf = np.cumsum(pmf)
    obs = obs[obs < atom_year].astype(float)
    if obs.size < 500:
        return 0.0
    total_continuous = cdf[atom_year - 1]
    normalized = cdf / total_continuous

    def continuous_cdf(q):
        return np.interp(q, np.arange(len(normalized)), normalized)

    return stats.kstest(obs, continuous_cdf).statistic


@pytest.mark.parametrize(
    "params",
    [
        {"R0": 400.0, "delta": 1.2, "rd": 40, "rf": 0.15, "h": 0.003},
        {"R0": 1600.0, "delta": 1.0, "rd": 50, "rf": 0.25, "h": 0.005},
        {"R0": 700.0, "delta": 1.5, "rd": 70, "rf": 0.10, "h": 0.001},
    ],
)
def test_event_first_collapse_matches_analytic_distribution(params):
    n = 30000
    fixed = _fixed(n, **params)
    evt = simulate_events(fixed, seed=99)
    horizon = int(np.ceil(params["R0"] / params["delta"]))
    atom = min(horizon, 1000)
    pmf, never = first_collapse_distribution(params["R0"], params["delta"], params["h"], 1000)

    assert abs(evt.censored.mean() - never) < 0.01
    ks = _continuous_ks(evt.first_collapse_year[~evt.censored], pmf, atom)
    assert ks < 0.02  # continuous-part KS

    bins = np.array([pmf[i : i + 50].sum() for i in range(1, 301, 50)])
    expected = np.append(bins, pmf[atom])
    counts = []
    edges = list(range(1, 351, 50))
    for lo, hi in zip(edges[:-1], edges[1:], strict=True):
        in_bin = (evt.first_collapse_year >= lo) & (evt.first_collapse_year <= hi - 1)
        counts.append((in_bin & ~evt.censored).sum())
    counts.append(int((evt.first_collapse_year == atom).sum()))
    counts_arr = np.asarray(counts, dtype=float)
    expected = expected * counts_arr.sum() / expected.sum()
    chi = stats.chisquare(counts_arr, expected)
    assert chi.pvalue > 1e-4


def test_both_simulators_agree_under_perturbation():
    anchors = load_anchors()
    for sid in ("S1", "S5", "S6", "S9"):
        draws = sample_perturbed(anchors[sid], 6000, np.random.default_rng(21))
        ref = ensemble_summary(simulate_reference(draws, seed=1000 + int(sid[1:])))
        evt = ensemble_summary(simulate_events(draws, seed=2000 + int(sid[1:])))
        for key in ref:
            scale = max(abs(ref[key]), 1.0)
            assert abs(ref[key] - evt[key]) < 0.02 * scale, (sid, key, ref[key], evt[key])


def test_event_sim_matches_renewal_expectations_fixed_params():
    cases = [
        ("duty_cycle", "active_from_fresh_span"),
        ("n_collapses", None),
    ]
    del cases
    tables = renewal_tables(r0=800.0, delta=1.3, h=0.0015, rd=70, rf=0.35, window=1000)
    n = 40000
    out = simulate_events(_fixed(n, R0=800.0, delta=1.3, h=0.0015, rd=70, rf=0.35), seed=7)
    se = np.sqrt(0.25 / n) * 3
    assert abs(out.duty_cycle.mean() - tables.active_from_fresh_span[-1] / 1000) < max(se, 0.005)
    assert abs(out.n_collapses.mean() - tables.collapses_from_fresh_span[-1]) < max(se * 2, 0.03)


def test_event_sim_speed_advantage_is_real():
    import time

    anchors = load_anchors()
    draws = sample_perturbed(anchors["S6"], 50000, np.random.default_rng(2))
    t0 = time.perf_counter()
    simulate_events(draws, seed=1)
    event_seconds = time.perf_counter() - t0
    t0 = time.perf_counter()
    simulate_reference(draws, seed=1)
    reference_seconds = time.perf_counter() - t0
    assert event_seconds < reference_seconds
