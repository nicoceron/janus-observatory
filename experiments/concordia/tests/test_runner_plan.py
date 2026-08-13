from __future__ import annotations

import json
from pathlib import Path

import pytest

from janus_concordia.canonical import find_repository_root
from janus_concordia.concordia_runner import _build_plan, _runtime_info

EXPERIMENT_ROOT = Path(__file__).resolve().parents[1]


def test_matrix_has_one_seeded_job_per_scenario() -> None:
    matrix = json.loads(
        (EXPERIMENT_ROOT / "configs" / "experiment-matrix.json").read_text(encoding="utf-8")
    )
    jobs = matrix["runs"]
    assert {job["targetScenarioId"] for job in jobs} == {f"S{i}" for i in range(1, 11)}
    assert len({job["seed"] for job in jobs}) == 10


@pytest.mark.parametrize("scenario_id", [f"S{index}" for index in range(1, 11)])
def test_dry_plan_withholds_published_growth_targets(scenario_id: str) -> None:
    repository_root = find_repository_root(Path(__file__))
    growth = json.loads(
        (repository_root / "data" / "canonical" / "scenarios" / "growth-table-9.json").read_text(
            encoding="utf-8"
        )
    )
    target = next(record for record in growth["records"] if record["scenarioId"] == scenario_id)
    plan = _build_plan(EXPERIMENT_ROOT / "configs" / "experiment-matrix.json", scenario_id)

    assert plan["canonicalBriefPolicy"] == "morphology_only"
    assert str(target["population"]) not in plan["premise"]
    assert str(target["annualEnergyUseJ"]) not in plan["premise"]
    assert target["growthState"] not in plan["premise"].lower()
    assert (
        "published population, energy-use, and growth-state endpoints are not supplied"
        in plan["premise"]
    )
    assert plan["promptInputs"]["fields"] == [
        "scenarioId",
        "mythMetaphor",
        "globalFactor",
        "technologyCluster",
        "technologyFactors",
    ]


def test_optional_concordia_runtime_matches_the_pinned_api_when_installed() -> None:
    pytest.importorskip("concordia")
    assert _runtime_info() == {
        "framework": "gdm-concordia",
        "version": "2.4.0",
        "requiredPrefabs": ["basic__Entity", "generic__GameMaster"],
        "status": "ready",
    }


def test_prompt_hash_covers_agent_configuration(tmp_path: Path) -> None:
    source_config = EXPERIMENT_ROOT / "configs" / "experiment-matrix.json"
    config = json.loads(source_config.read_text(encoding="utf-8"))
    original_plan = _build_plan(source_config, "S4")
    config["agents"][0]["goal"] += " Preserve a record of dissent."
    modified_config = tmp_path / "experiment-matrix.json"
    modified_config.write_text(json.dumps(config), encoding="utf-8")

    modified_plan = _build_plan(modified_config, "S4")
    assert modified_plan["premise"] == original_plan["premise"]
    assert modified_plan["promptSha256"] != original_plan["promptSha256"]
