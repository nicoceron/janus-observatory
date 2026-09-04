"""Fetch nearby Sun-like stellar context from the NASA Exoplanet Archive TAP service.

The collapse experiment itself needs no external data; this optional context table
supports later observer-side work by listing confirmed planet-host stars within 15 pc
whose effective temperatures fall in the solar range (5300-6000 K). Distances are the
Archive's system distances in parsecs.

Data source: NASA Exoplanet Archive (IPAC/Caltech), `ps` table via TAP
https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html
Required acknowledgment text is written alongside the CSV. The snapshot records the
query text, retrieval timestamp, and row count; re-running overwrites the snapshot.

Usage:
    uv run --project experiments/resilience-lab python \
        experiments/resilience-lab/scripts/fetch_stellar_context.py
"""

from __future__ import annotations

import csv
import io
import json
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

TAP_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"
QUERY = (
    "SELECT DISTINCT hostname, sy_dist, st_teff, st_rad, st_met "
    "FROM ps WHERE sy_dist < 15.0 AND st_teff BETWEEN 5300 AND 6000 "
    "AND hostname IS NOT NULL ORDER BY sy_dist"
)
ACKNOWLEDGMENT = (
    "This research has made use of the NASA Exoplanet Archive, which is operated by the "
    "California Institute of Technology, under contract with the National Aeronautics and "
    "Space Administration under the Exoplanet Exploration Program."
)


def fetch_rows(timeout: int = 60) -> list[list[str]]:
    url = TAP_URL + "?" + urllib.parse.urlencode({"query": QUERY, "format": "csv"})
    with urllib.request.urlopen(url, timeout=timeout) as response:
        text = response.read().decode("utf-8")
    reader = csv.reader(io.StringIO(text))
    return [row for row in reader if row]


def main() -> int:
    out_dir = Path(__file__).resolve().parents[1] / "data" / "generated" / "nasa"
    out_dir.mkdir(parents=True, exist_ok=True)
    try:
        rows = fetch_rows()
    except Exception as error:
        print(f"NASA Exoplanet Archive unreachable ({error}); no snapshot written")
        return 1

    csv_path = out_dir / "solar-type-hosts-within-15pc.csv"
    csv_path.write_text("\n".join(",".join(row) for row in rows) + "\n", encoding="utf-8")

    meta = {
        "source": "NASA Exoplanet Archive TAP (ps table)",
        "url": TAP_URL,
        "query": QUERY,
        "retrievedAt": datetime.now(UTC).isoformat(),
        "rows": max(len(rows) - 1, 0),
        "acknowledgment": ACKNOWLEDGMENT,
        "columns": rows[0] if rows else [],
        "evidenceKind": "reported",
        "use": "contextual stellar distances for observer-side analysis; not canonical Janus data",
    }
    (out_dir / "snapshot.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"wrote {meta['rows']} systems to {csv_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
