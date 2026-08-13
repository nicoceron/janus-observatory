"""Deterministic, source-preserving comparison of agent runs and Janus records."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

from janus_concordia.canonical import find_scenario_record, load_growth_dataset
from janus_concordia.contract import validate_run_record


def _source_ref(dataset: dict[str, Any]) -> dict[str, Any]:
    source = dataset["source"]
    return {
        "datasetId": dataset["id"],
        "datasetSchemaVersion": dataset["schemaVersion"],
        "sourceId": source["sourceId"],
        "sourceVersion": source["sourceVersion"],
        "locator": source["locator"],
        "contentOrigin": dataset["contentOrigin"],
        "evidenceKind": dataset["evidenceKind"],
    }


def _numeric_dimension(
    *,
    canonical: int | float,
    generated: int | float | None,
    unit: str,
    canonical_content_origin: str,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "canonical": {
            "value": canonical,
            "unit": unit,
            "evidenceKind": "reported",
            "contentOrigin": canonical_content_origin,
        },
        "agentRun": {
            "value": generated,
            "unit": unit,
            "evidenceKind": "model_generated",
            "contentOrigin": "model_generated",
        },
        "comparison": {
            "status": "unavailable",
            "evidenceKind": "derived",
            "contentOrigin": "derived",
        },
    }
    if generated is None:
        return result

    ratio = generated / canonical if canonical != 0 else None
    result["comparison"] = {
        "status": "available",
        "absoluteDifference": generated - canonical,
        "ratioToCanonical": ratio,
        "log10RatioToCanonical": math.log10(ratio) if ratio and ratio > 0 else None,
        "evidenceKind": "derived",
        "contentOrigin": "derived",
    }
    return result


def compare_run(run_value: Any, repository_root: Path | None = None) -> dict[str, Any]:
    """Compare one run without collapsing dimensions into an aggregate score."""

    run = validate_run_record(run_value)
    dataset = load_growth_dataset(repository_root)
    canonical = find_scenario_record(dataset, run["targetScenarioId"])
    outcome = run["outcome"]

    return {
        "schemaVersion": "1.0.0",
        "kind": "janus_concordia_dimension_comparison",
        "statement": (
            "This compares a model-generated research run with a published Janus scenario. "
            "It is not a forecast, probability estimate, or scenario ranking."
        ),
        "runId": run["runId"],
        "scenarioId": run["targetScenarioId"],
        "canonicalSource": _source_ref(dataset),
        "dimensions": {
            "population": _numeric_dimension(
                canonical=canonical["population"],
                generated=outcome.get("population"),
                unit="people",
                canonical_content_origin=dataset["contentOrigin"],
            ),
            "annualEnergyUse": _numeric_dimension(
                canonical=canonical["annualEnergyUseJ"],
                generated=outcome.get("annualEnergyUseJ"),
                unit="J/year",
                canonical_content_origin=dataset["contentOrigin"],
            ),
            "growthState": {
                "canonical": {
                    "value": canonical["growthState"],
                    "evidenceKind": "reported",
                    "contentOrigin": dataset["contentOrigin"],
                },
                "agentRun": {
                    "value": outcome.get("growthState"),
                    "evidenceKind": "model_generated",
                    "contentOrigin": "model_generated",
                },
                "comparison": {
                    "status": (
                        "unavailable" if outcome.get("growthState") is None else "available"
                    ),
                    "sameCategory": (
                        None
                        if outcome.get("growthState") is None
                        else outcome["growthState"] == canonical["growthState"]
                    ),
                    "evidenceKind": "derived",
                    "contentOrigin": "derived",
                },
            },
        },
        "limitations": [
            "No aggregate similarity score is calculated.",
            "A model-generated match does not validate the Janus scenario or the agent model.",
            "Remote model sampling may vary even when the run seed and prompt are preserved.",
        ],
    }
