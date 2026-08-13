"""Command-line validation and comparison for Concordia run artifacts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from janus_concordia.compare import compare_run
from janus_concordia.contract import validate_run_record


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_or_print(value: Any, output: Path | None) -> None:
    serialized = json.dumps(value, indent=2, sort_keys=True) + "\n"
    if output is None:
        print(serialized, end="")
        return
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(serialized, encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate or compare non-canonical Concordia run artifacts."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate_parser = subparsers.add_parser("validate", help="Validate a run record")
    validate_parser.add_argument("run", type=Path)

    compare_parser = subparsers.add_parser(
        "compare", help="Compare a run with its reviewed Janus target dimensions"
    )
    compare_parser.add_argument("run", type=Path)
    compare_parser.add_argument("--repository-root", type=Path)
    compare_parser.add_argument("--output", type=Path)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    run = _read_json(args.run)
    if args.command == "validate":
        validated = validate_run_record(run)
        print(f"valid: {validated['runId']}")
        return
    comparison = compare_run(run, args.repository_root)
    _write_or_print(comparison, args.output)


if __name__ == "__main__":
    main()
