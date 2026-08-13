"""Read the reviewed Janus records used only as comparison targets."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class CanonicalDataError(ValueError):
    """Raised when the expected reviewed canonical input is unavailable."""


def find_repository_root(start: Path | None = None) -> Path:
    """Locate the repository without assuming the caller's working directory."""

    origin = (start or Path(__file__)).resolve()
    candidates = [origin, *origin.parents]
    for candidate in candidates:
        if (candidate / "docs" / "MASTER_PLAN.md").is_file() and (
            candidate / "data" / "canonical"
        ).is_dir():
            return candidate
    raise CanonicalDataError("Could not locate the Janus Observatory repository root")


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise CanonicalDataError(f"Could not read canonical data at {path}: {error}") from error
    if not isinstance(value, dict):
        raise CanonicalDataError(f"Canonical data at {path} must be a JSON object")
    return value


def load_growth_dataset(repository_root: Path | None = None) -> dict[str, Any]:
    root = repository_root or find_repository_root()
    dataset = load_json(root / "data" / "canonical" / "scenarios" / "growth-table-9.json")
    required = {"id", "schemaVersion", "evidenceKind", "contentOrigin", "source", "records"}
    missing = required.difference(dataset)
    if missing:
        raise CanonicalDataError(f"Growth dataset is missing fields: {sorted(missing)}")
    if dataset["evidenceKind"] != "reported" or dataset["contentOrigin"] != "transcribed":
        raise CanonicalDataError("Growth dataset epistemic labels changed; review the experiment")
    return dataset


def load_morphology_dataset(repository_root: Path | None = None) -> dict[str, Any]:
    root = repository_root or find_repository_root()
    dataset = load_json(root / "data" / "canonical" / "scenarios" / "morphology-table-5.json")
    required = {"id", "schemaVersion", "evidenceKind", "contentOrigin", "source", "records"}
    missing = required.difference(dataset)
    if missing:
        raise CanonicalDataError(f"Morphology dataset is missing fields: {sorted(missing)}")
    if dataset["evidenceKind"] != "reported" or dataset["contentOrigin"] != "transcribed":
        raise CanonicalDataError(
            "Morphology dataset epistemic labels changed; review the experiment"
        )
    return dataset


def find_scenario_record(dataset: dict[str, Any], scenario_id: str) -> dict[str, Any]:
    records = dataset.get("records")
    if not isinstance(records, list):
        raise CanonicalDataError("Canonical dataset records must be an array")
    for record in records:
        if isinstance(record, dict) and record.get("scenarioId") == scenario_id:
            return record
    raise CanonicalDataError(f"Scenario {scenario_id} is absent from {dataset.get('id')}")
