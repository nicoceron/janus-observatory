
from janus_resilience.dataset import (
    DatasetConfig,
    classify_regime,
    duty_tier,
    generate_dataset,
    summarize_dataset,
)


def test_regime_and_tier_labels():
    assert classify_regime(0, 0, True) == "stable"
    assert classify_regime(1, 640, False) == "single_collapse"
    assert classify_regime(4, 120, False) == "recurrent"
    assert duty_tier(0.95) == "high"
    assert duty_tier(0.6) == "moderate"
    assert duty_tier(0.2) == "low"


def test_generate_dataset_small():
    config = DatasetConfig(n_design_points=16, replicates_per_point=3)
    header, rows, manifest = generate_dataset(config)
    assert len(rows) == 48
    assert header[:4] == ["run_id", "point_id", "replicate", "seed"]
    point_ids = {row[1] for row in rows}
    assert len(point_ids) == 16
    seeds = {(row[1], row[2]) for row in rows}
    assert len(seeds) == 48
    assert manifest["designSpace"]["delta"] == [0.1, 2.5]
    regimes = {row[-2] for row in rows}
    assert regimes <= {"stable", "single_collapse", "recurrent"}
    causes = {row[9] for row in rows if row[8] == 0 and row[9]}
    assert causes <= {"resource", "hazard"}


def test_summarize_dataset_keys():
    config = DatasetConfig(n_design_points=8, replicates_per_point=2)
    _, rows, manifest = generate_dataset(config)
    summary = summarize_dataset(rows)
    assert summary["runs"] == 16
    assert 0.0 <= summary["meanDutyCycle"] <= 1.0
    assert abs(
        summary["causeShares"]["resource"] + summary["causeShares"]["hazard"] - 1.0
    ) < 1e-6 or not summary["causeShares"]["resource"] and not summary["causeShares"]["hazard"]
    assert manifest["totalRuns"] == 16
