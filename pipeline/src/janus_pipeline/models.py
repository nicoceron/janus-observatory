from enum import StrEnum

from pydantic import BaseModel, Field, model_validator


class EvidenceKind(StrEnum):
    REPORTED = "reported"
    TRANSCRIBED = "transcribed"
    DERIVED = "derived"
    REIMPLEMENTED = "reimplemented"
    EDITORIAL = "editorial"
    INTERPRETIVE = "interpretive"
    FICTIONAL = "fictional"
    MODEL_GENERATED = "model_generated"


class SourceLocator(BaseModel):
    page: int | None = Field(default=None, gt=0)
    section: str | None = None
    figure: str | None = None
    table: str | None = None
    quote: str | None = Field(default=None, max_length=400)

    @model_validator(mode="after")
    def require_locator(self) -> "SourceLocator":
        if not any((self.page, self.section, self.figure, self.table, self.quote)):
            raise ValueError(
                "A source locator must identify a page, section, figure, table, or quote."
            )
        return self


class SourceReference(BaseModel):
    source_id: str = Field(min_length=1)
    source_version: str = Field(min_length=1)
    locator: SourceLocator


class SourcedValue[Value](BaseModel):
    value: Value
    evidence_kind: EvidenceKind
    sources: list[SourceReference] = Field(min_length=1)
    note: str | None = None
