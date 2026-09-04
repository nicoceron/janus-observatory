import json
from pathlib import Path

import pytest

from janus_resilience.cli import build_replication_report, verify_replication_report
from janus_resilience.validation import run_replication


@pytest.mark.slow
def test_full_replication_passes():
    report = run_replication(n_large=4000)
    assert report["overallVerdict"] in {"pass", "warn"}
    for scenario in report["scenarios"]:
        assert scenario["worstVerdict"] != "fail", scenario
        for cmp in scenario["comparisons"]:
            if cmp["reported"] is not None:
                assert cmp["verdict"] != "fail", (scenario["scenarioId"], cmp)


def test_committed_report_contract_requires_an_exact_seeded_replay(tmp_path: Path):
    path = tmp_path / "replication-report.json"
    report = build_replication_report(n_large=256)
    path.write_text(json.dumps(report), encoding="utf-8")

    verified = verify_replication_report(path, expected_runs=256)
    assert verified["canonicalStatus"] == "noncanonical"
    assert verified["evidenceKind"] == "reimplemented"
    assert verified["authorCodeUsed"] is False
    assert verified["implementation"]["treeHash"].startswith("sha256:")
    assert verified["seeds"]["paperComparableBatch"] == 12345

    report["scenarios"][0]["largeEnsemble"]["mean_duty_cycle"] += 0.00001
    path.write_text(json.dumps(report), encoding="utf-8")
    with pytest.raises(ValueError, match="does not exactly replay"):
        verify_replication_report(path, expected_runs=256)


def test_committed_report_contract_rejects_a_stale_implementation_hash(tmp_path: Path):
    path = tmp_path / "replication-report.json"
    report = build_replication_report(n_large=64)
    report["implementation"]["treeHash"] = f"sha256:{'0' * 64}"
    path.write_text(json.dumps(report), encoding="utf-8")

    with pytest.raises(ValueError, match="stale or mislabeled"):
        verify_replication_report(path, expected_runs=64)
