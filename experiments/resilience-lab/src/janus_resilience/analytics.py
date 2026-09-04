"""Exact analytic expectations for the published collapse-recovery dynamics.

The model is piecewise-linear between discrete events, so ensemble expectations follow
discrete renewal recursions on the integer-year grid. Given fixed parameters these
recursions are EXACT - no Monte Carlo noise - for

  - expected duty cycle,
  - expected number of collapses,
  - probability of never collapsing within the window,
  - the full time-to-first-collapse distribution and its paper-style truncated mean.

Roles in this experiment:

  1. analytic baseline that learned surrogates must match or beat,
  2. validation target for both simulators via distributional checks,
  3. deterministic surrogate used inside global sensitivity analysis.

Step semantics mirror the reference simulator and ADR-0001: a step is active iff the
system is outside recovery delay; growth and depletion apply during active steps; a
collapse ends the current step; recovery delay then runs rd inactive steps; resources
are restored to rf * R0 afterwards; the hazard Bernoulli applies during active steps.

Only timing parameters (R0, delta, h, rd, rf) enter these metrics. The growth rate r and
collapse fraction cf shape technology levels but cannot affect activity timing, which is
the structural reason the paper reports cf as a negligible lever for every outcome
metric reproduced here.

Implementation notes. There are exactly two distinct active spans: the fresh span with
stock R0 and the recovered span with stock rf * R0; both continue into the same
post-collapse state. Writing B[u] for the continuation value u years after a collapse,
each span obeys

    A[u] = sum_k w(k) * B[u-k] + deterministic(u) + tail(u),

with w(k) the span-ending probabilities. The geometric part of that sum satisfies a
first-order sliding recurrence, so one ascending pass fills every table in O(window).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class AnalyticMetrics:
    expected_duty_cycle: float
    expected_collapses: float
    prob_never_collapsed: float
    paper_style_mean_first_collapse: float


@dataclass(frozen=True)
class RenewalTables:
    """Renewal recursions indexed by remaining window u = 0..window."""

    active_from_fresh_span: np.ndarray
    active_after_collapse: np.ndarray
    collapses_from_fresh_span: np.ndarray
    first_collapse_pmf: np.ndarray
    prob_never_collapsed: float


def depletion_horizon(stock: float, delta: float) -> int | None:
    """Active steps until R <= 0 for a span starting with `stock`; None if never."""
    if delta <= 0 or stock <= 0:
        return None
    return int(math.ceil(stock / delta))


def _series_sums(h: float, q: float, window: int) -> tuple[np.ndarray, np.ndarray]:
    """G[j] = sum_{k<=j} k q^(k-1) h and H[j] = sum_{k<=j} q^(k-1) h."""
    ks = np.arange(1, window + 1, dtype=float)
    g = np.concatenate(([0.0], np.cumsum(ks * q ** np.arange(0, window) * h)))
    hh = np.concatenate(([0.0], np.cumsum(q ** np.arange(0, window) * h)))
    return g, hh


def renewal_tables(
    r0: float,
    delta: float,
    h: float,
    rd: int,
    rf: float,
    window: int,
) -> RenewalTables:
    q = 1.0 - h
    qpow = q ** np.arange(window + 1)
    g_sum, h_sum = _series_sums(h, q, window)

    horizons: dict[str, int | None] = {
        "fresh": depletion_horizon(r0, delta),
        "post": depletion_horizon(rf * r0, delta),
    }
    post_alive = rf * r0 > 0

    a = {"fresh": np.zeros(window + 1), "post": np.zeros(window + 1)}
    c = {"fresh": np.zeros(window + 1), "post": np.zeros(window + 1)}
    b_cont = np.zeros(window + 1)
    cb_cont = np.zeros(window + 1)

    slide_a = {"fresh": 0.0, "post": 0.0}
    slide_c = {"fresh": 0.0, "post": 0.0}

    for u in range(1, window + 1):
        b_prev = b_cont[u - 1]
        cb_prev = cb_cont[u - 1]
        kinds = ("post", "fresh") if post_alive else ("fresh",)
        for kind in kinds:
            slide_a[kind] = b_prev + q * slide_a[kind]
            slide_c[kind] = cb_prev + q * slide_c[kind]
            m = horizons[kind]
            if m is not None and u - 1 >= m:
                slide_a[kind] -= qpow[m] * b_cont[u - 1 - m]
                slide_c[kind] -= qpow[m] * cb_cont[u - 1 - m]
            if m is None or u < m:
                a[kind][u] = h * slide_a[kind] + g_sum[u] + qpow[u] * u
                c[kind][u] = h * slide_c[kind] + h_sum[u]
            else:
                end_weight = qpow[m - 1]
                a[kind][u] = (
                    h * slide_a[kind]
                    + (1.0 - h) * end_weight * b_cont[u - m]
                    + g_sum[m]
                    + m * end_weight * (1.0 - h)
                )
                c[kind][u] = h * slide_c[kind] + (1.0 - h) * end_weight * cb_cont[u - m] + 1.0

        rest = u - rd
        if post_alive and rest > 0:
            b_cont[u] = a["post"][rest]
            cb_cont[u] = c["post"][rest]

    pmf = np.zeros(window + 1)
    m1 = horizons["fresh"]
    first_len = window if m1 is None else min(m1, window)
    pmf[1 : first_len + 1] = qpow[:first_len] * h
    if m1 is not None and m1 <= window:
        pmf[m1] = qpow[m1 - 1]
    never = float(qpow[window]) if (m1 is None or m1 > window) else 0.0

    return RenewalTables(
        active_from_fresh_span=a["fresh"],
        active_after_collapse=b_cont,
        collapses_from_fresh_span=c["fresh"],
        first_collapse_pmf=pmf,
        prob_never_collapsed=never,
    )


def first_collapse_distribution(
    r0: float,
    delta: float,
    h: float,
    window: int,
) -> tuple[np.ndarray, float]:
    """PMF of first-collapse time on indices 1..window plus P(no collapse ever).

    The first collapse can only occur during the first active span, so the never-
    collapsed probability equals the probability that the first span outlives the
    window: (1-h)^window when the depletion horizon exceeds the window, else 0.
    """
    tables = renewal_tables(r0, delta, h, rd=0, rf=0.0, window=window)
    return tables.first_collapse_pmf, tables.prob_never_collapsed


def expected_metrics(
    r0: float,
    delta: float,
    h: float,
    rd: int,
    rf: float,
    window: int = 1000,
) -> AnalyticMetrics:
    tables = renewal_tables(r0, delta, h, rd, rf, window)
    times = np.arange(1, window + 1, dtype=float)
    truncated_mean = float(np.dot(tables.first_collapse_pmf[1:], times))
    if tables.prob_never_collapsed > 0.0:
        truncated_mean += tables.prob_never_collapsed * window
    return AnalyticMetrics(
        expected_duty_cycle=float(tables.active_from_fresh_span[window]) / window,
        expected_collapses=float(tables.collapses_from_fresh_span[window]),
        prob_never_collapsed=tables.prob_never_collapsed,
        paper_style_mean_first_collapse=truncated_mean,
    )


def ensemble_expected_metrics(
    draws: dict[str, np.ndarray],
    window: int = 1000,
) -> dict[str, float]:
    """Average exact metrics over a perturbed-parameter ensemble (Table 5 scheme)."""
    n = len(draws["R0"])
    duty = np.empty(n)
    collapses = np.empty(n)
    never = np.empty(n)
    first = np.empty(n)
    for i in range(n):
        m = expected_metrics(
            r0=float(draws["R0"][i]),
            delta=float(draws["delta"][i]),
            h=float(draws["h"][i]),
            rd=int(draws["rd"][i]),
            rf=float(draws["rf"][i]),
            window=window,
        )
        duty[i] = m.expected_duty_cycle
        collapses[i] = m.expected_collapses
        never[i] = m.prob_never_collapsed
        first[i] = m.paper_style_mean_first_collapse
    return {
        "mean_expected_duty_cycle": float(duty.mean()),
        "mean_expected_collapses": float(collapses.mean()),
        "mean_prob_never_collapsed": float(never.mean()),
        "paper_style_mean_first_collapse": float(first.mean()),
    }
