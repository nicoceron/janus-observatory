from __future__ import annotations

from pathlib import Path

import pytest

from janus_concordia.canonical import find_repository_root
from janus_concordia.compare import compare_run


def make_run() -> dict[str, object]:
    return {
        "schemaVersion": "1.0.0",
        "runId": "s4-comparison-test",
        "evidenceKind": "model_generated",
        "contentOrigin": "model_generated",
        "targetScenarioId": "S4",
        "seed": 4104,
        "framework": {"name": "gdm-concordia", "version": "2.4.0"},
        "model": {"provider": "test", "modelId": "deterministic-stub"},
        "protocolVersion": "janus-concordia-council-v1",
        "promptInputs": {
            "datasetId": "janus.scenarios.morphology.tfsc-table-5",
            "datasetSchemaVersion": "1.0.0",
            "sourceId": "JANUS-PAPER-01",
            "sourceVersion": "arXiv:2409.00067v3",
            "locator": {"page": 8, "table": "Table 5"},
            "fields": [
                "scenarioId",
                "mythMetaphor",
                "globalFactor",
                "technologyCluster",
                "technologyFactors",
            ],
        },
        "withheldComparisonDimensions": [
            "population",
            "annualEnergyUseJ",
            "growthState",
        ],
        "promptSha256": "a" * 64,
        "transcriptSha256": "b" * 64,
        "outcome": {
            "population": 200_000_000,
            "annualEnergyUseJ": None,
            "growthState": "stable",
        },
        "limitations": ["Test fixture; not a forecast."],
    }


def test_comparison_is_dimension_by_dimension_and_source_preserving() -> None:
    result = compare_run(make_run(), find_repository_root(Path(__file__)))

    assert "score" not in result
    assert all("score" not in dimension for dimension in result["dimensions"].values())
    assert result["scenarioId"] == "S4"
    assert result["canonicalSource"]["sourceId"] == "JANUS-PAPER-01"
    assert result["canonicalSource"]["sourceVersion"] == "arXiv:2409.00067v3"
    assert result["canonicalSource"]["locator"] == {"page": 18, "table": "Table 9"}

    population = result["dimensions"]["population"]
    assert population["canonical"]["value"] == 400_000_000
    assert population["canonical"]["evidenceKind"] == "reported"
    assert population["canonical"]["contentOrigin"] == "transcribed"
    assert population["agentRun"]["evidenceKind"] == "model_generated"
    assert population["agentRun"]["contentOrigin"] == "model_generated"
    assert population["comparison"]["ratioToCanonical"] == pytest.approx(0.5)
    assert population["comparison"]["evidenceKind"] == "derived"

    energy = result["dimensions"]["annualEnergyUse"]
    assert energy["comparison"] == {
        "status": "unavailable",
        "evidenceKind": "derived",
        "contentOrigin": "derived",
    }

    growth = result["dimensions"]["growthState"]
    assert growth["comparison"]["sameCategory"] is True


def test_comparison_language_rejects_prediction_framing() -> None:
    result = compare_run(make_run(), find_repository_root(Path(__file__)))
    statement = result["statement"]
    assert "not a forecast" in statement
    assert "probability" in statement
    assert "ranking" in statement


def test_comparison_is_deterministic_for_identical_inputs() -> None:
    root = find_repository_root(Path(__file__))
    assert compare_run(make_run(), root) == compare_run(make_run(), root)
