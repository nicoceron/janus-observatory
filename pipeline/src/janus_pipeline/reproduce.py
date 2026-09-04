"""Strict fresh-clone generated-data reproducibility gate."""

from __future__ import annotations

import argparse
import os
import subprocess
from pathlib import Path

from .generate import DEFAULT_OUTPUT, WORKSPACE, check_release
from .source_fetch import MANIFEST_PATH, SourceFetchError, verify_local_sources

RESILIENCE_PROJECT = WORKSPACE / "experiments" / "resilience-lab"


def verify_resilience_report() -> None:
    """Replay the independent, noncanonical collapse comparison without network access."""

    command = [
        "uv",
        "run",
        "--project",
        str(RESILIENCE_PROJECT),
        "--locked",
        "--no-sync",
        "janus-resilience",
        "verify",
    ]
    try:
        result = subprocess.run(
            command,
            cwd=WORKSPACE,
            capture_output=True,
            text=True,
            env={**os.environ, "UV_OFFLINE": "1"},
            check=False,
        )
    except OSError as error:
        raise SystemExit(
            f"strict reproducibility could not execute resilience replay: {error}"
        ) from error
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip()
        raise SystemExit(f"strict reproducibility failed resilience replay: {detail}")
    if result.stdout.strip():
        print(result.stdout.strip())


def strict_check(output: Path = DEFAULT_OUTPUT) -> None:
    """Refuse metadata-only fallback, then compare generated files byte for byte."""

    try:
        sources = verify_local_sources(MANIFEST_PATH, WORKSPACE)
    except (SourceFetchError, OSError) as error:
        raise SystemExit(
            f"strict reproducibility requires the complete source lock: {error}"
        ) from error
    verify_resilience_report()
    check_release(output)
    print(f"strict reproducibility verified from {len(sources)} checksum-locked source PDFs")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    strict_check(args.output.resolve())


if __name__ == "__main__":
    main()
