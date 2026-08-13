"""Validation for portable Concordia run records.

The run contract deliberately lives outside the canonical domain package. Agent
outputs are research artifacts with ``model_generated`` evidence, never Janus
facts.
"""

from __future__ import annotations

import math
import re
from typing import Any

SCENARIO_IDS = {f"S{index}" for index in range(1, 11)}
GROWTH_STATES = {"growing", "stable", "oscillatory"}
WITHHELD_DIMENSIONS = {"population", "annualEnergyUseJ", "growthState"}
PROMPT_FIELD_ALLOWLIST = {
    "scenarioId",
    "mythMetaphor",
    "globalFactor",
    "technologyCluster",
    "technologyFactors",
}
SHA256_PATTERN = re.compile(r"[0-9a-f]{64}")


class ContractError(ValueError):
    """Raised when a research run does not satisfy the portable contract."""


def _require_mapping(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ContractError(f"{label} must be an object")
    return value


def _require_text(mapping: dict[str, Any], key: str, label: str) -> str:
    value = mapping.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ContractError(f"{label}.{key} must be a non-empty string")
    return value


def _validate_optional_measure(value: Any, label: str) -> int | float | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ContractError(f"{label} must be a number or null")
    if not math.isfinite(value) or value < 0:
        raise ContractError(f"{label} must be finite and non-negative")
    return value


def validate_run_record(value: Any) -> dict[str, Any]:
    """Validate and return a Concordia run record.

    Unknown top-level fields remain allowed so framework-specific trace metadata
    can evolve without changing the comparison contract.
    """

    run = _require_mapping(value, "run")
    if run.get("schemaVersion") != "1.0.0":
        raise ContractError("run.schemaVersion must be 1.0.0")
    _require_text(run, "runId", "run")
    if run.get("evidenceKind") != "model_generated":
        raise ContractError("run.evidenceKind must be model_generated")
    if run.get("contentOrigin") != "model_generated":
        raise ContractError("run.contentOrigin must be model_generated")

    scenario_id = _require_text(run, "targetScenarioId", "run")
    if scenario_id not in SCENARIO_IDS:
        raise ContractError(f"run.targetScenarioId must be one of {sorted(SCENARIO_IDS)}")

    seed = run.get("seed")
    if isinstance(seed, bool) or not isinstance(seed, int) or seed < 0:
        raise ContractError("run.seed must be a non-negative integer")

    framework = _require_mapping(run.get("framework"), "run.framework")
    if _require_text(framework, "name", "run.framework") != "gdm-concordia":
        raise ContractError("run.framework.name must be gdm-concordia")
    if _require_text(framework, "version", "run.framework") != "2.4.0":
        raise ContractError("run.framework.version must be 2.4.0 for schemaVersion 1.0.0")

    model = _require_mapping(run.get("model"), "run.model")
    _require_text(model, "provider", "run.model")
    _require_text(model, "modelId", "run.model")

    _require_text(run, "protocolVersion", "run")
    prompt_hash = _require_text(run, "promptSha256", "run")
    transcript_hash = _require_text(run, "transcriptSha256", "run")
    if SHA256_PATTERN.fullmatch(prompt_hash) is None:
        raise ContractError("run.promptSha256 must be a lowercase SHA-256 digest")
    if SHA256_PATTERN.fullmatch(transcript_hash) is None:
        raise ContractError("run.transcriptSha256 must be a lowercase SHA-256 digest")

    prompt_inputs = _require_mapping(run.get("promptInputs"), "run.promptInputs")
    for key in ("datasetId", "datasetSchemaVersion", "sourceId", "sourceVersion"):
        _require_text(prompt_inputs, key, "run.promptInputs")
    _require_mapping(prompt_inputs.get("locator"), "run.promptInputs.locator")
    prompt_fields = prompt_inputs.get("fields")
    if (
        not isinstance(prompt_fields, list)
        or any(not isinstance(field, str) for field in prompt_fields)
        or len(prompt_fields) != len(PROMPT_FIELD_ALLOWLIST)
        or set(prompt_fields) != PROMPT_FIELD_ALLOWLIST
    ):
        raise ContractError(
            "run.promptInputs.fields must be exactly the reviewed morphology allowlist"
        )

    withheld = run.get("withheldComparisonDimensions")
    if (
        not isinstance(withheld, list)
        or any(not isinstance(dimension, str) for dimension in withheld)
        or len(withheld) != len(WITHHELD_DIMENSIONS)
        or set(withheld) != WITHHELD_DIMENSIONS
    ):
        raise ContractError(
            "run.withheldComparisonDimensions must contain population, annualEnergyUseJ, "
            "and growthState"
        )

    outcome = _require_mapping(run.get("outcome"), "run.outcome")
    expected_outcome_fields = {"population", "annualEnergyUseJ", "growthState"}
    if set(outcome) != expected_outcome_fields:
        raise ContractError(f"run.outcome fields must be exactly {sorted(expected_outcome_fields)}")
    _validate_optional_measure(outcome.get("population"), "run.outcome.population")
    _validate_optional_measure(outcome.get("annualEnergyUseJ"), "run.outcome.annualEnergyUseJ")
    growth_state = outcome.get("growthState")
    if growth_state is not None and growth_state not in GROWTH_STATES:
        raise ContractError("run.outcome.growthState must be growing, stable, oscillatory, or null")

    limitations = run.get("limitations")
    if not isinstance(limitations, list) or not limitations:
        raise ContractError("run.limitations must be a non-empty array")
    if any(not isinstance(item, str) or not item.strip() for item in limitations):
        raise ContractError("run.limitations entries must be non-empty strings")

    return run
