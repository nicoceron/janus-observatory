from __future__ import annotations

import copy

import pytest

from janus_concordia.contract import ContractError, validate_run_record


def valid_run() -> dict[str, object]:
    return {
        "schemaVersion": "1.0.0",
        "runId": "s4-test",
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
            "population": 400_000_000,
            "annualEnergyUseJ": None,
            "growthState": "stable",
        },
        "limitations": ["Test fixture; not a forecast."],
    }


def test_valid_run_preserves_model_generated_label() -> None:
    run = valid_run()
    assert validate_run_record(run) is run


@pytest.mark.parametrize("forbidden_label", ["reported", "derived", "reimplemented"])
def test_run_cannot_claim_a_canonical_evidence_kind(forbidden_label: str) -> None:
    run = copy.deepcopy(valid_run())
    run["evidenceKind"] = forbidden_label
    with pytest.raises(ContractError, match="model_generated"):
        validate_run_record(run)


def test_invalid_scenario_is_rejected() -> None:
    run = copy.deepcopy(valid_run())
    run["targetScenarioId"] = "S11"
    with pytest.raises(ContractError, match="targetScenarioId"):
        validate_run_record(run)


def test_invalid_growth_state_is_rejected() -> None:
    run = copy.deepcopy(valid_run())
    run["outcome"]["growthState"] = "likely"  # type: ignore[index]
    with pytest.raises(ContractError, match="growthState"):
        validate_run_record(run)


def test_comparison_dimensions_must_be_recorded_as_withheld() -> None:
    run = copy.deepcopy(valid_run())
    run["withheldComparisonDimensions"] = ["population"]
    with pytest.raises(ContractError, match="withheldComparisonDimensions"):
        validate_run_record(run)


def test_prompt_input_fields_are_an_exact_allowlist() -> None:
    run = copy.deepcopy(valid_run())
    run["promptInputs"]["fields"].append("annualEnergyUseJ")  # type: ignore[index,union-attr]
    with pytest.raises(ContractError, match="morphology allowlist"):
        validate_run_record(run)
