import pytest
from pydantic import ValidationError

from janus_pipeline.models import EvidenceKind, SourcedValue, SourceLocator, SourceReference


def test_sourced_value_requires_a_precise_locator() -> None:
    with pytest.raises(ValidationError):
        SourcedValue[str](
            capture_status="captured",
            value="not detected",
            evidence_kind=EvidenceKind.REPORTED,
            source_refs=[
                SourceReference(
                    source_id="observing-strategies",
                    source_version="arXiv:2511.20329v2",
                    evidence_kind=EvidenceKind.REPORTED,
                    locator=SourceLocator(),
                )
            ],
        )


def test_sourced_value_accepts_page_and_figure() -> None:
    value = SourcedValue[str](
        capture_status="captured",
        value="ambiguous",
        evidence_kind=EvidenceKind.REPORTED,
        source_refs=[
            SourceReference(
                source_id="observing-strategies",
                source_version="arXiv:2511.20329v2",
                evidence_kind=EvidenceKind.REPORTED,
                locator=SourceLocator(page=4, figure="Figure 2"),
            )
        ],
    )

    assert value.value == "ambiguous"


def test_sourced_value_rejects_a_value_for_not_transcribed() -> None:
    with pytest.raises(ValidationError):
        SourcedValue[str](
            capture_status="not_transcribed",
            value="guessed value",
            evidence_kind=EvidenceKind.TRANSCRIBED,
            source_refs=[
                SourceReference(
                    source_id="scenario-modeling",
                    source_version="arXiv:2409.00067v3",
                    evidence_kind=EvidenceKind.TRANSCRIBED,
                    locator=SourceLocator(page=11, figure="Figure 6", row="S1"),
                )
            ],
        )
