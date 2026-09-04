import numpy as np
import pytest

from janus_resilience.params import canonical_path, repo_root
from janus_resilience.persistence import (
    SIGNATURE_LIFETIMES_YR,
    load_presence_flags,
    observation_probability,
    persistence_table,
)
from janus_resilience.provenance import environment_record


def test_observation_probability_extremes():
    assert observation_probability(1.0, 140.0) == pytest.approx(1.0)
    assert observation_probability(0.0, 50000.0) == pytest.approx(1.0)
    assert observation_probability(0.0, 55.0) == pytest.approx(0.055)
    pair = observation_probability(np.array([0.5, 0.5]), 140.0).tolist()
    assert pair == [pytest.approx(0.64), pytest.approx(0.64)]
    assert observation_probability(0.9, 55.0, present=False) == 0.0


def test_short_lived_signature_equals_duty_cycle():
    p = observation_probability(0.7, SIGNATURE_LIFETIMES_YR["no2"]["lifetime"])
    assert p == pytest.approx(0.7, abs=1e-3)


def test_presence_flags_derived_from_canonical_matrix():
    flags_path = repo_root() / "data" / "canonical" / "observability" / "figure-6.json"
    flags = load_presence_flags(flags_path)
    assert set(flags) == {f"S{i}" for i in range(1, 11)}
    assert flags["S1"]["no2"] == 1
    assert flags["S4"]["no2"] == 1
    assert flags["S5"]["no2"] == 0
    assert flags["S10"]["cf4"] == "not_evaluated"


def test_persistence_table_marks_gaps_explicitly():
    flags = {"S3": {"no2": 1, "cfc11": 1, "cfc12": 1, "cf4": "not_evaluated"}}
    rows = persistence_table({"S3": 0.99}, "reimplemented", flags)
    row = rows[0]
    assert row["cfc12"] == pytest.approx(0.99 + min(140 / 1000, 0.01))
    assert row["cf4"] is None
    assert row["cf4_status"] == "not_evaluated"
    assert row["dutyEvidenceKind"] == "reimplemented"


def test_environment_record_reports_core_versions():
    env = environment_record()
    assert env["numpy"]
    assert env["scipy"]
    assert "python" in env


def test_canonical_file_exists():
    assert canonical_path().exists()
