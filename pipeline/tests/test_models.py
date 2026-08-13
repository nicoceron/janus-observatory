import pytest
from pydantic import ValidationError

from janus_pipeline.models import EvidenceKind, SourcedValue, SourceLocator, SourceReference


def test_sourced_value_requires_a_precise_locator() -> None:
    with pytest.raises(ValidationError):
        SourcedValue[str](
            value="not detected",
            evidence_kind=EvidenceKind.REPORTED,
            sources=[
                SourceReference(
                    source_id="observing-strategies",
                    source_version="arXiv:2511.20329v2",
                    locator=SourceLocator(),
                )
            ],
        )


def test_sourced_value_accepts_page_and_figure() -> None:
    value = SourcedValue[str](
        value="ambiguous",
        evidence_kind=EvidenceKind.REPORTED,
        sources=[
            SourceReference(
                source_id="observing-strategies",
                source_version="arXiv:2511.20329v2",
                locator=SourceLocator(page=4, figure="Figure 2"),
            )
        ],
    )

    assert value.value == "ambiguous"
