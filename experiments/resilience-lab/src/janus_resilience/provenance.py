"""Provenance helpers: environment capture and deterministic checksums."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def git_commit(repo_root: Path) -> str | None:
    try:
        return subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
    except Exception:
        return None


def environment_record() -> dict:
    import numpy
    import scipy

    record = {
        "python": sys.version.split()[0],
        "numpy": numpy.__version__,
        "scipy": scipy.__version__,
        "platform": sys.platform,
        "capturedAt": utc_now(),
    }
    try:
        import sklearn

        record["scikit-learn"] = sklearn.__version__
    except ImportError:
        record["scikit-learn"] = None
    return record


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def implementation_files(experiment_root: Path) -> list[Path]:
    """Return every file that can change the independent replication result.

    The implementation is currently an untracked experiments-track tree, so a Git
    commit alone cannot identify it.  This explicit, sorted file set binds reports
    to the actual Python implementation, dependency lock, and recorded step
    semantics used to produce them.
    """

    required = [
        experiment_root / "ADR-0001.md",
        experiment_root / "pyproject.toml",
        experiment_root / "uv.lock",
    ]
    source_files = sorted((experiment_root / "src" / "janus_resilience").glob("*.py"))
    files = [*required, *source_files]
    missing = [path for path in files if not path.is_file()]
    if missing:
        raise FileNotFoundError(
            "resilience implementation fingerprint is missing: "
            + ", ".join(str(path) for path in missing)
        )
    return sorted(files, key=lambda path: path.relative_to(experiment_root).as_posix())


def implementation_record(experiment_root: Path, canonical_input: Path) -> dict:
    """Build a deterministic receipt for implementation and canonical input bytes."""

    records = [
        {
            "path": path.relative_to(experiment_root).as_posix(),
            "sha256": sha256_file(path),
        }
        for path in implementation_files(experiment_root)
    ]
    encoded = json.dumps(records, sort_keys=True, separators=(",", ":")).encode()
    return {
        "algorithm": "sha256-file-manifest-v1",
        "treeHash": f"sha256:{hashlib.sha256(encoded).hexdigest()}",
        "canonicalInputHash": f"sha256:{sha256_file(canonical_input)}",
        "files": records,
    }
