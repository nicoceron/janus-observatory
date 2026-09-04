"""Janus Resilience Lab: independent collapse-recovery experimentation package.

This experiment reimplements the published collapse-recovery model from its equations
(JANUS-PAPER-05, arXiv:2604.13774v1, CC BY 4.0), validates that reimplementation
against the paper's reported aggregates, and layers survival analysis, global
sensitivity analysis, surrogate benchmarking, and technosignature persistence math on
top. It is an experiments-track artifact: nothing here feeds canonical runtime data.
"""

from .analytics import AnalyticMetrics, expected_metrics, renewal_tables
from .params import ScenarioParams, load_anchors, load_reported, sample_perturbed
from .reference_sim import RunOutcomes, ensemble_summary, simulate_reference

__all__ = [
    "AnalyticMetrics",
    "RunOutcomes",
    "ScenarioParams",
    "ensemble_summary",
    "expected_metrics",
    "load_anchors",
    "load_reported",
    "renewal_tables",
    "sample_perturbed",
    "simulate_reference",
]
