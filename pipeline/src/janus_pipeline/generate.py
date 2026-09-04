"""Generate reviewed-release candidates, downloads, review packets, and lexical corpus.

The generator never invents canonical scientific values. It validates and republishes the reviewed
transcriptions, extracts only verified-open paper text, records unresolved review gates, and keeps
the optional resilience experiment outside canonical data.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import io
import json
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any

from pypdf import PdfReader

from .models import (
    CollapseDataset,
    CorpusChunk,
    ObservabilityDataset,
    PlanetaryTechnosignatureDataset,
    PublishedNumericTable,
    ReviewerRecord,
    ScenarioGrowthDataset,
    ScenarioMorphologyDataset,
    SourceManifest,
    SourceReference,
    SystemTechnosignatureDataset,
    TableEquivalenceRecord,
)

WORKSPACE = Path(__file__).resolve().parents[3]
DEFAULT_OUTPUT = WORKSPACE / "data" / "generated"
SOURCE_MANIFEST_PATH = WORKSPACE / "data" / "sources" / "manifest.json"
RESILIENCE_REPORT_PATH = (
    WORKSPACE / "experiments" / "resilience-lab" / "reports" / "replication-report.json"
)
RESILIENCE_EXPERIMENT_ROOT = WORKSPACE / "experiments" / "resilience-lab"
SCENARIO_IDS = tuple(f"S{index}" for index in range(1, 11))
MISSION_IDS = (
    "habitable_worlds_observatory",
    "radio",
    "large_interferometer_for_exoplanets",
    "solar_gravitational_lens",
    "deep_space_probes",
)

CANONICAL_FILES = {
    "earthAtmosphere": Path("data/canonical/atmosphere/earth-apjl-table-1.json"),
    "venusAtmosphere": Path("data/canonical/atmosphere/venus-apjl-table-2.json"),
    "collapse": Path("data/canonical/collapse/model-and-reported-results.json"),
    "observability": Path("data/canonical/observability/figure-6.json"),
    "growth": Path("data/canonical/scenarios/growth-table-9.json"),
    "morphology": Path("data/canonical/scenarios/morphology-table-5.json"),
    "planetary": Path("data/canonical/technosignatures/planetary-table-6.json"),
    "system": Path("data/canonical/technosignatures/system-table-8.json"),
}
RUNTIME_FILES = {
    "earthAtmosphere": "earth-atmosphere.json",
    "venusAtmosphere": "venus-atmosphere.json",
    "collapse": "collapse.json",
    "observability": "observability.json",
    "growth": "growth.json",
    "morphology": "morphology.json",
    "planetary": "planetary.json",
    "system": "system.json",
}

TABLE_SEVEN_COLUMNS = ("R0", "R1", *SCENARIO_IDS)
TABLE_SEVEN_ROWS = (
    ("co2", "CO2 (ppm)", "ppm", r"^CO2 \(ppm\)\s+"),
    ("ch4", "CH4 (ppm)", "ppm", r"^CH4 \(ppm\)\s+"),
    ("nox", "NOx (ppb)", "ppb", r"^NO. \(ppb\)\s+"),
    ("n2o", "N2O (ppb)", "ppb", r"^N2O \(ppb\)\s+"),
    ("nh3", "NH3 (ppb)", "ppb", r"^NH3 \(ppb\)\s+"),
    ("cfc_11", "CFC-11 (ppb)", "ppb", r"^CFC-11 \(ppb\)b\s+"),
    ("cfc_12", "CFC-12 (ppb)", "ppb", r"^CFC-12 \(ppb\)b\s+"),
    ("cf4", "CF4 (ppt)", "ppt", r"^CF4 \(ppt\)c\s+"),
    ("sf6", "SF6 (ppt)", "ppt", r"^SF6 \(ppt\)c\s+"),
    ("nf3", "NF3 (ppt)", "ppt", r"^NF3 \(ppt\)c\s+"),
)


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def resilience_implementation_record() -> dict[str, Any]:
    """Fingerprint every file that can change the independent collapse result.

    Git commit metadata is insufficient here because the experiments tree may be
    dirty or untracked. This duplicates the deliberately small fingerprint contract
    in ``janus_resilience.provenance`` so release generation can fail closed without
    importing or executing an optional experiment package.
    """

    required = [
        RESILIENCE_EXPERIMENT_ROOT / "ADR-0001.md",
        RESILIENCE_EXPERIMENT_ROOT / "pyproject.toml",
        RESILIENCE_EXPERIMENT_ROOT / "uv.lock",
    ]
    source_files = sorted((RESILIENCE_EXPERIMENT_ROOT / "src" / "janus_resilience").glob("*.py"))
    files = sorted(
        [*required, *source_files],
        key=lambda path: path.relative_to(RESILIENCE_EXPERIMENT_ROOT).as_posix(),
    )
    if missing := [path for path in files if not path.is_file()]:
        raise ValueError(
            "Resilience implementation fingerprint is missing: "
            + ", ".join(str(path) for path in missing)
        )
    records = [
        {
            "path": path.relative_to(RESILIENCE_EXPERIMENT_ROOT).as_posix(),
            "sha256": sha256_bytes(path.read_bytes()),
        }
        for path in files
    ]
    canonical_input = WORKSPACE / CANONICAL_FILES["collapse"]
    return {
        "algorithm": "sha256-file-manifest-v1",
        "treeHash": f"sha256:{sha256_bytes(canonical_json(records))}",
        "canonicalInputHash": f"sha256:{sha256_bytes(canonical_input.read_bytes())}",
        "files": records,
    }


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(value, indent=2, ensure_ascii=False)}\n", encoding="utf-8")


def write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding="utf-8")


def require_exact_ids(label: str, values: list[str], expected: tuple[str, ...]) -> None:
    if len(values) != len(set(values)) or set(values) != set(expected):
        raise ValueError(f"{label} must contain every required ID exactly once; received {values}")


def load_canonical() -> tuple[dict[str, Any], dict[str, Any]]:
    raw = {name: load_json(WORKSPACE / path) for name, path in CANONICAL_FILES.items()}
    parsed: dict[str, Any] = {
        "earthAtmosphere": PublishedNumericTable.model_validate(raw["earthAtmosphere"]),
        "venusAtmosphere": PublishedNumericTable.model_validate(raw["venusAtmosphere"]),
        "collapse": CollapseDataset.model_validate(raw["collapse"]),
        "observability": ObservabilityDataset.model_validate(raw["observability"]),
        "growth": ScenarioGrowthDataset.model_validate(raw["growth"]),
        "morphology": ScenarioMorphologyDataset.model_validate(raw["morphology"]),
        "planetary": PlanetaryTechnosignatureDataset.model_validate(raw["planetary"]),
        "system": SystemTechnosignatureDataset.model_validate(raw["system"]),
    }

    require_exact_ids(
        "morphology",
        [record.scenario_id for record in parsed["morphology"].records],
        SCENARIO_IDS,
    )
    require_exact_ids(
        "growth",
        [record.scenario_id for record in parsed["growth"].records],
        SCENARIO_IDS,
    )
    require_exact_ids(
        "collapse",
        [record.scenario_id for record in parsed["collapse"].scenarios],
        SCENARIO_IDS,
    )
    require_exact_ids(
        "observability",
        [record.scenario_id for record in parsed["observability"].records],
        SCENARIO_IDS,
    )
    require_exact_ids(
        "observability missions",
        [mission.id for mission in parsed["observability"].missions],
        MISSION_IDS,
    )
    return raw, parsed


def resolve_source(manifest: SourceManifest, source_ref: Any) -> Any:
    matches = [
        entry
        for entry in manifest.entries
        if (entry.id == source_ref.source_id or entry.citation_id == source_ref.source_id)
        and entry.version == source_ref.source_version
    ]
    if len(matches) != 1:
        raise ValueError(
            f"Source {source_ref.source_id}@{source_ref.source_version} resolved to "
            f"{len(matches)} entries"
        )
    if matches[0].rights_status != "verified_open":
        raise ValueError(f"Canonical data source {matches[0].id} is not verified open")
    return matches[0]


def source_aliases(parsed: dict[str, Any], manifest: SourceManifest) -> dict[str, str]:
    aliases: dict[str, str] = {}
    for dataset in parsed.values():
        source = resolve_source(manifest, dataset.source)
        if source.citation_id != dataset.source.source_id:
            raise ValueError(
                f"Canonical source alias {dataset.source.source_id} is not declared by {source.id}"
            )
        aliases[source.id] = source.citation_id
    return aliases


def extract_page_text(source_path: Path, page: int) -> str:
    reader = PdfReader(source_path)
    if page < 1 or page > len(reader.pages):
        raise ValueError(f"Page {page} is outside {source_path} ({len(reader.pages)} pages)")
    text = reader.pages[page - 1].extract_text() or ""
    return normalize_text(text)


def normalize_text(text: str) -> str:
    text = text.replace("\x00", " ").replace("\u00ad", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(text: str, maximum: int = 3_200, overlap: int = 350) -> list[str]:
    if len(text) <= maximum:
        return [text] if text else []
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + maximum, len(text))
        if end < len(text):
            break_at = text.rfind(" ", start + maximum // 2, end)
            if break_at > start:
                end = break_at
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)
    return chunks


def scenarios_in_text(text: str) -> list[str]:
    found = set(re.findall(r"\bS(?:10|[1-9])\b", text))
    return [scenario_id for scenario_id in SCENARIO_IDS if scenario_id in found]


def build_paper_corpus(manifest: SourceManifest, aliases: dict[str, str]) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for source in manifest.entries:
        if (
            source.rights_status != "verified_open"
            or not source.license
            or not source.local_path
            or source.kind not in {"paper", "preprint"}
        ):
            continue
        reader = PdfReader(WORKSPACE / source.local_path)
        citation_id = aliases.get(source.id, source.citation_id or source.id)
        for page_number, page in enumerate(reader.pages, start=1):
            text = normalize_text(page.extract_text() or "")
            for index, part in enumerate(chunk_text(text), start=1):
                record = {
                    "chunkId": f"{citation_id}:p{page_number}:c{index}",
                    "sourceId": citation_id,
                    "sourceVersion": source.version,
                    "scenarioIds": scenarios_in_text(part),
                    "pageStart": page_number,
                    "pageEnd": page_number,
                    "headingPath": [source.title, f"Page {page_number}"],
                    "text": part,
                    "contentHash": f"sha256:{sha256_bytes(part.encode())}",
                    "rights": source.license,
                    "evidenceKind": "reported",
                }
                CorpusChunk.model_validate(record)
                chunks.append(record)
    return chunks


def build_structured_corpus(raw: dict[str, Any]) -> list[dict[str, Any]]:
    morphology = {record["scenarioId"]: record for record in raw["morphology"]["records"]}
    growth = {record["scenarioId"]: record for record in raw["growth"]["records"]}
    observations = {record["scenarioId"]: record for record in raw["observability"]["records"]}
    collapse = {record["scenarioId"]: record for record in raw["collapse"]["scenarios"]}
    records: list[dict[str, Any]] = []

    def append(
        scenario_id: str,
        topic: str,
        dataset: dict[str, Any],
        text: str,
    ) -> None:
        source = dataset["source"]
        page = source["locator"]["page"]
        record = {
            "chunkId": f"canonical:{scenario_id.lower()}:{topic}",
            "sourceId": source["sourceId"],
            "sourceVersion": source["sourceVersion"],
            "scenarioIds": [scenario_id],
            "pageStart": page,
            "pageEnd": page,
            "headingPath": [dataset["title"], scenario_id],
            "text": text,
            "contentHash": f"sha256:{sha256_bytes(text.encode())}",
            "rights": dataset["sourceLicense"],
            "evidenceKind": "transcribed",
        }
        CorpusChunk.model_validate(record)
        records.append(record)

    for scenario_id in SCENARIO_IDS:
        morph = morphology[scenario_id]
        trajectory = growth[scenario_id]
        obs = observations[scenario_id]
        collapse_record = collapse[scenario_id]
        append(
            scenario_id,
            "scenario",
            raw["morphology"],
            (
                f"{scenario_id} is a Project Janus possibility, not a forecast or probability. "
                f"The canonical source summary says: {morph['canonicalSummary']['value']} "
                f"Table 5 assigns global factor {morph['globalFactor']}, technology cluster "
                f"{morph['technologyCluster']}, technology factors "
                f"{', '.join(morph['technologyFactors'])}, and myth/metaphor "
                f"{morph['mythMetaphor']}. The morphology records economy "
                f"{morph['economy']['value']}, politics {morph['politics']['value']}, society "
                f"{morph['society']['value']}, technosphere/biosphere relationship "
                f"{'; '.join(morph['technosphere']['value'])}, spatial distribution "
                f"{'; '.join(morph['spatialDistribution']['value'])}, development "
                f"{'; '.join(morph['development']['value'])}, connectivity "
                f"{'; '.join(morph['connectivity']['value'])}, and smallest scale "
                f"{'; '.join(morph['smallestScale']['value'])}. The standalone biosphere "
                f"field is {morph['biosphere']['captureStatus']}; no value is guessed from "
                "Figure 6."
            ),
        )
        rate = (
            "not reported as a numeric rate"
            if trajectory["annualGrowthRate"] is None
            else str(trajectory["annualGrowthRate"])
        )
        append(
            scenario_id,
            "growth",
            raw["growth"],
            (
                f"At the authored 1,000-year endpoint, {scenario_id} lists population "
                f"{trajectory['population']}, annual energy use "
                f"{trajectory['annualEnergyUseJ']} J, "
                f"growth state {trajectory['growthState']}, and annual growth rate {rate}. These "
                "are reported scenario values, not probabilities."
            ),
        )
        detection_text = "; ".join(
            f"{mission}: {', '.join(signatures) if signatures else 'no signature listed'}"
            for mission, signatures in obs["detections"].items()
        )
        append(
            scenario_id,
            "observability",
            raw["observability"],
            (
                f"Figure 6 lists the following mission-specific results for {scenario_id}: "
                f"{detection_text}. A blank cell means no signature is listed for that method "
                "under the paper's assumptions; it is not evidence of no technology."
            ),
        )
        reported = collapse_record["reportedResults"]
        append(
            scenario_id,
            "collapse",
            raw["collapse"],
            (
                f"The collapse-recovery paper reports this summary for {scenario_id}: "
                f"{reported['summary']} Exact values absent from prose remain null rather than "
                "being guessed from chart heights."
            ),
        )
    return records


def build_scenario_csv(raw: dict[str, Any]) -> str:
    morphology = {record["scenarioId"]: record for record in raw["morphology"]["records"]}
    growth = {record["scenarioId"]: record for record in raw["growth"]["records"]}
    stream = io.StringIO(newline="")
    fields = [
        "scenarioId",
        "globalFactor",
        "technologyCluster",
        "technologyFactors",
        "mythMetaphor",
        "canonicalSummary",
        "economy",
        "politics",
        "society",
        "technosphere",
        "biosphereCaptureStatus",
        "biosphere",
        "spatialDistribution",
        "development",
        "connectivity",
        "smallestScale",
        "population",
        "annualEnergyUseJ",
        "growthState",
        "annualGrowthRate",
        "sourceIds",
        "fieldProvenanceJson",
    ]
    writer = csv.DictWriter(stream, fieldnames=fields, lineterminator="\n", extrasaction="ignore")
    writer.writeheader()
    for scenario_id in SCENARIO_IDS:
        writer.writerow(
            {
                **morphology[scenario_id],
                **growth[scenario_id],
                "technologyFactors": "|".join(morphology[scenario_id]["technologyFactors"]),
                "canonicalSummary": morphology[scenario_id]["canonicalSummary"]["value"],
                "economy": morphology[scenario_id]["economy"]["value"],
                "politics": morphology[scenario_id]["politics"]["value"],
                "society": morphology[scenario_id]["society"]["value"],
                "technosphere": "|".join(morphology[scenario_id]["technosphere"]["value"]),
                "biosphereCaptureStatus": morphology[scenario_id]["biosphere"]["captureStatus"],
                "biosphere": morphology[scenario_id]["biosphere"]["value"],
                "spatialDistribution": "|".join(
                    morphology[scenario_id]["spatialDistribution"]["value"]
                ),
                "development": "|".join(morphology[scenario_id]["development"]["value"]),
                "connectivity": "|".join(morphology[scenario_id]["connectivity"]["value"]),
                "smallestScale": "|".join(morphology[scenario_id]["smallestScale"]["value"]),
                "annualGrowthRate": growth[scenario_id]["annualGrowthRate"],
                "sourceIds": "JANUS-PAPER-01",
                "fieldProvenanceJson": json.dumps(
                    {
                        "construction": morphology[scenario_id]["fieldProvenance"],
                        "trajectory": growth[scenario_id]["fieldProvenance"],
                        "expandedMorphology": {
                            key: morphology[scenario_id][key]["sourceRefs"]
                            for key in (
                                "canonicalSummary",
                                "economy",
                                "politics",
                                "society",
                                "technosphere",
                                "biosphere",
                                "spatialDistribution",
                                "development",
                                "connectivity",
                                "smallestScale",
                            )
                        },
                    },
                    ensure_ascii=False,
                    separators=(",", ":"),
                ),
            }
        )
    return stream.getvalue()


def build_observability_csv(raw: dict[str, Any]) -> str:
    stream = io.StringIO(newline="")
    fields = [
        "scenarioId",
        "missionId",
        "status",
        "signatures",
        "sourceId",
        "sourceVersion",
        "page",
        "figure",
        "row",
        "column",
    ]
    writer = csv.DictWriter(stream, fieldnames=fields, lineterminator="\n")
    writer.writeheader()
    for record in raw["observability"]["records"]:
        for mission_id in MISSION_IDS:
            signatures = record["detections"][mission_id]
            source = record["detectionProvenance"][mission_id][0]
            writer.writerow(
                {
                    "scenarioId": record["scenarioId"],
                    "missionId": mission_id,
                    "status": "reported_listed" if signatures else "no_signature_listed",
                    "signatures": "|".join(signatures),
                    "sourceId": source["sourceId"],
                    "sourceVersion": source["sourceVersion"],
                    "page": source["locator"]["page"],
                    "figure": source["locator"]["figure"],
                    "row": source["locator"]["row"],
                    "column": source["locator"]["column"],
                }
            )
    return stream.getvalue()


def build_review_packet(
    raw: dict[str, Any], parsed: dict[str, Any], manifest: SourceManifest, data_version: str
) -> dict[str, Any]:
    def collect_source_references(value: Any) -> list[SourceReference]:
        references: list[SourceReference] = []
        if isinstance(value, dict):
            if {"sourceId", "sourceVersion", "locator"}.issubset(value):
                references.append(SourceReference.model_validate(value))
            for child in value.values():
                references.extend(collect_source_references(child))
        elif isinstance(value, list):
            for child in value:
                references.extend(collect_source_references(child))
        return references

    datasets: list[dict[str, Any]] = []
    for name, dataset in parsed.items():
        source = resolve_source(manifest, dataset.source)
        if not source.local_path or not dataset.source.locator.page:
            raise ValueError(f"{dataset.id} cannot produce a page-level review packet")
        page = dataset.source.locator.page
        source_text = extract_page_text(WORKSPACE / source.local_path, page)
        referenced_pages: dict[tuple[str, str, int], dict[str, Any]] = {}
        for source_ref in collect_source_references(raw[name]):
            referenced_source = resolve_source(manifest, source_ref)
            referenced_page = source_ref.locator.page
            if not referenced_source.local_path or not referenced_page:
                continue
            key = (source_ref.source_id, source_ref.source_version, referenced_page)
            if key in referenced_pages:
                continue
            page_text = extract_page_text(WORKSPACE / referenced_source.local_path, referenced_page)
            referenced_pages[key] = {
                "sourceId": source_ref.source_id,
                "sourceVersion": source_ref.source_version,
                "resolvedManifestId": referenced_source.id,
                "page": referenced_page,
                "sourcePageTextHash": f"sha256:{sha256_bytes(page_text.encode())}",
                "sourcePageText": page_text,
            }
        datasets.append(
            {
                "name": name,
                "datasetId": dataset.id,
                "canonicalPath": str(CANONICAL_FILES[name]),
                "source": dataset.source.model_dump(by_alias=True, exclude_none=True),
                "resolvedManifestId": source.id,
                "sourceFileSha256": source.sha256,
                "sourcePageTextHash": f"sha256:{sha256_bytes(source_text.encode())}",
                "sourcePageText": source_text,
                "sourcePages": [referenced_pages[key] for key in sorted(referenced_pages)],
                "normalizedPayloadHash": (f"sha256:{sha256_bytes(canonical_json(raw[name]))}"),
                "normalizedPayload": raw[name],
                "machineChecks": [
                    "schema_valid",
                    "source_manifest_resolved",
                    "source_rights_verified_open",
                    "page_locator_extractable",
                    "field_source_pages_extractable",
                ],
                "independentHumanReview": "pending",
                "renderedReviewPage": f"review/pages/{name}.html",
            }
        )
    return {
        "schemaVersion": "1.0.0",
        "dataVersion": data_version,
        "releaseStatus": "candidate_not_reviewed",
        "reviewInstruction": (
            "An independent reviewer must compare each sourcePageText with normalizedPayload, "
            "record corrections and rationale, and sign the release before public reviewed status."
        ),
        "renderedReviewIndex": "review/pages/index.html",
        "datasets": datasets,
    }


def reviewer_attestation_hash(record: dict[str, Any]) -> str:
    """Hash the exact reviewer JSON contract, excluding only its attestation hash field."""

    payload = {key: value for key, value in record.items() if key != "attestationHash"}
    return f"sha256:{sha256_bytes(canonical_json(payload))}"


def validate_reviewer_record(
    raw_record: dict[str, Any],
    review_packet: dict[str, Any],
    reconciliation: dict[str, Any],
) -> ReviewerRecord:
    record = ReviewerRecord.model_validate(raw_record)
    if record.data_version != review_packet["dataVersion"]:
        raise ValueError(
            "Reviewer record dataVersion does not match the canonical release candidate."
        )
    calculated_attestation = reviewer_attestation_hash(raw_record)
    if record.attestation_hash != calculated_attestation:
        raise ValueError(
            "Reviewer record attestationHash does not match canonical JSON excluding only "
            "attestationHash."
        )

    expected_datasets = {
        dataset["datasetId"]: dataset["normalizedPayloadHash"]
        for dataset in review_packet["datasets"]
    }
    approvals = {approval.dataset_id: approval for approval in record.dataset_approvals}
    if set(approvals) != set(expected_datasets):
        missing = sorted(set(expected_datasets) - set(approvals))
        unexpected = sorted(set(approvals) - set(expected_datasets))
        raise ValueError(
            "Reviewer record must approve every canonical dataset exactly once; "
            f"missing {missing}, unexpected {unexpected}."
        )
    for dataset_id, payload_hash in expected_datasets.items():
        if approvals[dataset_id].normalized_payload_hash != payload_hash:
            raise ValueError(
                f"Reviewer approval for {dataset_id} does not match its normalized payload hash."
            )

    reconciliation_approvals = {
        approval.reconciliation_id: approval for approval in record.reconciliation_approvals
    }
    expected_reconciliation_id = reconciliation["reconciliationId"]
    if set(reconciliation_approvals) != {expected_reconciliation_id}:
        raise ValueError("Reviewer record must approve the exact generated reconciliation once.")
    if (
        reconciliation_approvals[expected_reconciliation_id].reconciliation_payload_hash
        != reconciliation["reconciliationPayloadHash"]
    ):
        raise ValueError(
            "Reviewer reconciliation approval does not match the generated payload hash."
        )
    return record


def apply_reviewer_record(
    raw_record: dict[str, Any],
    review_packet: dict[str, Any],
    reconciliation: dict[str, Any],
) -> ReviewerRecord:
    record = validate_reviewer_record(raw_record, review_packet, reconciliation)
    dataset_approvals = {
        approval["datasetId"]: approval for approval in raw_record["datasetApprovals"]
    }
    review_packet.update(
        {
            "releaseStatus": "reviewed",
            "reviewInstruction": (
                "Independent source-versus-normalized review is approved by the named reviewer "
                "and bound to this exact data version and payload set."
            ),
            "reviewer": raw_record["reviewer"],
            "reviewRecord": "review/reviewer-record.json",
            "reviewAttestationHash": record.attestation_hash,
        }
    )
    for dataset in review_packet["datasets"]:
        dataset.update(
            {
                "independentHumanReview": "approved",
                "reviewApproval": dataset_approvals[dataset["datasetId"]],
                "reviewAttestationHash": record.attestation_hash,
            }
        )

    reconciliation_approval = raw_record["reconciliationApprovals"][0]
    reconciliation.update(
        {
            "releaseStatus": "reviewed",
            "independentHumanReview": "approved",
            "reviewApproval": reconciliation_approval,
            "reviewAttestationHash": record.attestation_hash,
        }
    )
    TableEquivalenceRecord.model_validate(reconciliation)
    return record


def _parse_table_number(token: str) -> int | float | None:
    cleaned = re.sub(r"[abc]$", "", token.strip()).replace(",", "")
    if cleaned in {"–", "—", "-", "⋯"}:
        return None
    value = float(cleaned)
    return int(value) if value.is_integer() and "." not in cleaned else value


def parse_foundational_table_seven(source_text: str) -> dict[str, dict[str, int | float | None]]:
    """Extract the published Table 7 overlap without creating a second canonical dataset."""
    lines = source_text.splitlines()
    parsed: dict[str, dict[str, int | float | None]] = {}
    for row_id, _label, _unit, pattern in TABLE_SEVEN_ROWS:
        matches = [line for line in lines if re.match(pattern, line)]
        if len(matches) != 1:
            raise ValueError(f"Foundational Table 7 row {row_id} resolved to {len(matches)} lines")
        values_text = re.sub(pattern, "", matches[0])
        tokens = values_text.split()
        if len(tokens) != len(TABLE_SEVEN_COLUMNS):
            raise ValueError(
                f"Foundational Table 7 row {row_id} has {len(tokens)} values; "
                f"expected {len(TABLE_SEVEN_COLUMNS)}"
            )
        parsed[row_id] = {
            column: _parse_table_number(token)
            for column, token in zip(TABLE_SEVEN_COLUMNS, tokens, strict=True)
        }
    return parsed


def reconciliation_payload_hash(record: dict[str, Any]) -> str:
    review_metadata = {
        "releaseStatus",
        "independentHumanReview",
        "reviewAttestationHash",
        "reviewApproval",
        "reconciliationPayloadHash",
    }
    payload = {key: value for key, value in record.items() if key not in review_metadata}
    return f"sha256:{sha256_bytes(canonical_json(payload))}"


def build_table_seven_reconciliation(
    raw: dict[str, Any], manifest: SourceManifest, data_version: str
) -> dict[str, Any]:
    foundational_ref = SourceReference.model_validate(
        {
            "sourceId": "JANUS-PAPER-01",
            "sourceVersion": "arXiv:2409.00067v3",
            "evidenceKind": "reported",
            "locator": {"page": 15, "table": "Table 7"},
        }
    )
    foundational_source = resolve_source(manifest, foundational_ref)
    consolidated_ref = SourceReference.model_validate(raw["earthAtmosphere"]["source"])
    consolidated_source = resolve_source(manifest, consolidated_ref)
    if not foundational_source.local_path or not consolidated_source.local_path:
        raise ValueError("Table reconciliation requires both verified-open locked source files")

    foundational_text = extract_page_text(WORKSPACE / foundational_source.local_path, 15)
    consolidated_page = consolidated_ref.locator.page
    if not consolidated_page:
        raise ValueError("Consolidated Table 1 requires a page locator")
    consolidated_text = extract_page_text(
        WORKSPACE / consolidated_source.local_path, consolidated_page
    )
    foundational_values = parse_foundational_table_seven(foundational_text)
    canonical_rows = {row["id"]: row for row in raw["earthAtmosphere"]["rows"]}

    foundational_overlap: dict[str, Any] = {
        "columns": list(TABLE_SEVEN_COLUMNS),
        "rows": [],
    }
    consolidated_overlap: dict[str, Any] = {
        "columns": list(TABLE_SEVEN_COLUMNS),
        "rows": [],
    }
    row_coverage = []
    for row_id, foundational_label, unit, _pattern in TABLE_SEVEN_ROWS:
        canonical_row = canonical_rows.get(row_id)
        if not canonical_row:
            raise ValueError(f"Consolidated Table 1 is missing overlap row {row_id}")
        if canonical_row["unit"] != unit:
            raise ValueError(
                f"Consolidated Table 1 row {row_id} unit {canonical_row['unit']} != {unit}"
            )
        foundational_row = {
            "canonicalRowId": row_id,
            "unit": unit,
            "values": foundational_values[row_id],
        }
        consolidated_row = {
            "canonicalRowId": row_id,
            "unit": unit,
            "values": {column: canonical_row["values"][column] for column in TABLE_SEVEN_COLUMNS},
        }
        foundational_overlap["rows"].append(foundational_row)
        consolidated_overlap["rows"].append(consolidated_row)
        foundational_hash = f"sha256:{sha256_bytes(canonical_json(foundational_row))}"
        consolidated_hash = f"sha256:{sha256_bytes(canonical_json(consolidated_row))}"
        if foundational_hash != consolidated_hash:
            raise ValueError(f"Published Table 7 and Table 1 differ for overlap row {row_id}")
        row_coverage.append(
            {
                "canonicalRowId": row_id,
                "foundationalRowLabel": foundational_label,
                "unit": unit,
                "columns": list(TABLE_SEVEN_COLUMNS),
                "cellCount": len(TABLE_SEVEN_COLUMNS),
                "status": "exact_match",
                "foundationalValuesHash": foundational_hash,
                "consolidatedValuesHash": consolidated_hash,
            }
        )

    foundational_overlap_hash = f"sha256:{sha256_bytes(canonical_json(foundational_overlap))}"
    consolidated_overlap_hash = f"sha256:{sha256_bytes(canonical_json(consolidated_overlap))}"
    if foundational_overlap_hash != consolidated_overlap_hash:
        raise ValueError("Published Table 7 and Table 1 overlap hashes differ")

    record = {
        "schemaVersion": "1.0.0",
        "dataVersion": data_version,
        "reconciliationId": "janus.reconciliation.paper-01-table-7.paper-03-table-1",
        "releaseStatus": "candidate_not_reviewed",
        "relation": "exact_value_equivalence_for_overlap",
        "canonicalDatasetId": raw["earthAtmosphere"]["id"],
        "canonicalPath": str(CANONICAL_FILES["earthAtmosphere"]),
        "foundationalSource": {
            "sourceId": foundational_ref.source_id,
            "sourceVersion": foundational_ref.source_version,
            "resolvedManifestId": foundational_source.id,
            "sourceFileSha256": foundational_source.sha256,
            "locator": foundational_ref.locator.model_dump(exclude_none=True),
            "sourcePageTextHash": f"sha256:{sha256_bytes(foundational_text.encode())}",
        },
        "consolidatedSource": {
            "sourceId": consolidated_ref.source_id,
            "sourceVersion": consolidated_ref.source_version,
            "resolvedManifestId": consolidated_source.id,
            "sourceFileSha256": consolidated_source.sha256,
            "locator": consolidated_ref.locator.model_dump(exclude_none=True),
            "sourcePageTextHash": f"sha256:{sha256_bytes(consolidated_text.encode())}",
        },
        "overlap": {
            "columns": list(TABLE_SEVEN_COLUMNS),
            "rows": row_coverage,
            "rowCount": len(row_coverage),
            "columnCount": len(TABLE_SEVEN_COLUMNS),
            "cellCount": len(row_coverage) * len(TABLE_SEVEN_COLUMNS),
            "excludedConsolidatedRowIds": sorted(set(canonical_rows) - set(foundational_values)),
            "foundationalOverlapHash": foundational_overlap_hash,
            "consolidatedOverlapHash": consolidated_overlap_hash,
            "status": "exact_match",
        },
        "canonicalDecision": (
            "APJL Table 1 remains the single canonical Earth-atmosphere table because it exactly "
            "reproduces the Table 7 overlap and adds later observing inputs; this record does not "
            "duplicate the canonical values."
        ),
        "independentHumanReview": "pending",
    }
    record["reconciliationPayloadHash"] = reconciliation_payload_hash(record)
    TableEquivalenceRecord.model_validate(record)
    return record


def build_rendered_review_pages(
    review_packet: dict[str, Any], reconciliation: dict[str, Any], output_root: Path
) -> None:
    status = review_packet["releaseStatus"]
    if status not in {"candidate_not_reviewed", "reviewed"}:
        raise ValueError(f"Unsupported review status {status}")
    reviewed = status == "reviewed"
    if reviewed and (
        review_packet.get("reviewAttestationHash") is None
        or reconciliation.get("independentHumanReview") != "approved"
    ):
        raise ValueError("Reviewed pages require a validated reviewer attestation")

    styles = """
body {
  margin: 0;
  background: #0b0f14;
  color: #e9eef5;
  font: 15px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace;
}
main { max-width: 1180px; margin: auto; padding: 32px; }
.warning { border: 2px solid #ffb454; background: #261b0d; padding: 18px; }
.approved { border: 2px solid #78d6a5; background: #10271d; padding: 18px; }
a { color: #8dd9ff; }
article { border-top: 1px solid #33404d; margin-top: 28px; padding-top: 24px; }
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #111923;
  border: 1px solid #33404d;
  padding: 16px;
  max-height: 72vh;
  overflow: auto;
}
code { color: #ffcf87; }
.meta { color: #a8b5c3; }
@media(max-width: 800px) { .grid { grid-template-columns: 1fr; } }
""".strip()

    def shell(title: str, body: str) -> str:
        return (
            '<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            f"<title>{html.escape(title)}</title><style>{styles}</style></head>"
            f'<body data-review-status="{status}"><main>{body}</main></body></html>\n'
        )

    links = []
    for dataset in review_packet["datasets"]:
        filename = f"{dataset['name']}.html"
        links.append(
            f'<li><a href="{html.escape(filename)}">{html.escape(dataset["datasetId"])}</a> '
            f'<span class="meta">{html.escape(dataset["normalizedPayloadHash"])}</span></li>'
        )
        source_sections = []
        for source_page in dataset["sourcePages"]:
            heading = (
                f"{source_page['sourceId']}@{source_page['sourceVersion']} · "
                f"page {source_page['page']} · {source_page['sourcePageTextHash']}"
            )
            source_sections.append(
                f"<article><h3>{html.escape(heading)}</h3>"
                f"<pre>{html.escape(source_page['sourcePageText'])}</pre></article>"
            )
        if reviewed:
            reviewer = review_packet["reviewer"]
            approval = dataset["reviewApproval"]
            status_banner = (
                '<section class="approved"><strong>INDEPENDENT REVIEW APPROVED</strong><p>'
                f"{html.escape(reviewer['name'])} approved this exact normalized payload on "
                f"{html.escape(reviewer['reviewedAt'])}. Attestation: "
                f"<code>{html.escape(review_packet['reviewAttestationHash'])}</code></p>"
                f"<p>{html.escape(approval['changeRationale'])}</p></section>"
            )
        else:
            status_banner = (
                '<section class="warning"><strong>CANDIDATE — NOT REVIEWED</strong><p>'
                "This deterministic page is a comparison aid, not a sign-off. Independent review "
                "is pending; machine checks do not establish scientific approval.</p></section>"
            )
        body = (
            '<p><a href="index.html">← Review index</a></p>'
            + status_banner
            + f"<h1>{html.escape(dataset['datasetId'])}</h1>"
            + f'<p class="meta">Canonical path: {html.escape(dataset["canonicalPath"])}<br>'
            + f"Data version: {html.escape(review_packet['dataVersion'])}<br>"
            + f"Normalized payload: {html.escape(dataset['normalizedPayloadHash'])}</p>"
            + '<div class="grid"><section><h2>Source excerpts</h2>'
            + "".join(source_sections)
            + "</section><section><h2>Normalized payload</h2><pre>"
            + html.escape(json.dumps(dataset["normalizedPayload"], indent=2, ensure_ascii=False))
            + "</pre></section></div>"
        )
        write_text(output_root / "review" / "pages" / filename, shell(dataset["datasetId"], body))

    if reviewed:
        reviewer = review_packet["reviewer"]
        index_banner = (
            '<section class="approved"><strong>INDEPENDENT REVIEW APPROVED</strong><p>'
            f"Reviewer: {html.escape(reviewer['name'])} · {html.escape(reviewer['reviewedAt'])}<br>"
            f"Attestation: <code>{html.escape(review_packet['reviewAttestationHash'])}</code></p>"
            f"<p>{html.escape(reviewer['reviewRationale'])}</p></section>"
        )
        reconciliation_status = "independent review approved"
    else:
        index_banner = (
            '<section class="warning"><strong>CANDIDATE — NOT REVIEWED</strong><p>'
            "These deterministic source-to-normalized pages have no reviewer sign-off. Every "
            "dataset remains pending independent comparison.</p></section>"
        )
        reconciliation_status = "human review pending"
    index_body = (
        index_banner
        + "<h1>Canonical source-to-normalized review</h1>"
        + f'<p class="meta">Data version: {html.escape(review_packet["dataVersion"])}</p>'
        + f"<ul>{''.join(links)}</ul>"
        + '<h2>Cross-paper reconciliation</h2><p><a href="../reconciliations/'
        + 'paper-01-table-7--paper-03-table-1.json">PAPER-01 Table 7 ↔ PAPER-03 Table 1</a> · '
        + f"{html.escape(reconciliation['overlap']['status'])} across "
        + f"{reconciliation['overlap']['cellCount']} published cells · "
        + f"{reconciliation_status}.</p>"
    )
    write_text(
        output_root / "review" / "pages" / "index.html",
        shell("Canonical review", index_body),
    )


def build_discrepancies(raw: dict[str, Any]) -> list[dict[str, Any]]:
    growth = {record["scenarioId"]: record for record in raw["growth"]["records"]}
    discrepancies = []
    for collapse in raw["collapse"]["scenarios"]:
        scenario_id = collapse["scenarioId"]
        table_nine = growth[scenario_id]["annualGrowthRate"]
        table_four = collapse["parameters"]["r"]
        if table_nine is not None and table_nine != table_four:
            discrepancies.append(
                {
                    "code": "PUBLISHED_GROWTH_RATE_DISCREPANCY",
                    "scenarioId": scenario_id,
                    "foundationalTable9AnnualGrowthRate": table_nine,
                    "collapsePaperTable4GrowthParameter": table_four,
                    "resolution": (
                        "Retained as separate reported values from separate publications; no "
                        "silent reconciliation or preference was applied."
                    ),
                    "sourceIds": ["JANUS-PAPER-01", "JANUS-PAPER-05"],
                }
            )
    return discrepancies


def build_resilience_snapshot(raw: dict[str, Any]) -> dict[str, Any]:
    canonical_source = raw["collapse"]["source"]
    unavailable = {
        "schemaVersion": "1.0.0",
        "canonicalStatus": "noncanonical",
        "evidenceKind": "reimplemented",
        "status": "unavailable",
        "reason": "No validated independent experiment report was available at generation time.",
        "reportedDatasetId": raw["collapse"]["id"],
    }
    if not RESILIENCE_REPORT_PATH.exists():
        return unavailable

    report = load_json(RESILIENCE_REPORT_PATH)
    source = report.get("canonicalSource", {})
    scenario_ids = [
        scenario.get("scenarioId")
        for scenario in report.get("scenarios", [])
        if isinstance(scenario, dict)
    ]
    implementation = report.get("implementation")
    expected_seeds = {
        "paperComparableBatch": 12345,
        "largeEnsembleRule": "PAPER_SEED + scenario_number * 101",
        "largeEnsembleByScenario": {
            scenario_id: 12345 + int(scenario_id[1:]) * 101 for scenario_id in SCENARIO_IDS
        },
    }
    if (
        report.get("overallVerdict") != "pass"
        or report.get("canonicalStatus") != "noncanonical"
        or report.get("evidenceKind") != "reimplemented"
        or report.get("authorCodeUsed") is not False
        or source.get("sourceId") != canonical_source["sourceId"]
        or source.get("sourceVersion") != canonical_source["sourceVersion"]
        or implementation != resilience_implementation_record()
        or report.get("ensembleSizes") != {"paperComparableBatch": 200, "large": 20000}
        or report.get("seeds") != expected_seeds
        or scenario_ids != list(SCENARIO_IDS)
        or any(
            scenario.get("worstVerdict") != "pass"
            for scenario in report.get("scenarios", [])
            if isinstance(scenario, dict)
        )
    ):
        return {
            **unavailable,
            "status": "failed_closed",
            "reason": (
                "The experiment report did not satisfy the independent evidence label, exact "
                "release ensemble, scenario coverage, current implementation tree, canonical "
                "input, and passing comparison contract."
            ),
            "reportHash": f"sha256:{sha256_bytes(RESILIENCE_REPORT_PATH.read_bytes())}",
        }

    return {
        "schemaVersion": "1.0.0",
        "canonicalStatus": "noncanonical",
        "evidenceKind": "reimplemented",
        "status": "validated_experiment_report",
        "experiment": report["experiment"],
        "generatedAt": report["generatedAt"],
        "implementationTreeHash": implementation["treeHash"],
        "canonicalInputHash": implementation["canonicalInputHash"],
        "reportHash": f"sha256:{sha256_bytes(RESILIENCE_REPORT_PATH.read_bytes())}",
        "canonicalSource": source,
        "ensembleSizes": report["ensembleSizes"],
        "seeds": report["seeds"],
        "overallVerdict": report["overallVerdict"],
        "scenarios": [
            {
                "scenarioId": scenario["scenarioId"],
                "largeEnsemble": scenario["largeEnsemble"],
                "paperSeedBatch200": scenario["paperSeedBatch200"],
                "analyticEnsembleExpectation": scenario["analyticEnsembleExpectation"],
                "comparisons": scenario["comparisons"],
                "worstVerdict": scenario["worstVerdict"],
            }
            for scenario in report["scenarios"]
        ],
        "limitations": [
            (
                "This is an independent implementation from the CC BY paper equations, not "
                "official author code."
            ),
            (
                "Year-step ambiguities are fixed by the experiment ADR and remain "
                "implementation choices."
            ),
            "Only prose-reported aggregates are validated; figure-only nulls are not guessed.",
            (
                "The author-hosted code and aggregate CSV remain link-only because they "
                "declare no license."
            ),
        ],
    }


def generate_release(output_root: Path, review_record_path: Path | None = None) -> None:
    raw, parsed = load_canonical()
    manifest = SourceManifest.model_validate(load_json(SOURCE_MANIFEST_PATH))
    for dataset in parsed.values():
        resolve_source(manifest, dataset.source)

    version_material = b"".join(canonical_json(raw[name]) for name in sorted(CANONICAL_FILES))
    data_version = f"sha256:{sha256_bytes(version_material)}"
    generated_at = manifest.generated_at
    aliases = source_aliases(parsed, manifest)
    discrepancies = build_discrepancies(raw)
    review_packet = build_review_packet(raw, parsed, manifest, data_version)
    table_seven_reconciliation = build_table_seven_reconciliation(raw, manifest, data_version)
    reviewer_record: dict[str, Any] | None = None
    review_attestation_hash: str | None = None
    if review_record_path is not None:
        loaded_record = load_json(review_record_path)
        if not isinstance(loaded_record, dict):
            raise ValueError("Reviewer record must be a JSON object.")
        validated_record = apply_reviewer_record(
            loaded_record,
            review_packet,
            table_seven_reconciliation,
        )
        reviewer_record = loaded_record
        review_attestation_hash = validated_record.attestation_hash

    release_status = (
        "reviewed" if reviewer_record is not None else "candidate_pending_independent_review"
    )

    release = {
        "schemaVersion": "1.0.0",
        "dataVersion": data_version,
        "generatedAt": generated_at,
        "releaseStatus": release_status,
        "reviewAttestationHash": review_attestation_hash,
        "scenarioCount": len(SCENARIO_IDS),
        "missionCount": len(MISSION_IDS),
        "datasets": raw,
        "discrepancies": discrepancies,
        "reviewArtifact": "review/canonical-review.json",
        "renderedReviewIndex": "review/pages/index.html",
        "reconciliations": ["review/reconciliations/paper-01-table-7--paper-03-table-1.json"],
    }
    if reviewer_record is not None:
        release["reviewerRecord"] = "review/reviewer-record.json"
    write_json(output_root / "downloads" / "janus-observatory-1.0.0.json", release)
    write_text(output_root / "downloads" / "janus-scenarios-1.0.0.csv", build_scenario_csv(raw))
    write_text(
        output_root / "downloads" / "janus-observability-1.0.0.csv",
        build_observability_csv(raw),
    )
    write_json(
        output_root / "review" / "canonical-review.json",
        review_packet,
    )
    if reviewer_record is not None:
        write_json(output_root / "review" / "reviewer-record.json", reviewer_record)
    write_json(
        output_root / "review" / "discrepancies.json",
        {
            "schemaVersion": "1.0.0",
            "dataVersion": data_version,
            "releaseStatus": release_status,
            "reviewAttestationHash": review_attestation_hash,
            "discrepancies": discrepancies,
        },
    )
    write_json(
        output_root / "review" / "reconciliations" / "paper-01-table-7--paper-03-table-1.json",
        table_seven_reconciliation,
    )
    build_rendered_review_pages(review_packet, table_seven_reconciliation, output_root)

    chunks = build_paper_corpus(manifest, aliases) + build_structured_corpus(raw)
    require_exact_ids(
        "structured corpus scenario coverage",
        sorted({scenario for chunk in chunks for scenario in chunk["scenarioIds"]}),
        SCENARIO_IDS,
    )
    corpus_hash = f"sha256:{sha256_bytes(canonical_json(chunks))}"
    write_json(
        output_root / "research" / "corpus.json",
        {
            "schemaVersion": "1.0.0",
            "dataVersion": data_version,
            "contentHash": corpus_hash,
            "generatedAt": generated_at,
            "retrievalMode": "section-aware lexical baseline",
            "chunks": chunks,
        },
    )
    write_json(
        output_root / "research" / "index.json",
        {
            "schemaVersion": "1.0.0",
            "dataVersion": data_version,
            "contentHash": corpus_hash,
            "chunkCount": len(chunks),
            "sourceIds": sorted({chunk["sourceId"] for chunk in chunks}),
            "scenarioCoverage": list(SCENARIO_IDS),
            "embeddingIndex": {
                "status": "not_built",
                "reason": (
                    "Lexical retrieval is the fail-safe baseline; vector service is optional."
                ),
            },
        },
    )
    write_json(
        output_root / "collapse" / "independent-validation.json",
        build_resilience_snapshot(raw),
    )
    for name, filename in RUNTIME_FILES.items():
        write_json(output_root / "runtime" / filename, raw[name])
    write_json(
        output_root / "runtime" / "release-identity.json",
        {
            "schemaVersion": "1.0.0",
            "dataVersion": data_version,
            "releaseStatus": release_status,
            "independentHumanReview": ("approved" if reviewer_record is not None else "pending"),
            "reviewAttestationHash": review_attestation_hash,
        },
    )

    generated_files = sorted(
        path for path in output_root.rglob("*") if path.is_file() and path.name != "manifest.json"
    )
    write_json(
        output_root / "manifest.json",
        {
            "schemaVersion": "1.0.0",
            "dataVersion": data_version,
            "generatedAt": generated_at,
            "releaseStatus": release_status,
            "reviewAttestationHash": review_attestation_hash,
            "files": [
                {
                    "path": str(path.relative_to(output_root)),
                    "sha256": sha256_bytes(path.read_bytes()),
                    "bytes": path.stat().st_size,
                }
                for path in generated_files
            ],
        },
    )


def compare_trees(expected: Path, actual: Path) -> list[str]:
    expected_files = {
        str(path.relative_to(expected)): sha256_bytes(path.read_bytes())
        for path in expected.rglob("*")
        if path.is_file()
    }
    actual_files = {
        str(path.relative_to(actual)): sha256_bytes(path.read_bytes())
        for path in actual.rglob("*")
        if path.is_file()
    }
    differences = []
    for path in sorted(set(expected_files) | set(actual_files)):
        if expected_files.get(path) != actual_files.get(path):
            differences.append(path)
    return differences


def validate_committed_artifacts(output_root: Path, review_record_path: Path | None = None) -> None:
    manifest_path = output_root / "manifest.json"
    if not manifest_path.exists():
        raise SystemExit("Generated release manifest is missing.")
    manifest = load_json(manifest_path)
    declared_files = [record["path"] for record in manifest["files"]]
    if len(declared_files) != len(set(declared_files)):
        raise SystemExit("Generated release manifest contains duplicate paths.")
    actual_files = {
        str(path.relative_to(output_root))
        for path in output_root.rglob("*")
        if path.is_file() and path != manifest_path
    }
    if set(declared_files) != actual_files:
        raise SystemExit("Generated release manifest does not cover the exact artifact tree.")
    for record in manifest["files"]:
        path = output_root / record["path"]
        if not path.exists():
            raise SystemExit(f"Generated release artifact is missing: {record['path']}")
        contents = path.read_bytes()
        if sha256_bytes(contents) != record["sha256"] or len(contents) != record["bytes"]:
            raise SystemExit(f"Generated release artifact failed its hash: {record['path']}")
    corpus = load_json(output_root / "research" / "corpus.json")
    for chunk in corpus["chunks"]:
        CorpusChunk.model_validate(chunk)
    review = load_json(output_root / "review" / "canonical-review.json")
    reconciliation = load_json(
        output_root / "review" / "reconciliations" / "paper-01-table-7--paper-03-table-1.json"
    )
    TableEquivalenceRecord.model_validate(reconciliation)
    if reconciliation["reconciliationPayloadHash"] != reconciliation_payload_hash(reconciliation):
        raise SystemExit("Generated reconciliation payload hash is stale.")

    reviewed = review_record_path is not None
    expected_review_status = "reviewed" if reviewed else "candidate_not_reviewed"
    expected_release_status = "reviewed" if reviewed else "candidate_pending_independent_review"
    expected_human_status = "approved" if reviewed else "pending"
    reviewer_path = output_root / "review" / "reviewer-record.json"
    attestation_hash: str | None = None
    if reviewed:
        if review_record_path is None:
            raise SystemExit("Reviewed validation requires an explicit reviewer record path.")
        supplied_record = load_json(review_record_path)
        generated_record = load_json(reviewer_path)
        if supplied_record != generated_record:
            raise SystemExit("Generated reviewer record differs from the explicit input record.")
        validated_record = validate_reviewer_record(
            generated_record,
            review,
            reconciliation,
        )
        attestation_hash = validated_record.attestation_hash
    elif reviewer_path.exists():
        raise SystemExit("Unsigned candidate output must not contain a reviewer record.")

    if review["releaseStatus"] != expected_review_status:
        raise SystemExit("Generated review packet does not match the explicit review state.")
    if review.get("reviewAttestationHash") != attestation_hash:
        raise SystemExit("Generated review packet has an inconsistent attestation hash.")
    if reconciliation["releaseStatus"] != expected_review_status:
        raise SystemExit("Generated reconciliation does not match the explicit review state.")
    if reconciliation.get("reviewAttestationHash") != attestation_hash:
        raise SystemExit("Generated reconciliation has an inconsistent attestation hash.")
    if reconciliation["independentHumanReview"] != expected_human_status:
        raise SystemExit("Generated reconciliation human-review state is inconsistent.")
    if any(
        dataset["independentHumanReview"] != expected_human_status
        or dataset.get("reviewAttestationHash") != attestation_hash
        for dataset in review["datasets"]
    ):
        raise SystemExit("Every generated dataset must match the explicit review state.")

    raw, _ = load_canonical()
    for name, filename in RUNTIME_FILES.items():
        if load_json(output_root / "runtime" / filename) != raw[name]:
            raise SystemExit(f"Generated runtime dataset {filename} drifted from canonical input.")
    runtime_identity = load_json(output_root / "runtime" / "release-identity.json")
    download = load_json(output_root / "downloads" / "janus-observatory-1.0.0.json")
    for label, artifact in [
        ("manifest", manifest),
        ("runtime identity", runtime_identity),
        ("download", download),
    ]:
        if (
            artifact["dataVersion"] != review["dataVersion"]
            or artifact["releaseStatus"] != expected_release_status
            or artifact.get("reviewAttestationHash") != attestation_hash
        ):
            raise SystemExit(f"Generated {label} does not match the explicit review state.")
    if runtime_identity["independentHumanReview"] != expected_human_status:
        raise SystemExit("Runtime release identity has an inconsistent human-review state.")

    rendered_pages = sorted((output_root / "review" / "pages").glob("*.html"))
    if len(rendered_pages) != len(review["datasets"]) + 1:
        raise SystemExit("Generated review pages do not cover every canonical dataset.")
    for page in rendered_pages:
        contents = page.read_text(encoding="utf-8")
        if f'data-review-status="{expected_review_status}"' not in contents:
            raise SystemExit(f"Generated review page has an inconsistent status: {page.name}")


def check_release(output_root: Path, review_record_path: Path | None = None) -> None:
    source_manifest = SourceManifest.model_validate(load_json(SOURCE_MANIFEST_PATH))
    present = [
        entry
        for entry in source_manifest.entries
        if entry.local_path and (WORKSPACE / entry.local_path).exists()
    ]
    if len(present) == 0:
        validate_committed_artifacts(output_root, review_record_path)
        print(
            "validated committed generated hashes; full deterministic regeneration skipped "
            "because ignored source-lock files are unavailable"
        )
        return
    if len(present) != len(source_manifest.entries):
        raise SystemExit(
            f"Source lock is partial: found {len(present)} of {len(source_manifest.entries)} files."
        )
    with tempfile.TemporaryDirectory(prefix="janus-generated-") as temporary:
        expected = Path(temporary)
        generate_release(expected, review_record_path)
        differences = compare_trees(expected, output_root)
        if differences:
            raise SystemExit(
                "Generated release artifacts are stale or missing: " + ", ".join(differences)
            )
    output_label = (
        str(output_root.relative_to(WORKSPACE))
        if output_root.is_relative_to(WORKSPACE)
        else str(output_root)
    )
    print(f"validated generated release artifacts in {output_label}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if committed output is stale")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--review-record",
        type=Path,
        help=(
            "explicit independent reviewer JSON bound to this data version; omission keeps the "
            "release candidate-only"
        ),
    )
    args = parser.parse_args()
    output = args.output.resolve()
    review_record = args.review_record.resolve() if args.review_record is not None else None
    if args.check:
        check_release(output, review_record)
        return
    if output.exists():
        shutil.rmtree(output)
    generate_release(output, review_record)
    print(f"generated release artifacts in {output.relative_to(WORKSPACE)}")


if __name__ == "__main__":
    main()
