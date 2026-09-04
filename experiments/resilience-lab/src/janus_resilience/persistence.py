"""Technosignature observation probabilities from duty cycles (paper Eq. 7).

JANUS-PAPER-05 section 6.2 defines, for technosignature i present in a scenario,

    p_i = {Dc + min[Ti / Tspan, 1 - Dc]} * delta_i,

where Dc is the scenario duty cycle, Ti the signature lifetime, Tspan the 1000-year
observation window, and delta_i a presence flag. The equation says a short-lived
signature is only observable while the civilization is active, whereas long-lived relic
signatures remain observable through inactive periods.

Inputs follow the provenance rules:

  - lifetimes come from the paper's own prose (CC BY 4.0): CFC-11 55 yr, CFC-12 140 yr,
    CF4 about 50,000 yr; NO2 lives hours to days,
  - presence flags are DERIVED here from the reviewed canonical mission-detection
    matrix (janus.observability.apjl-figure-6), not re-transcribed from another table:
    NO2 counts as present where HWO detects CO2 + NO2; CFCs count as present where LIFE
    detects CO2 + CFC-11/12. CF4 presence is not separable from that matrix and stays
    explicitly not_evaluated rather than guessed.

Duty cycles may come from this experiment's own ensembles (reimplemented evidence) or
from the canonical reported values; each column is labeled with its evidence kind.
These probabilities describe the published model's behavior under stated assumptions.
They are not forecasts and not probabilities that any real civilization exists.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

SIGNATURE_LIFETIMES_YR = {
    "no2": {"lifetime": 0.03, "note": "hours to days; paper section 6.2 prose"},
    "cfc11": {"lifetime": 55.0, "note": "CFC-11 atmospheric lifetime, paper section 6.2"},
    "cfc12": {"lifetime": 140.0, "note": "CFC-12 atmospheric lifetime, paper section 6.2"},
    "cf4": {
        "lifetime": 50000.0,
        "note": "about 50,000 yr, paper section 6.2; presence not evaluated here",
    },
}

SPAN_YEARS = 1000


def load_presence_flags(observability_path: Path) -> dict[str, dict[str, int | str]]:
    """Derive per-scenario presence flags from the canonical detection matrix."""
    data = json.loads(observability_path.read_text(encoding="utf-8"))
    flags: dict[str, dict[str, int | str]] = {}
    for record in data["records"]:
        sid = record["scenarioId"]
        hwo = " ".join(record["detections"].get("habitable_worlds_observatory", []))
        life = " ".join(record["detections"].get("large_interferometer_for_exoplanets", []))
        flags[sid] = {
            "no2": int("NO2" in hwo),
            "cfc11": int("CFC" in life),
            "cfc12": int("CFC" in life),
            "cf4": "not_evaluated",
            "derivation": "NO2: HWO 'CO2 + NO2'; CFCs: LIFE 'CO2 + CFC-11/12'",
        }
    return flags


def observation_probability(
    duty_cycle: float | np.ndarray, lifetime_yr: float, present: bool = True
) -> float | np.ndarray:
    """Paper Eq. (7). Returns 0 when the signature is absent (delta_i = 0)."""
    if not present:
        if isinstance(duty_cycle, np.ndarray):
            return np.zeros_like(duty_cycle, dtype=float)
        return 0.0
    duty = np.asarray(duty_cycle, dtype=float)
    relic = np.minimum(lifetime_yr / SPAN_YEARS, 1.0 - duty)
    out = duty + relic
    return float(out) if out.ndim == 0 else out


def persistence_table(
    duty_by_scenario: dict[str, float],
    duty_evidence_kind: str,
    presence_flags: dict[str, dict[str, int | str]],
) -> list[dict]:
    rows = []
    for sid in sorted(duty_by_scenario):
        row: dict = {
            "scenarioId": sid,
            "dutyCycleUsed": round(float(duty_by_scenario[sid]), 5),
            "dutyEvidenceKind": duty_evidence_kind,
        }
        for sig, meta in SIGNATURE_LIFETIMES_YR.items():
            flag = presence_flags.get(sid, {}).get(sig, "not_evaluated")
            if flag == "not_evaluated":
                row[sig] = None
                row[f"{sig}_status"] = "not_evaluated"
                continue
            value = observation_probability(
                float(duty_by_scenario[sid]), meta["lifetime"], bool(flag)
            )
            row[sig] = round(value, 5)
            row[f"{sig}_status"] = "derived"
        rows.append(row)
    return rows
