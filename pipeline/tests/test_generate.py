import json
from copy import deepcopy
from pathlib import Path

import pytest
from pydantic import ValidationError

from janus_pipeline.generate import (
    RESILIENCE_REPORT_PATH,
    SOURCE_MANIFEST_PATH,
    WORKSPACE,
    build_resilience_snapshot,
    build_table_seven_reconciliation,
    check_release,
    compare_trees,
    generate_release,
    load_canonical,
    resilience_implementation_record,
    resolve_source,
    reviewer_attestation_hash,
    validate_reviewer_record,
)
from janus_pipeline.models import (
    PlanetaryTechnosignatureDataset,
    SourceManifest,
    SourceReference,
    TableEquivalenceRecord,
)


def source_files_available() -> bool:
    manifest = SourceManifest.model_validate(
        json.loads(SOURCE_MANIFEST_PATH.read_text(encoding="utf-8"))
    )
    return all(
        entry.local_path and (WORKSPACE / entry.local_path).exists() for entry in manifest.entries
    )


def reviewer_record_for(
    review: dict[str, object], reconciliation: dict[str, object]
) -> dict[str, object]:
    datasets = review["datasets"]
    assert isinstance(datasets, list)
    record: dict[str, object] = {
        "schemaVersion": "1.0.0",
        "dataVersion": review["dataVersion"],
        "reviewer": {
            "name": "Independent Test Reviewer",
            "organization": "Independent Evidence Lab",
            "persistentIdentifier": "https://example.test/reviewers/independent",
            "reviewedAt": "2026-08-30T12:00:00+00:00",
            "independence": "independent",
            "independenceStatement": (
                "I did not prepare the canonical transcriptions or the generation code."
            ),
            "reviewRationale": (
                "I compared every normalized field with the locked source pages and locators."
            ),
        },
        "datasetApprovals": [
            {
                "datasetId": dataset["datasetId"],
                "normalizedPayloadHash": dataset["normalizedPayloadHash"],
                "decision": "approved",
                "corrections": [],
                "changeRationale": (
                    "No corrections were required after the independent source comparison."
                ),
            }
            for dataset in datasets
        ],
        "reconciliationApprovals": [
            {
                "reconciliationId": reconciliation["reconciliationId"],
                "reconciliationPayloadHash": reconciliation["reconciliationPayloadHash"],
                "decision": "approved",
                "rationale": (
                    "The complete 120-cell overlap and its exact value hashes were verified."
                ),
            }
        ],
        "attestationAlgorithm": "sha256-canonical-json-v1",
        "attestationHash": "sha256:" + "0" * 64,
    }
    record["attestationHash"] = reviewer_attestation_hash(record)
    return record


def test_all_canonical_inputs_validate_with_pydantic_mirrors() -> None:
    raw, parsed = load_canonical()

    assert set(raw) == set(parsed)
    assert len(parsed["morphology"].records) == 10
    assert len(parsed["observability"].missions) == 5
    assert parsed["morphology"].records[0].biosphere.capture_status == "not_transcribed"
    assert (
        parsed["observability"]
        .mission_assumptions["habitable_worlds_observatory"]
        .integration_time.capture_status
        == "not_reported"
    )
    assert len(parsed["planetary"].rows) == 24


def test_planetary_cell_provenance_is_required_by_the_pipeline_model() -> None:
    raw, _ = load_canonical()
    del raw["planetary"]["rows"][0]["fieldProvenance"]["values"]["S10"]

    with pytest.raises(ValidationError, match="must cover every scenario cell"):
        PlanetaryTechnosignatureDataset.model_validate(raw["planetary"])


def test_source_resolution_requires_one_exact_alias_and_version_pair() -> None:
    manifest = SourceManifest.model_validate(
        json.loads(SOURCE_MANIFEST_PATH.read_text(encoding="utf-8"))
    )
    mismatched = SourceReference.model_validate(
        {
            "sourceId": "JANUS-PAPER-01",
            "sourceVersion": "arXiv:2511.20329v2",
            "locator": {"page": 4, "table": "Table 1"},
            "evidenceKind": "reported",
        }
    )

    with pytest.raises(ValueError, match="resolved to 0 entries"):
        resolve_source(manifest, mismatched)


def test_reviewer_record_is_bound_to_every_payload_and_its_attestation() -> None:
    review = json.loads(
        (WORKSPACE / "data/generated/review/canonical-review.json").read_text(encoding="utf-8")
    )
    reconciliation = json.loads(
        (
            WORKSPACE / "data/generated/review/reconciliations/"
            "paper-01-table-7--paper-03-table-1.json"
        ).read_text(encoding="utf-8")
    )
    valid = reviewer_record_for(review, reconciliation)

    parsed = validate_reviewer_record(valid, review, reconciliation)
    assert parsed.reviewer.name == "Independent Test Reviewer"

    invalid_cases: list[tuple[str, dict[str, object], str]] = []

    stale_version = deepcopy(valid)
    stale_version["dataVersion"] = "sha256:" + "0" * 64
    stale_version["attestationHash"] = reviewer_attestation_hash(stale_version)
    invalid_cases.append(("stale version", stale_version, "dataVersion"))

    partial = deepcopy(valid)
    assert isinstance(partial["datasetApprovals"], list)
    partial["datasetApprovals"].pop()
    partial["attestationHash"] = reviewer_attestation_hash(partial)
    invalid_cases.append(("partial dataset approvals", partial, "every canonical dataset"))

    mismatched_dataset = deepcopy(valid)
    assert isinstance(mismatched_dataset["datasetApprovals"], list)
    mismatched_dataset["datasetApprovals"][0]["normalizedPayloadHash"] = "sha256:" + "1" * 64
    mismatched_dataset["attestationHash"] = reviewer_attestation_hash(mismatched_dataset)
    invalid_cases.append(("dataset hash", mismatched_dataset, "normalized payload hash"))

    mismatched_reconciliation = deepcopy(valid)
    assert isinstance(mismatched_reconciliation["reconciliationApprovals"], list)
    mismatched_reconciliation["reconciliationApprovals"][0]["reconciliationPayloadHash"] = (
        "sha256:" + "2" * 64
    )
    mismatched_reconciliation["attestationHash"] = reviewer_attestation_hash(
        mismatched_reconciliation
    )
    invalid_cases.append(
        ("reconciliation hash", mismatched_reconciliation, "reconciliation approval")
    )

    bad_attestation = deepcopy(valid)
    bad_attestation["attestationHash"] = "sha256:" + "3" * 64
    invalid_cases.append(("attestation", bad_attestation, "attestationHash"))

    for _label, record, message in invalid_cases:
        with pytest.raises(ValueError, match=message):
            validate_reviewer_record(record, review, reconciliation)


def test_resilience_snapshot_fails_closed_when_the_implementation_receipt_is_stale(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    raw, _ = load_canonical()
    report = json.loads(RESILIENCE_REPORT_PATH.read_text(encoding="utf-8"))
    report.update(
        {
            "canonicalStatus": "noncanonical",
            "evidenceKind": "reimplemented",
            "authorCodeUsed": False,
            "implementation": resilience_implementation_record(),
            "ensembleSizes": {"paperComparableBatch": 200, "large": 20000},
            "seeds": {
                "paperComparableBatch": 12345,
                "largeEnsembleRule": "PAPER_SEED + scenario_number * 101",
                "largeEnsembleByScenario": {
                    f"S{index}": 12345 + index * 101 for index in range(1, 11)
                },
            },
        }
    )
    report_path = tmp_path / "replication-report.json"
    report_path.write_text(json.dumps(report), encoding="utf-8")
    monkeypatch.setattr("janus_pipeline.generate.RESILIENCE_REPORT_PATH", report_path)

    current = build_resilience_snapshot(raw)
    assert current["status"] == "validated_experiment_report"
    assert current["implementationTreeHash"] == report["implementation"]["treeHash"]

    report["implementation"]["treeHash"] = f"sha256:{'0' * 64}"
    report_path.write_text(json.dumps(report), encoding="utf-8")
    stale = build_resilience_snapshot(raw)
    assert stale["status"] == "failed_closed"
    assert "current implementation tree" in stale["reason"]


@pytest.mark.skipif(not source_files_available(), reason="ignored source lock is unavailable")
def test_release_generation_is_deterministic_and_excludes_unknown_rights_text(
    tmp_path: Path,
) -> None:
    first = tmp_path / "first"
    second = tmp_path / "second"
    generate_release(first)
    generate_release(second)

    assert compare_trees(first, second) == []
    corpus = json.loads((first / "research" / "corpus.json").read_text(encoding="utf-8"))
    assert len(corpus["chunks"]) >= 40
    assert not any(chunk["sourceId"].startswith("janus.pipeline") for chunk in corpus["chunks"])
    assert set(corpus["chunks"][0]) >= {
        "chunkId",
        "sourceId",
        "sourceVersion",
        "pageStart",
        "text",
        "contentHash",
        "rights",
    }
    review = json.loads((first / "review" / "canonical-review.json").read_text(encoding="utf-8"))
    morphology_review = next(
        dataset for dataset in review["datasets"] if dataset["name"] == "morphology"
    )
    assert review["releaseStatus"] == "candidate_not_reviewed"
    assert {record["page"] for record in morphology_review["sourcePages"]} == {5, 7, 8, 11}
    review_pages = sorted((first / "review" / "pages").glob("*.html"))
    assert len(review_pages) == len(review["datasets"]) + 1
    assert all(
        'data-review-status="candidate_not_reviewed"' in page.read_text(encoding="utf-8")
        for page in review_pages
    )
    assert all(
        "CANDIDATE — NOT REVIEWED" in page.read_text(encoding="utf-8") for page in review_pages
    )
    runtime_files = sorted((first / "runtime").glob("*.json"))
    assert {path.name for path in runtime_files} == {
        "collapse.json",
        "earth-atmosphere.json",
        "growth.json",
        "morphology.json",
        "observability.json",
        "planetary.json",
        "release-identity.json",
        "system.json",
        "venus-atmosphere.json",
    }
    runtime_identity = json.loads(
        (first / "runtime/release-identity.json").read_text(encoding="utf-8")
    )
    assert runtime_identity["releaseStatus"] == "candidate_pending_independent_review"
    assert runtime_identity["independentHumanReview"] == "pending"
    assert runtime_identity["reviewAttestationHash"] is None


@pytest.mark.skipif(not source_files_available(), reason="ignored source lock is unavailable")
def test_explicit_reviewer_record_generates_one_consistent_reviewed_state(
    tmp_path: Path,
) -> None:
    committed_review = json.loads(
        (WORKSPACE / "data/generated/review/canonical-review.json").read_text(encoding="utf-8")
    )
    committed_reconciliation = json.loads(
        (
            WORKSPACE / "data/generated/review/reconciliations/"
            "paper-01-table-7--paper-03-table-1.json"
        ).read_text(encoding="utf-8")
    )
    record = reviewer_record_for(committed_review, committed_reconciliation)
    record_path = tmp_path / "reviewer-record.json"
    record_path.write_text(json.dumps(record), encoding="utf-8")
    output = tmp_path / "reviewed"

    generate_release(output, record_path)
    check_release(output, record_path)

    review = json.loads((output / "review/canonical-review.json").read_text(encoding="utf-8"))
    reconciliation = json.loads(
        (output / "review/reconciliations/paper-01-table-7--paper-03-table-1.json").read_text(
            encoding="utf-8"
        )
    )
    download = json.loads(
        (output / "downloads/janus-observatory-1.0.0.json").read_text(encoding="utf-8")
    )
    runtime_identity = json.loads(
        (output / "runtime/release-identity.json").read_text(encoding="utf-8")
    )
    attestation = record["attestationHash"]

    assert review["releaseStatus"] == "reviewed"
    assert all(dataset["independentHumanReview"] == "approved" for dataset in review["datasets"])
    assert reconciliation["releaseStatus"] == "reviewed"
    assert reconciliation["independentHumanReview"] == "approved"
    assert download["releaseStatus"] == "reviewed"
    assert runtime_identity["releaseStatus"] == "reviewed"
    assert runtime_identity["independentHumanReview"] == "approved"
    assert {
        review["reviewAttestationHash"],
        reconciliation["reviewAttestationHash"],
        download["reviewAttestationHash"],
        runtime_identity["reviewAttestationHash"],
    } == {attestation}
    assert all(
        'data-review-status="reviewed"' in page.read_text(encoding="utf-8")
        and "INDEPENDENT REVIEW APPROVED" in page.read_text(encoding="utf-8")
        for page in (output / "review/pages").glob("*.html")
    )


@pytest.mark.skipif(not source_files_available(), reason="ignored source lock is unavailable")
def test_table_seven_is_reconciled_as_an_exact_superset_lineage() -> None:
    raw, _ = load_canonical()
    manifest = SourceManifest.model_validate(
        json.loads(SOURCE_MANIFEST_PATH.read_text(encoding="utf-8"))
    )
    record = build_table_seven_reconciliation(raw, manifest, "sha256:" + "0" * 64)
    parsed = TableEquivalenceRecord.model_validate(record)

    assert parsed.release_status == "candidate_not_reviewed"
    assert parsed.independent_human_review == "pending"
    assert parsed.foundational_source.source_id == "JANUS-PAPER-01"
    assert parsed.foundational_source.locator.table == "Table 7"
    assert parsed.consolidated_source.source_id == "JANUS-PAPER-03"
    assert parsed.consolidated_source.locator.table == "Table 1"
    assert parsed.overlap.row_count == 10
    assert parsed.overlap.column_count == 12
    assert parsed.overlap.cell_count == 120
    assert parsed.overlap.status == "exact_match"
    assert parsed.overlap.foundational_overlap_hash == parsed.overlap.consolidated_overlap_hash
    assert {row.canonical_row_id for row in parsed.overlap.rows} == {
        "co2",
        "ch4",
        "nox",
        "n2o",
        "nh3",
        "cfc_11",
        "cfc_12",
        "cf4",
        "sf6",
        "nf3",
    }
    assert set(parsed.overlap.excluded_consolidated_row_ids) == {
        "laser_emission_1_064_um",
        "mean_temperature",
        "na_emission",
        "so2_stratospheric",
    }
    assert "sourcePageText" not in record


@pytest.mark.skipif(not source_files_available(), reason="ignored source lock is unavailable")
def test_committed_generated_artifacts_match_the_generator(tmp_path: Path) -> None:
    expected = tmp_path / "expected"
    generate_release(expected)

    assert compare_trees(expected, WORKSPACE / "data" / "generated") == []
