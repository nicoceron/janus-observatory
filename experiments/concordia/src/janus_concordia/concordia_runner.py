"""Optional Concordia 2.4 runner for a bounded Janus policy-council experiment."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import random
import re
from collections.abc import Collection, Mapping, Sequence
from importlib import metadata
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from janus_concordia.canonical import (
    find_scenario_record,
    load_morphology_dataset,
)
from janus_concordia.contract import ContractError, validate_run_record

EXPECTED_CONCORDIA_VERSION = "2.4.0"
EXPERIMENT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = EXPERIMENT_ROOT / "configs" / "experiment-matrix.json"


def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _load_config(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ContractError(f"Could not read experiment matrix at {path}: {error}") from error
    if not isinstance(value, dict):
        raise ContractError("Experiment matrix must be a JSON object")
    if value.get("schemaVersion") != "1.0.0":
        raise ContractError("Experiment matrix schemaVersion must be 1.0.0")
    if value.get("canonicalBriefPolicy") != "morphology_only":
        raise ContractError("Only the morphology_only anti-leakage policy is supported")
    if not isinstance(value.get("protocolVersion"), str) or not value["protocolVersion"].strip():
        raise ContractError("Experiment matrix protocolVersion must be a non-empty string")
    if not isinstance(value.get("premise"), str) or not value["premise"].strip():
        raise ContractError("Experiment matrix premise must be a non-empty string")
    max_steps = value.get("maxSteps")
    if isinstance(max_steps, bool) or not isinstance(max_steps, int) or not 1 <= max_steps <= 100:
        raise ContractError("Experiment matrix maxSteps must be an integer from 1 to 100")

    agents = value.get("agents")
    if not isinstance(agents, list) or not agents:
        raise ContractError("Experiment matrix agents must be a non-empty array")
    for index, agent in enumerate(agents):
        if not isinstance(agent, dict) or set(agent) != {"name", "goal"}:
            raise ContractError(f"Experiment matrix agent {index} must contain name and goal")
        if any(not isinstance(agent[field], str) or not agent[field].strip() for field in agent):
            raise ContractError(f"Experiment matrix agent {index} name and goal must be text")
    agent_names = [agent["name"] for agent in agents]
    if len(agent_names) != len(set(agent_names)):
        raise ContractError("Experiment matrix agent names must be unique")

    jobs = value.get("runs")
    if not isinstance(jobs, list):
        raise ContractError("Experiment matrix runs must be an array")
    scenario_ids = [job.get("targetScenarioId") for job in jobs if isinstance(job, dict)]
    expected_ids = {f"S{index}" for index in range(1, 11)}
    has_duplicate_scenarios = len(scenario_ids) != len(set(scenario_ids))
    if len(jobs) != 10 or set(scenario_ids) != expected_ids or has_duplicate_scenarios:
        raise ContractError(
            "Experiment matrix must contain exactly one run for each scenario S1-S10"
        )
    seeds = [job.get("seed") for job in jobs if isinstance(job, dict)]
    if any(isinstance(seed, bool) or not isinstance(seed, int) or seed < 0 for seed in seeds):
        raise ContractError("Every experiment run seed must be a non-negative integer")
    if len(seeds) != len(set(seeds)):
        raise ContractError("Experiment run seeds must be unique")
    return value


def _select_job(config: dict[str, Any], scenario_id: str) -> dict[str, Any]:
    jobs = config.get("runs")
    if not isinstance(jobs, list):
        raise ContractError("Experiment matrix runs must be an array")
    for job in jobs:
        if isinstance(job, dict) and job.get("targetScenarioId") == scenario_id:
            seed = job.get("seed")
            if isinstance(seed, bool) or not isinstance(seed, int) or seed < 0:
                raise ContractError(f"Invalid seed for {scenario_id}")
            return job
    raise ContractError(f"No experiment job is configured for {scenario_id}")


def _build_premise(config: dict[str, Any], morphology: dict[str, Any], scenario_id: str) -> str:
    record = find_scenario_record(morphology, scenario_id)
    lines = [
        "This is a bounded, model-generated research thought experiment.",
        "It does not forecast civilization, estimate probabilities, or generate Janus facts.",
        "The council explores one internally consistent possibility and must preserve uncertainty.",
        "Do not claim that an instrument non-detection means there is no technology.",
        "",
        "Withheld-target protocol:",
        "The published population, energy-use, and growth-state endpoints "
        "are not supplied to agents.",
        "Only reviewed scenario-construction metadata is supplied:",
        f"- Scenario: {record['scenarioId']} — {record['mythMetaphor']}",
        f"- Global factor code: {record['globalFactor']}",
        f"- Technology cluster: {record['technologyCluster']}",
        f"- Technology factor codes: {', '.join(record['technologyFactors'])}",
        "",
        str(config["premise"]),
        "At each turn, propose one concrete decision, state the tradeoff, "
        "and name missing evidence.",
    ]
    return "\n".join(lines)


def _build_plan(config_path: Path, scenario_id: str) -> dict[str, Any]:
    config = _load_config(config_path)
    job = _select_job(config, scenario_id)
    morphology = load_morphology_dataset()
    premise = _build_premise(config, morphology, scenario_id)
    prompt_material = {
        "agents": config["agents"],
        "maxSteps": config["maxSteps"],
        "premise": premise,
        "protocolVersion": config["protocolVersion"],
    }
    return {
        "targetScenarioId": scenario_id,
        "seed": job["seed"],
        "protocolVersion": config["protocolVersion"],
        "maxSteps": config["maxSteps"],
        "agents": config["agents"],
        "premise": premise,
        "promptSha256": _sha256_text(
            json.dumps(prompt_material, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        ),
        "canonicalBriefPolicy": config["canonicalBriefPolicy"],
        "promptInputs": {
            "datasetId": morphology["id"],
            "datasetSchemaVersion": morphology["schemaVersion"],
            "sourceId": morphology["source"]["sourceId"],
            "sourceVersion": morphology["source"]["sourceVersion"],
            "locator": morphology["source"]["locator"],
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
    }


def _extract_json_object(text: str) -> dict[str, Any]:
    decoder = json.JSONDecoder()
    for index, character in enumerate(text):
        if character != "{":
            continue
        try:
            value, _ = decoder.raw_decode(text[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value
    raise ContractError("Outcome extractor did not return a JSON object")


def _validate_outcome(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ContractError("Extracted outcome must be an object")
    expected = {"population", "annualEnergyUseJ", "growthState"}
    if set(value) != expected:
        raise ContractError(f"Extracted outcome fields must be exactly {sorted(expected)}")

    for key in ("population", "annualEnergyUseJ"):
        item = value[key]
        if item is not None and (isinstance(item, bool) or not isinstance(item, (int, float))):
            raise ContractError(f"Extracted {key} must be a number or null")
        if isinstance(item, (int, float)) and item < 0:
            raise ContractError(f"Extracted {key} must be non-negative")
    if value["growthState"] not in {"growing", "stable", "oscillatory", None}:
        raise ContractError("Extracted growthState is outside the allowed categories")
    return value


def _outcome_prompt(actions: list[dict[str, Any]]) -> str:
    return "\n".join(
        [
            "Extract a terminal state from this model-generated simulation transcript.",
            "Return JSON only, with exactly these keys:",
            '{"population": number|null, "annualEnergyUseJ": number|null, '
            '"growthState": "growing"|"stable"|"oscillatory"|null}',
            "Use null unless the transcript explicitly states or commits to a value.",
            "Do not estimate missing quantities. Do not add explanation.",
            "Transcript actions:",
            json.dumps(actions, sort_keys=True),
        ]
    )


def _provider_label(api_base: str) -> str:
    hostname = urlparse(api_base).hostname
    return hostname or "openai-compatible"


def _runtime_info() -> dict[str, Any]:
    """Import and validate the optional Concordia surface without contacting a provider."""

    try:
        from concordia.prefabs import entity as entity_prefabs
        from concordia.prefabs import game_master as game_master_prefabs
        from concordia.utils import helper_functions
        from openai import OpenAI  # noqa: F401
    except ImportError as error:
        raise RuntimeError(
            "Concordia runtime is not installed. Run "
            "`uv sync --project experiments/concordia --extra concordia`."
        ) from error

    installed_version = metadata.version("gdm-concordia")
    if installed_version != EXPECTED_CONCORDIA_VERSION:
        raise RuntimeError(
            f"Expected gdm-concordia {EXPECTED_CONCORDIA_VERSION}, found {installed_version}"
        )
    prefabs = {
        **helper_functions.get_package_classes(entity_prefabs),
        **helper_functions.get_package_classes(game_master_prefabs),
    }
    required_prefabs = {"basic__Entity", "generic__GameMaster"}
    missing_prefabs = sorted(required_prefabs.difference(prefabs))
    if missing_prefabs:
        raise RuntimeError(f"Concordia runtime is missing required prefabs: {missing_prefabs}")
    return {
        "framework": "gdm-concordia",
        "version": installed_version,
        "requiredPrefabs": sorted(required_prefabs),
        "status": "ready",
    }


def _run_with_concordia(plan: dict[str, Any], output_directory: Path) -> Path:
    try:
        import numpy as np
        from concordia.contrib.language_models.openai import base_gpt_model
        from concordia.language_model import language_model
        from concordia.prefabs import entity as entity_prefabs
        from concordia.prefabs import game_master as game_master_prefabs
        from concordia.prefabs.simulation import generic as simulation
        from concordia.typing import prefab as prefab_lib
        from concordia.utils import helper_functions, structured_logging
        from openai import OpenAI
    except ImportError as error:
        raise RuntimeError(
            "Concordia runtime is not installed. Run "
            "`uv sync --project experiments/concordia --extra concordia`."
        ) from error

    installed_version = _runtime_info()["version"]

    api_key = os.getenv("CONCORDIA_API_KEY")
    api_base = os.getenv("CONCORDIA_API_BASE", "https://api.deepseek.com")
    model_id = os.getenv("CONCORDIA_MODEL", "deepseek-v4-flash")
    if not api_key:
        raise RuntimeError("CONCORDIA_API_KEY is required for a live run")

    class CompatibleModel(base_gpt_model.BaseGPTModel):
        """Concordia model adapter avoiding provider-specific GPT parameters."""

        def __init__(self) -> None:
            super().__init__(
                model_name=model_id,
                client=OpenAI(api_key=api_key, base_url=api_base),
            )

        def sample_text(
            self,
            prompt: str,
            *,
            max_tokens: int = language_model.DEFAULT_MAX_TOKENS,
            terminators: Collection[str] = language_model.DEFAULT_TERMINATORS,
            temperature: float = language_model.DEFAULT_TEMPERATURE,
            top_p: float = language_model.DEFAULT_TOP_P,
            top_k: int = language_model.DEFAULT_TOP_K,
            timeout: float = language_model.DEFAULT_TIMEOUT_SECONDS,
            seed: int | None = None,
        ) -> str:
            del top_k, seed
            response = self._client.chat.completions.create(
                model=self._model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                timeout=timeout,
            )
            content = response.choices[0].message.content or ""
            for terminator in terminators:
                content = content.split(terminator, 1)[0]
            return content

        def sample_choice(
            self,
            prompt: str,
            responses: Sequence[str],
            *,
            seed: int | None = None,
        ) -> tuple[int, str, Mapping[str, Any]]:
            del seed
            choice_prompt = (
                f"{prompt}\nReturn exactly one allowed value and nothing else:\n"
                + "\n".join(responses)
            )
            for attempt in range(5):
                answer = self.sample_text(choice_prompt, temperature=0).strip()
                if answer in responses:
                    index = responses.index(answer)
                    return index, responses[index], {"attempts": attempt + 1}
                for index, response in enumerate(responses):
                    if re.fullmatch(rf"[\s\"'`]*{re.escape(response)}[\s\"'`.]*", answer):
                        return index, response, {"attempts": attempt + 1}
            raise language_model.InvalidResponseError(
                f"Model did not return one of the allowed values: {list(responses)}"
            )

    def hash_embedder(text: str) -> Any:
        vector = np.zeros(256, dtype=np.float32)
        for token in re.findall(r"[a-z0-9]+", text.lower()):
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % len(vector)
            vector[index] += 1 if digest[4] & 1 else -1
        norm = np.linalg.norm(vector)
        return vector if norm == 0 else vector / norm

    # Concordia can still invoke a non-deterministic remote model. These seeds make local
    # ordering and any local randomized components reproducible for the recorded job.
    random.seed(plan["seed"])
    np.random.seed(plan["seed"])

    model = CompatibleModel()
    prefabs = {
        **helper_functions.get_package_classes(entity_prefabs),
        **helper_functions.get_package_classes(game_master_prefabs),
    }
    instances = [
        prefab_lib.InstanceConfig(
            prefab="basic__Entity",
            role=prefab_lib.Role.ENTITY,
            params={
                "name": agent["name"],
                "goal": agent["goal"],
                "randomize_choices": False,
            },
        )
        for agent in plan["agents"]
    ]
    instances.append(
        prefab_lib.InstanceConfig(
            prefab="generic__GameMaster",
            role=prefab_lib.Role.GAME_MASTER,
            params={"name": "Janus research protocol", "acting_order": "fixed"},
        )
    )
    concordia_config = prefab_lib.Config(
        default_premise=plan["premise"],
        default_max_steps=plan["maxSteps"],
        prefabs=prefabs,
        instances=instances,
    )
    runnable = simulation.Simulation(
        config=concordia_config,
        model=model,
        embedder=hash_embedder,
    )

    output_directory.mkdir(parents=True, exist_ok=True)
    started_at = dt.datetime.now(dt.UTC).replace(microsecond=0)
    log = runnable.play()
    transcript_json = log.to_json(indent=2)
    transcript_path = output_directory / "transcript.json"
    transcript_file_content = transcript_json + "\n"
    transcript_path.write_text(transcript_file_content, encoding="utf-8")
    transcript_sha = _sha256_text(transcript_file_content)

    interface = structured_logging.AIAgentLogInterface(log)
    actions = interface.get_component_values(component_key="__act__", value_key="Value")
    outcome_text = model.sample_text(_outcome_prompt(actions), temperature=0, max_tokens=300)
    outcome = _validate_outcome(_extract_json_object(outcome_text))

    completed_at = dt.datetime.now(dt.UTC).replace(microsecond=0)
    run_id = (
        f"{plan['targetScenarioId'].lower()}-{plan['seed']}-{completed_at:%Y%m%dT%H%M%SZ}"
    )
    run_record = {
        "schemaVersion": "1.0.0",
        "runId": run_id,
        "evidenceKind": "model_generated",
        "contentOrigin": "model_generated",
        "targetScenarioId": plan["targetScenarioId"],
        "seed": plan["seed"],
        "framework": {"name": "gdm-concordia", "version": installed_version},
        "model": {
            "provider": _provider_label(api_base),
            "modelId": model_id,
        },
        "protocolVersion": plan["protocolVersion"],
        "promptInputs": plan["promptInputs"],
        "withheldComparisonDimensions": plan["withheldComparisonDimensions"],
        "promptSha256": plan["promptSha256"],
        "transcriptSha256": transcript_sha,
        "startedAt": started_at.isoformat(),
        "completedAt": completed_at.isoformat(),
        "outcome": outcome,
        "artifacts": {"transcript": transcript_path.name},
        "limitations": [
            "This output is model-generated and is not a Janus fact or forecast.",
            "The seed controls local ordering; the remote model may not reproduce identical text.",
            "The built-in hash embedder is deterministic but only supports lexical overlap.",
            "Published target dimensions were withheld from the agents and used "
            "only after the run.",
        ],
    }
    validate_run_record(run_record)
    run_path = output_directory / "run.json"
    run_path.write_text(json.dumps(run_record, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return run_path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--scenario", required=True, choices=[f"S{i}" for i in range(1, 11)])
    parser.add_argument("--output-directory", type=Path)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate inputs and print the withheld-target plan without importing Concordia.",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    plan = _build_plan(args.config, args.scenario)
    if args.dry_run:
        print(json.dumps(plan, indent=2, sort_keys=True))
        return
    output_directory = args.output_directory or EXPERIMENT_ROOT / "artifacts" / "runs" / (
        f"{args.scenario.lower()}-{plan['seed']}"
    )
    run_path = _run_with_concordia(plan, output_directory)
    print(run_path)


def check_runtime_main() -> None:
    """CLI entry point for an offline optional-runtime smoke check."""

    print(json.dumps(_runtime_info(), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
