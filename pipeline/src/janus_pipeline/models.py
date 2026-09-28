from datetime import datetime
from enum import StrEnum
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class JanusModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class EvidenceKind(StrEnum):
    REPORTED = "reported"
    TRANSCRIBED = "transcribed"
    DERIVED = "derived"
    REIMPLEMENTED = "reimplemented"
    EDITORIAL = "editorial"
    INTERPRETIVE = "interpretive"
    FICTIONAL = "fictional"
    MODEL_GENERATED = "model_generated"


class SourceLocator(JanusModel):
    page: int | None = Field(default=None, gt=0)
    section: str | None = None
    figure: str | None = None
    table: str | None = None
    row: str | None = None
    column: str | None = None
    url: str | None = None
    quote: str | None = Field(default=None, max_length=400)

    @model_validator(mode="after")
    def require_locator(self) -> "SourceLocator":
        if not any(
            (
                self.page,
                self.section,
                self.figure,
                self.table,
                self.row,
                self.column,
                self.url,
                self.quote,
            )
        ):
            raise ValueError(
                "A source locator must identify a page, section, figure, table, row, "
                "column, URL, or quote."
            )
        return self


class SourceReference(JanusModel):
    source_id: str = Field(min_length=1, alias="sourceId")
    source_version: str = Field(min_length=1, alias="sourceVersion")
    locator: SourceLocator
    evidence_kind: EvidenceKind | None = Field(default=None, alias="evidenceKind")
    extracted_at: str | None = Field(default=None, alias="extractedAt")
    reviewed_by: list[str] | None = Field(default=None, alias="reviewedBy")
    note: str | None = None


FieldReferences = Annotated[list[SourceReference], Field(min_length=1)]


def _field_references(value: Any) -> list[SourceReference]:
    if isinstance(value, SourceReference):
        return [value]
    if isinstance(value, BaseModel):
        return [
            reference for child in vars(value).values() for reference in _field_references(child)
        ]
    if isinstance(value, dict):
        return [reference for child in value.values() for reference in _field_references(child)]
    if isinstance(value, (list, tuple)):
        return [reference for child in value for reference in _field_references(child)]
    return []


def require_exact_field_references(value: Any, source: SourceReference, label: str) -> None:
    references = _field_references(value)
    if not references:
        raise ValueError(f"{label} must contain field-level source references.")
    for reference in references:
        if reference.evidence_kind is None:
            raise ValueError(f"{label} field references require an evidence kind.")
        if not reference.locator.row or not reference.locator.column:
            raise ValueError(f"{label} field references require exact row and column locators.")
        if (
            reference.source_id != source.source_id
            or reference.source_version != source.source_version
        ):
            raise ValueError(
                f"{label} field reference {reference.source_id}@{reference.source_version} "
                f"does not match {source.source_id}@{source.source_version}."
            )


class SourcedValue[Value](JanusModel):
    capture_status: Literal["captured", "not_reported", "not_captured", "not_transcribed"] = Field(
        alias="captureStatus"
    )
    value: Value | None
    evidence_kind: EvidenceKind = Field(alias="evidenceKind")
    source_refs: list[SourceReference] = Field(min_length=1, alias="sourceRefs")
    unit: str | None = None
    display: str | None = None
    uncertainty: str | None = None
    note: str | None = None

    @model_validator(mode="after")
    def preserve_missing_state(self) -> "SourcedValue[Value]":
        if self.capture_status == "captured" and self.value is None:
            raise ValueError("A captured sourced value cannot be null.")
        if self.capture_status != "captured" and self.value is not None:
            raise ValueError("An unavailable sourced value must be null.")
        if self.capture_status != "captured" and not self.note:
            raise ValueError("An unavailable sourced value must explain why it is unavailable.")
        if any(reference.evidence_kind is None for reference in self.source_refs):
            raise ValueError("Field-level source references require an evidence kind.")
        return self


class CanonicalHeader(JanusModel):
    schema_version: str = Field(min_length=1, alias="schemaVersion")
    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    content_origin: Literal["transcribed"] = Field(alias="contentOrigin")
    evidence_kind: Literal[EvidenceKind.REPORTED] = Field(alias="evidenceKind")
    source: SourceReference
    source_license: str = Field(min_length=1, alias="sourceLicense")
    transcription_method: str = Field(min_length=1, alias="transcriptionMethod")
    assumptions: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class NumericTableColumnProvenance(JanusModel):
    id: FieldReferences
    label: FieldReferences
    kind: FieldReferences


class NumericTableColumn(JanusModel):
    id: str
    label: str
    kind: Literal["reference", "scenario"]
    field_provenance: NumericTableColumnProvenance = Field(alias="fieldProvenance")


class NumericTableRowProvenance(JanusModel):
    id: FieldReferences
    label: FieldReferences
    unit: FieldReferences
    values: dict[str, FieldReferences]


class NumericTableRow(JanusModel):
    id: str
    label: str
    unit: str
    values: dict[str, float | None]
    field_provenance: NumericTableRowProvenance = Field(alias="fieldProvenance")


class PublishedNumericTable(CanonicalHeader):
    null_semantics: str = Field(min_length=1, alias="nullSemantics")
    columns: list[NumericTableColumn] = Field(min_length=1)
    rows: list[NumericTableRow] = Field(min_length=1)

    @model_validator(mode="after")
    def require_complete_rows(self) -> "PublishedNumericTable":
        column_ids = [column.id for column in self.columns]
        if len(set(column_ids)) != len(column_ids):
            raise ValueError("Published table column IDs must be unique.")
        expected = set(column_ids)
        require_exact_field_references(
            [column.field_provenance for column in self.columns],
            self.source,
            self.id,
        )
        for row in self.rows:
            if set(row.values) != expected:
                raise ValueError(f"Row {row.id} must provide exactly one value per column.")
            if set(row.field_provenance.values) != expected:
                raise ValueError(f"Row {row.id} must provide exact provenance per column.")
            require_exact_field_references(row.field_provenance, self.source, f"{self.id}.{row.id}")
        return self


ScenarioId = Literal["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"]


class ScenarioMorphologyProvenance(JanusModel):
    scenario_id: FieldReferences = Field(alias="scenarioId")
    global_factor: FieldReferences = Field(alias="globalFactor")
    technology_cluster: FieldReferences = Field(alias="technologyCluster")
    technology_factors: FieldReferences = Field(alias="technologyFactors")
    myth_metaphor: FieldReferences = Field(alias="mythMetaphor")


class ScenarioMorphologyRecord(JanusModel):
    scenario_id: ScenarioId = Field(alias="scenarioId")
    global_factor: str = Field(alias="globalFactor")
    technology_cluster: int = Field(ge=1, le=6, alias="technologyCluster")
    technology_factors: list[str] = Field(min_length=1, alias="technologyFactors")
    myth_metaphor: str = Field(min_length=1, alias="mythMetaphor")
    field_provenance: ScenarioMorphologyProvenance = Field(alias="fieldProvenance")
    canonical_summary: SourcedValue[str] = Field(alias="canonicalSummary")
    economy: SourcedValue[str]
    politics: SourcedValue[str]
    society: SourcedValue[str]
    technosphere: SourcedValue[list[str]]
    biosphere: SourcedValue[str]
    spatial_distribution: SourcedValue[list[str]] = Field(alias="spatialDistribution")
    development: SourcedValue[list[str]]
    connectivity: SourcedValue[list[str]]
    smallest_scale: SourcedValue[list[str]] = Field(alias="smallestScale")


class ScenarioMorphologyDataset(CanonicalHeader):
    records: list[ScenarioMorphologyRecord] = Field(min_length=10, max_length=10)

    @model_validator(mode="after")
    def require_complete_provenance(self) -> "ScenarioMorphologyDataset":
        for record in self.records:
            sourced_values = [
                record.canonical_summary,
                record.economy,
                record.politics,
                record.society,
                record.technosphere,
                record.biosphere,
                record.spatial_distribution,
                record.development,
                record.connectivity,
                record.smallest_scale,
            ]
            for sourced_value in sourced_values:
                if (
                    sourced_value.capture_status == "captured"
                    and isinstance(sourced_value.value, list)
                    and not sourced_value.value
                ):
                    raise ValueError("Captured morphology arrays cannot be empty.")
            require_exact_field_references(
                [record.field_provenance, *sourced_values],
                self.source,
                f"{self.id}.{record.scenario_id}",
            )
        return self


class ScenarioGrowthProvenance(JanusModel):
    scenario_id: FieldReferences = Field(alias="scenarioId")
    population: FieldReferences
    annual_energy_use_j: FieldReferences = Field(alias="annualEnergyUseJ")
    growth_state: FieldReferences = Field(alias="growthState")
    annual_growth_rate: FieldReferences = Field(alias="annualGrowthRate")


class ScenarioGrowthRecord(JanusModel):
    scenario_id: ScenarioId = Field(alias="scenarioId")
    population: float = Field(gt=0)
    annual_energy_use_j: float = Field(gt=0, alias="annualEnergyUseJ")
    growth_state: Literal["stable", "oscillatory", "growing"] = Field(alias="growthState")
    annual_growth_rate: float | None = Field(default=None, ge=0, alias="annualGrowthRate")
    field_provenance: ScenarioGrowthProvenance = Field(alias="fieldProvenance")


class ReferenceEarth(JanusModel):
    population: SourcedValue[Annotated[float, Field(gt=0, allow_inf_nan=False)]]
    annual_energy_per_person_gj: SourcedValue[
        Annotated[float, Field(gt=0, allow_inf_nan=False)]
    ] = Field(alias="annualEnergyPerPersonGJ")


class ScenarioGrowthDataset(CanonicalHeader):
    reference_earth: ReferenceEarth = Field(alias="referenceEarth")
    records: list[ScenarioGrowthRecord] = Field(min_length=10, max_length=10)

    @model_validator(mode="after")
    def require_complete_provenance(self) -> "ScenarioGrowthDataset":
        for record in self.records:
            require_exact_field_references(
                record.field_provenance,
                self.source,
                f"{self.id}.{record.scenario_id}",
            )
        return self


MissionId = Literal[
    "habitable_worlds_observatory",
    "radio",
    "large_interferometer_for_exoplanets",
    "solar_gravitational_lens",
    "deep_space_probes",
]
MISSION_IDS = (
    "habitable_worlds_observatory",
    "radio",
    "large_interferometer_for_exoplanets",
    "solar_gravitational_lens",
    "deep_space_probes",
)


class ObservabilityRecord(JanusModel):
    scenario_id: ScenarioId = Field(alias="scenarioId")
    scenario_provenance: FieldReferences = Field(alias="scenarioProvenance")
    detections: dict[MissionId, list[str]]
    detection_provenance: dict[MissionId, FieldReferences] = Field(alias="detectionProvenance")


class ObservabilityMission(JanusModel):
    id: MissionId
    label: str


class ObservabilityMissionProvenance(JanusModel):
    id: FieldReferences
    label: FieldReferences


class ObservabilityMissionAssumptions(JanusModel):
    distance: SourcedValue[str]
    integration_time: SourcedValue[str] = Field(alias="integrationTime")
    host: SourcedValue[str]
    concept: SourcedValue[str]


class ObservabilityDataset(CanonicalHeader):
    missions: list[ObservabilityMission] = Field(min_length=1)
    mission_provenance: dict[MissionId, ObservabilityMissionProvenance] = Field(
        alias="missionProvenance"
    )
    mission_assumptions: dict[MissionId, ObservabilityMissionAssumptions] = Field(
        alias="missionAssumptions"
    )
    records: list[ObservabilityRecord] = Field(min_length=10, max_length=10)

    @model_validator(mode="after")
    def require_complete_provenance(self) -> "ObservabilityDataset":
        expected = set(MISSION_IDS)
        if set(self.mission_provenance) != expected or set(self.mission_assumptions) != expected:
            raise ValueError(
                "Observability mission provenance and assumptions must cover all missions."
            )
        for record in self.records:
            if set(record.detections) != expected or set(record.detection_provenance) != expected:
                raise ValueError(
                    f"Observability record {record.scenario_id} must cover all mission cells."
                )
            require_exact_field_references(
                [record.scenario_provenance, record.detection_provenance],
                self.source,
                f"{self.id}.{record.scenario_id}",
            )
        require_exact_field_references(
            [self.mission_provenance, self.mission_assumptions],
            self.source,
            self.id,
        )
        return self


class CollapseParameters(JanusModel):
    r: float = Field(ge=0)
    R0: float = Field(ge=0)
    delta: float = Field(ge=0)
    cf: float = Field(ge=0, le=1)
    rd: float = Field(ge=0)
    rf: float = Field(ge=0, le=1)
    h: float = Field(ge=0)


class CollapseSimulation(JanusModel):
    window_years: int = Field(gt=0, alias="windowYears")
    time_step_years: float = Field(gt=0, alias="timeStepYears")
    monte_carlo_runs_per_scenario: int = Field(gt=0, alias="monteCarloRunsPerScenario")


class CollapseSimulationProvenance(JanusModel):
    window_years: FieldReferences = Field(alias="windowYears")
    time_step_years: FieldReferences = Field(alias="timeStepYears")
    monte_carlo_runs_per_scenario: FieldReferences = Field(alias="monteCarloRunsPerScenario")


CollapseParameterId = Literal["r", "R0", "delta", "cf", "rd", "rf", "h"]


class CollapseParameterDefinitionProvenance(JanusModel):
    id: FieldReferences
    label: FieldReferences
    unit: FieldReferences
    definition: FieldReferences


class CollapseParameterDefinition(JanusModel):
    id: CollapseParameterId
    label: str = Field(min_length=1)
    unit: str = Field(min_length=1)
    definition: str = Field(min_length=1)
    field_provenance: CollapseParameterDefinitionProvenance = Field(alias="fieldProvenance")


class CollapseReportedResults(JanusModel):
    fraction_never_collapsed: float | None = Field(
        default=None, ge=0, le=1, alias="fractionNeverCollapsed"
    )
    mean_duty_cycle: float | None = Field(default=None, ge=0, le=1, alias="meanDutyCycle")
    mean_time_to_first_collapse_years: float | None = Field(
        default=None, ge=0, alias="meanTimeToFirstCollapseYears"
    )
    mean_collapse_count: float | None = Field(default=None, ge=0, alias="meanCollapseCount")
    precision: Literal["exact_text", "approximate_text", "figure_only"]
    summary: str


class CollapseParameterProvenance(JanusModel):
    r: FieldReferences
    R0: FieldReferences
    delta: FieldReferences
    cf: FieldReferences
    rd: FieldReferences
    rf: FieldReferences
    h: FieldReferences


class CollapseReportedResultsProvenance(JanusModel):
    fraction_never_collapsed: FieldReferences = Field(alias="fractionNeverCollapsed")
    mean_duty_cycle: FieldReferences = Field(alias="meanDutyCycle")
    mean_time_to_first_collapse_years: FieldReferences = Field(alias="meanTimeToFirstCollapseYears")
    mean_collapse_count: FieldReferences = Field(alias="meanCollapseCount")
    precision: FieldReferences
    summary: FieldReferences


class CollapseScenarioProvenance(JanusModel):
    scenario_id: FieldReferences = Field(alias="scenarioId")
    parameters: CollapseParameterProvenance
    reported_results: CollapseReportedResultsProvenance = Field(alias="reportedResults")


class CollapseResultCaptureStatus(JanusModel):
    fraction_never_collapsed: Literal["captured", "not_transcribed"] = Field(
        alias="fractionNeverCollapsed"
    )
    mean_duty_cycle: Literal["captured", "not_transcribed"] = Field(alias="meanDutyCycle")
    mean_time_to_first_collapse_years: Literal["captured", "not_transcribed"] = Field(
        alias="meanTimeToFirstCollapseYears"
    )
    mean_collapse_count: Literal["captured", "not_transcribed"] = Field(alias="meanCollapseCount")
    precision: Literal["captured"]
    summary: Literal["captured"]


class CollapseScenario(JanusModel):
    scenario_id: ScenarioId = Field(alias="scenarioId")
    parameters: CollapseParameters
    reported_results: CollapseReportedResults = Field(alias="reportedResults")
    field_provenance: CollapseScenarioProvenance = Field(alias="fieldProvenance")
    result_capture_status: CollapseResultCaptureStatus = Field(alias="resultCaptureStatus")

    @model_validator(mode="after")
    def preserve_result_missing_states(self) -> "CollapseScenario":
        pairs = (
            (
                self.reported_results.fraction_never_collapsed,
                self.result_capture_status.fraction_never_collapsed,
            ),
            (self.reported_results.mean_duty_cycle, self.result_capture_status.mean_duty_cycle),
            (
                self.reported_results.mean_time_to_first_collapse_years,
                self.result_capture_status.mean_time_to_first_collapse_years,
            ),
            (
                self.reported_results.mean_collapse_count,
                self.result_capture_status.mean_collapse_count,
            ),
        )
        for value, status in pairs:
            if (value is None) != (status == "not_transcribed"):
                raise ValueError(
                    "Collapse null values must be not_transcribed and captured values must be "
                    "non-null."
                )
        return self


class CollapseDataset(CanonicalHeader):
    simulation: CollapseSimulation
    simulation_provenance: CollapseSimulationProvenance = Field(alias="simulationProvenance")
    parameter_definitions: list[CollapseParameterDefinition] = Field(alias="parameterDefinitions")
    scenarios: list[CollapseScenario] = Field(min_length=10, max_length=10)

    @model_validator(mode="after")
    def require_complete_provenance(self) -> "CollapseDataset":
        expected_parameters = {"r", "R0", "delta", "cf", "rd", "rf", "h"}
        if {definition.id for definition in self.parameter_definitions} != expected_parameters:
            raise ValueError("Collapse parameter definitions must cover all seven parameters.")
        require_exact_field_references(
            [
                self.simulation_provenance,
                [definition.field_provenance for definition in self.parameter_definitions],
                [scenario.field_provenance for scenario in self.scenarios],
            ],
            self.source,
            self.id,
        )
        return self


class PlanetaryTechnosignatureProvenance(JanusModel):
    signature_id: FieldReferences = Field(alias="signatureId")
    signature_label: FieldReferences = Field(alias="signatureLabel")
    body: FieldReferences
    unit: FieldReferences
    values: dict[ScenarioId, FieldReferences]
    annotations: FieldReferences


class PlanetaryTechnosignatureRow(JanusModel):
    signature_id: str = Field(min_length=1, alias="signatureId")
    signature_label: str = Field(min_length=1, alias="signatureLabel")
    body: Literal["Earth", "Moon", "Mars", "Venus"]
    unit: str = Field(min_length=1)
    values: dict[ScenarioId, float | None]
    annotations: list[str] = Field(default_factory=list)
    field_provenance: PlanetaryTechnosignatureProvenance = Field(alias="fieldProvenance")


class PlanetaryTechnosignatureDataset(CanonicalHeader):
    null_semantics: str = Field(min_length=1, alias="nullSemantics")
    scenarios: list[ScenarioId] = Field(min_length=10, max_length=10)
    rows: list[PlanetaryTechnosignatureRow] = Field(min_length=1)

    @model_validator(mode="after")
    def require_complete_provenance(self) -> "PlanetaryTechnosignatureDataset":
        expected = {f"S{index}" for index in range(1, 11)}
        if set(self.scenarios) != expected or len(self.scenarios) != len(expected):
            raise ValueError("Planetary dataset must list every scenario exactly once.")
        for row in self.rows:
            if set(row.values) != expected or set(row.field_provenance.values) != expected:
                raise ValueError(
                    f"Planetary row {row.signature_id} must cover every scenario cell."
                )
            require_exact_field_references(
                row.field_provenance,
                self.source,
                f"{self.id}.{row.signature_id}.{row.body}",
            )
        return self


class SystemTechnosignatureProvenance(JanusModel):
    signature_id: FieldReferences = Field(alias="signatureId")
    signature_label: FieldReferences = Field(alias="signatureLabel")
    present_in: dict[ScenarioId, FieldReferences] = Field(alias="presentIn")


class SystemTechnosignatureRow(JanusModel):
    signature_id: str = Field(min_length=1, alias="signatureId")
    signature_label: str = Field(min_length=1, alias="signatureLabel")
    present_in: list[ScenarioId] = Field(alias="presentIn")
    field_provenance: SystemTechnosignatureProvenance = Field(alias="fieldProvenance")


class SystemTechnosignatureDataset(CanonicalHeader):
    scenarios: list[ScenarioId] = Field(min_length=10, max_length=10)
    rows: list[SystemTechnosignatureRow] = Field(min_length=1)

    @model_validator(mode="after")
    def require_complete_provenance(self) -> "SystemTechnosignatureDataset":
        expected = {f"S{index}" for index in range(1, 11)}
        if set(self.scenarios) != expected or len(self.scenarios) != len(expected):
            raise ValueError("System dataset must list every scenario exactly once.")
        for row in self.rows:
            if len(row.present_in) != len(set(row.present_in)):
                raise ValueError(f"System row {row.signature_id} has duplicate scenario markers.")
            if set(row.field_provenance.present_in) != expected:
                raise ValueError(
                    f"System row {row.signature_id} must provenance marked and blank cells."
                )
            require_exact_field_references(
                row.field_provenance,
                self.source,
                f"{self.id}.{row.signature_id}",
            )
        return self


class SourceManifestEntry(JanusModel):
    id: str
    citation_id: str | None = Field(default=None, alias="citationId")
    title: str
    version: str
    creators: list[str]
    issued: str
    kind: str
    canonical_url: str = Field(alias="canonicalUrl")
    license: str | None
    rights_status: str = Field(alias="rightsStatus")
    reuse_policy: str = Field(alias="reusePolicy")
    local_path: str | None = Field(default=None, alias="localPath")
    sha256: str | None = None
    bytes: int | None = None
    page_count: int | None = Field(default=None, alias="pageCount")
    mime_type: str | None = Field(default=None, alias="mimeType")
    retrieved_at: str | None = Field(default=None, alias="retrievedAt")


class SourceManifest(JanusModel):
    schema_version: str = Field(alias="schemaVersion")
    generated_at: str = Field(alias="generatedAt")
    entries: list[SourceManifestEntry]

    @model_validator(mode="after")
    def require_unique_identifiers(self) -> "SourceManifest":
        identifiers = [
            identifier
            for entry in self.entries
            for identifier in (entry.id, entry.citation_id)
            if identifier is not None
        ]
        if len(identifiers) != len(set(identifiers)):
            raise ValueError("Source manifest IDs and citation aliases must be globally unique.")
        return self


class CorpusChunk(JanusModel):
    chunk_id: str = Field(alias="chunkId")
    source_id: str = Field(alias="sourceId")
    source_version: str = Field(alias="sourceVersion")
    scenario_ids: list[ScenarioId] = Field(default_factory=list, alias="scenarioIds")
    page_start: int = Field(gt=0, alias="pageStart")
    page_end: int = Field(gt=0, alias="pageEnd")
    heading_path: list[str] = Field(alias="headingPath")
    text: str = Field(min_length=1)
    content_hash: str = Field(alias="contentHash")
    rights: str
    evidence_kind: EvidenceKind = Field(alias="evidenceKind")


class StrictReviewModel(JanusModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class ReviewCorrection(StrictReviewModel):
    field_path: str = Field(min_length=1, alias="fieldPath")
    rationale: str = Field(min_length=10)


class DatasetReviewApproval(StrictReviewModel):
    dataset_id: str = Field(min_length=1, alias="datasetId")
    normalized_payload_hash: str = Field(
        pattern=r"^sha256:[0-9a-f]{64}$", alias="normalizedPayloadHash"
    )
    decision: Literal["approved"]
    corrections: list[ReviewCorrection]
    change_rationale: str = Field(min_length=20, alias="changeRationale")


class ReconciliationReviewApproval(StrictReviewModel):
    reconciliation_id: str = Field(min_length=1, alias="reconciliationId")
    reconciliation_payload_hash: str = Field(
        pattern=r"^sha256:[0-9a-f]{64}$", alias="reconciliationPayloadHash"
    )
    decision: Literal["approved"]
    rationale: str = Field(min_length=20)


class ReviewerIdentity(StrictReviewModel):
    name: str = Field(min_length=2)
    organization: str | None = Field(default=None, min_length=2)
    persistent_identifier: str | None = Field(
        default=None, min_length=3, alias="persistentIdentifier"
    )
    reviewed_at: datetime = Field(alias="reviewedAt")
    independence: Literal["independent"]
    independence_statement: str = Field(min_length=20, alias="independenceStatement")
    review_rationale: str = Field(min_length=20, alias="reviewRationale")

    @model_validator(mode="after")
    def require_timezone(self) -> "ReviewerIdentity":
        if self.reviewed_at.tzinfo is None or self.reviewed_at.utcoffset() is None:
            raise ValueError("Reviewer reviewedAt must include an explicit timezone offset.")
        return self


class ReviewerRecord(StrictReviewModel):
    schema_version: Literal["1.0.0"] = Field(alias="schemaVersion")
    data_version: str = Field(pattern=r"^sha256:[0-9a-f]{64}$", alias="dataVersion")
    reviewer: ReviewerIdentity
    dataset_approvals: list[DatasetReviewApproval] = Field(min_length=1, alias="datasetApprovals")
    reconciliation_approvals: list[ReconciliationReviewApproval] = Field(
        min_length=1, alias="reconciliationApprovals"
    )
    attestation_algorithm: Literal["sha256-canonical-json-v1"] = Field(alias="attestationAlgorithm")
    attestation_hash: str = Field(pattern=r"^sha256:[0-9a-f]{64}$", alias="attestationHash")

    @model_validator(mode="after")
    def require_unique_approvals(self) -> "ReviewerRecord":
        dataset_ids = [approval.dataset_id for approval in self.dataset_approvals]
        reconciliation_ids = [
            approval.reconciliation_id for approval in self.reconciliation_approvals
        ]
        if len(dataset_ids) != len(set(dataset_ids)):
            raise ValueError("Every dataset must be approved at most once.")
        if len(reconciliation_ids) != len(set(reconciliation_ids)):
            raise ValueError("Every reconciliation must be approved at most once.")
        return self


class ReviewSourceLineage(JanusModel):
    source_id: str = Field(min_length=1, alias="sourceId")
    source_version: str = Field(min_length=1, alias="sourceVersion")
    resolved_manifest_id: str = Field(min_length=1, alias="resolvedManifestId")
    source_file_sha256: str = Field(pattern=r"^[0-9a-f]{64}$", alias="sourceFileSha256")
    locator: SourceLocator
    source_page_text_hash: str = Field(pattern=r"^sha256:[0-9a-f]{64}$", alias="sourcePageTextHash")


class EquivalenceRowCoverage(JanusModel):
    canonical_row_id: str = Field(min_length=1, alias="canonicalRowId")
    foundational_row_label: str = Field(min_length=1, alias="foundationalRowLabel")
    unit: str = Field(min_length=1)
    columns: list[str] = Field(min_length=12, max_length=12)
    cell_count: int = Field(ge=1, alias="cellCount")
    status: Literal["exact_match"]
    foundational_values_hash: str = Field(
        pattern=r"^sha256:[0-9a-f]{64}$", alias="foundationalValuesHash"
    )
    consolidated_values_hash: str = Field(
        pattern=r"^sha256:[0-9a-f]{64}$", alias="consolidatedValuesHash"
    )

    @model_validator(mode="after")
    def require_exact_row_equivalence(self) -> "EquivalenceRowCoverage":
        if self.cell_count != len(self.columns) or len(set(self.columns)) != len(self.columns):
            raise ValueError(
                "Equivalence row coverage must count every unique column exactly once."
            )
        if self.foundational_values_hash != self.consolidated_values_hash:
            raise ValueError("An exact-match row must have identical deterministic value hashes.")
        return self


class TableEquivalenceOverlap(JanusModel):
    columns: list[str] = Field(min_length=12, max_length=12)
    rows: list[EquivalenceRowCoverage] = Field(min_length=10, max_length=10)
    row_count: int = Field(alias="rowCount")
    column_count: int = Field(alias="columnCount")
    cell_count: int = Field(alias="cellCount")
    excluded_consolidated_row_ids: list[str] = Field(alias="excludedConsolidatedRowIds")
    foundational_overlap_hash: str = Field(
        pattern=r"^sha256:[0-9a-f]{64}$", alias="foundationalOverlapHash"
    )
    consolidated_overlap_hash: str = Field(
        pattern=r"^sha256:[0-9a-f]{64}$", alias="consolidatedOverlapHash"
    )
    status: Literal["exact_match"]

    @model_validator(mode="after")
    def require_complete_overlap(self) -> "TableEquivalenceOverlap":
        if self.row_count != len(self.rows) or self.column_count != len(self.columns):
            raise ValueError("Table overlap counts must match the declared rows and columns.")
        if self.cell_count != self.row_count * self.column_count:
            raise ValueError("Table overlap cell count must equal row count times column count.")
        if self.foundational_overlap_hash != self.consolidated_overlap_hash:
            raise ValueError("An exact table overlap must have identical deterministic hashes.")
        if len({row.canonical_row_id for row in self.rows}) != len(self.rows):
            raise ValueError("Table overlap canonical row IDs must be unique.")
        return self


class TableEquivalenceRecord(JanusModel):
    schema_version: str = Field(alias="schemaVersion")
    data_version: str = Field(pattern=r"^sha256:[0-9a-f]{64}$", alias="dataVersion")
    reconciliation_id: str = Field(min_length=1, alias="reconciliationId")
    release_status: Literal["candidate_not_reviewed", "reviewed"] = Field(alias="releaseStatus")
    relation: Literal["exact_value_equivalence_for_overlap"]
    canonical_dataset_id: str = Field(min_length=1, alias="canonicalDatasetId")
    canonical_path: str = Field(min_length=1, alias="canonicalPath")
    foundational_source: ReviewSourceLineage = Field(alias="foundationalSource")
    consolidated_source: ReviewSourceLineage = Field(alias="consolidatedSource")
    overlap: TableEquivalenceOverlap
    canonical_decision: str = Field(min_length=1, alias="canonicalDecision")
    independent_human_review: Literal["pending", "approved"] = Field(alias="independentHumanReview")
    review_attestation_hash: str | None = Field(
        default=None,
        pattern=r"^sha256:[0-9a-f]{64}$",
        alias="reviewAttestationHash",
    )
    review_approval: ReconciliationReviewApproval | None = Field(
        default=None, alias="reviewApproval"
    )
    reconciliation_payload_hash: str = Field(
        pattern=r"^sha256:[0-9a-f]{64}$", alias="reconciliationPayloadHash"
    )

    @model_validator(mode="after")
    def require_consistent_review_state(self) -> "TableEquivalenceRecord":
        if self.release_status == "reviewed":
            if (
                self.independent_human_review != "approved"
                or self.review_attestation_hash is None
                or self.review_approval is None
            ):
                raise ValueError("A reviewed reconciliation requires approval and an attestation.")
        elif (
            self.independent_human_review != "pending"
            or self.review_attestation_hash is not None
            or self.review_approval is not None
        ):
            raise ValueError("A candidate reconciliation cannot carry review approval metadata.")
        return self
