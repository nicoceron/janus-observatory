#!/usr/bin/env python3
"""Run original Janus Blender builds serially with bounded resource use on macOS.

No GUI application is opened or closed. Only the new process group launched here can
receive termination signals. Logs append; per-world JSON receipts retain all attempts.
"""

from __future__ import annotations

import argparse
import contextlib
import datetime as dt
import fcntl
import hashlib
import json
import os
import re
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parent.parent
BLENDER = Path("/Applications/Blender.app/Contents/MacOS/Blender")
BUILDER = REPO / "scripts/blender/finish_world.py"
QA = REPO / "docs/qa/blender-finish"
WORLDS = ["origin", *(f"s{i}" for i in range(1, 11))]
GIB = 1024**3


class SafetyError(RuntimeError):
    """A preflight or resource condition prevents safe continuation."""


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def command_text(argv: list[str]) -> str:
    return subprocess.run(
        argv, check=True, capture_output=True, text=True, timeout=5
    ).stdout


def parse_vm_stat(text: str) -> dict[str, int]:
    match = re.search(r"page size of (\d+) bytes", text)
    if not match:
        raise SafetyError(
            "vm_stat did not provide a page size; refusing unmonitored launch."
        )
    page_size = int(match.group(1))
    pages = {
        key.strip(): int(value)
        for key, value in re.findall(r"^([^:\n]+):\s*(\d+)\.", text, re.MULTILINE)
    }
    if "Pages free" not in pages or "Pages inactive" not in pages:
        raise SafetyError(
            "vm_stat lacks free/inactive pages; refusing unmonitored launch."
        )
    free = pages["Pages free"] * page_size
    inactive = pages["Pages inactive"] * page_size
    purgeable = pages.get("Pages purgeable", 0) * page_size
    return {
        "pageSizeBytes": page_size,
        "freeBytes": free,
        "inactiveBytes": inactive,
        "purgeableBytes": purgeable,
        "freePlusInactiveBytes": free + inactive,
        "launchAvailableBytes": free + inactive + purgeable,
    }


def memory_snapshot() -> dict[str, Any]:
    if sys.platform != "darwin":
        raise SafetyError("This runner requires macOS vm_stat/sysctl resource checks.")
    result: dict[str, Any] = parse_vm_stat(command_text(["/usr/bin/vm_stat"]))
    result.update(
        capturedAt=now(),
        totalRamBytes=int(
            command_text(["/usr/sbin/sysctl", "-n", "hw.memsize"]).strip()
        ),
        swap=command_text(["/usr/sbin/sysctl", "vm.swapusage"]).strip(),
        availableDefinition="free + inactive + purgeable; conservative checks also retain free + inactive",
    )
    return result


def process_table() -> list[dict[str, Any]]:
    output = command_text(["/bin/ps", "-axo", "pid=,pgid=,rss=,comm="])
    rows = []
    for line in output.splitlines():
        fields = line.strip().split(None, 3)
        if len(fields) != 4:
            continue
        pid, pgid, rss, executable = fields
        rows.append(
            {
                "pid": int(pid),
                "pgid": int(pgid),
                "rssBytes": int(rss) * 1024,
                "executable": executable,
            }
        )
    return rows


def existing_blender(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    # `comm`, not the argument string: Python/uv blender-mcp servers do not match.
    return [row for row in rows if Path(row["executable"]).name.casefold() == "blender"]


def check_idle_gui(pid: int) -> dict[str, Any]:
    """Permit one explicitly inspected GUI without touching its scene or process."""
    if not process_exists(pid):
        return {"pid": pid, "closed": True}
    fields = (
        command_text(["/bin/ps", "-p", str(pid), "-o", "%cpu=,rss=,args="])
        .strip()
        .split(None, 2)
    )
    cpu, rss, command = float(fields[0]), int(fields[1]) * 1024, fields[2]
    if command.strip() != str(BLENDER) or cpu > 10 or rss > 2 * GIB:
        raise SafetyError(
            "Inspected Blender GUI is busy or changed; pausing only the Janus background job."
        )
    return {"pid": pid, "cpuPercent": cpu, "rssBytes": rss, "untouched": True}


def process_exists(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


@contextlib.contextmanager
def runner_lock(repo: Path):
    digest = hashlib.sha256(str(repo.resolve()).encode()).hexdigest()[:16]
    path = Path(tempfile.gettempdir()) / f"janus-blender-{digest}.lock"
    # Never unlink a flock file: another waiter may already have its inode open.
    with path.open("a+", encoding="utf-8") as handle:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            handle.seek(0)
            owner = handle.read().strip()
            raise SafetyError(
                f"Another Janus Blender runner holds {path}: {owner}"
            ) from error
        handle.seek(0)
        try:
            old = json.load(handle)
        except (ValueError, TypeError):
            old = {}
        previous_pid = old.get("pid")
        record = {
            "pid": os.getpid(),
            "repo": str(repo),
            "acquiredAt": now(),
            "active": True,
            "previousPid": previous_pid,
            "previousPidAlive": process_exists(previous_pid)
            if isinstance(previous_pid, int)
            else False,
        }
        handle.seek(0)
        handle.truncate()
        json.dump(record, handle)
        handle.flush()
        os.fsync(handle.fileno())
        try:
            yield path
        finally:
            record.update(active=False, releasedAt=now())
            handle.seek(0)
            handle.truncate()
            json.dump(record, handle)
            handle.flush()
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def file_checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return "sha256:" + digest.hexdigest()


def fingerprints(seed_dir: Path, world: str) -> dict[str, Any]:
    files = {"runner": file_checksum(Path(__file__)), "builder": file_checksum(BUILDER)}
    modules = {
        str(path.relative_to(REPO)): file_checksum(path)
        for path in sorted(BUILDER.parent.rglob("*.py"))
    }
    seed = seed_dir / f"{world}.json"
    if not seed.is_file():
        raise SafetyError(f"Missing seed input: {seed}; cannot verify provenance.")
    seeds = {seed.name: file_checksum(seed)}
    return {**files, "modules": modules, "seeds": seeds}


def load_receipts(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"schemaVersion": "1.0.0", "attempts": []}
    value = json.loads(path.read_text())
    if not isinstance(value, dict) or not isinstance(value.get("attempts"), list):
        raise SafetyError(
            f"Unexpected receipt format in {path}; refusing to overwrite it."
        )
    return value


def save_receipt(path: Path, receipt: dict[str, Any]) -> None:
    data = load_receipts(path)
    data["attempts"].append(receipt)
    temporary = path.with_suffix(f".tmp-{os.getpid()}")
    try:
        temporary.write_text(json.dumps(data, indent=2) + "\n")
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def resumable(
    data: dict[str, Any], fingerprint: dict[str, Any], version: str | None
) -> bool:
    if not fingerprint.get("seeds"):
        return False
    # Only the latest attempt can be reused; a later failed run may have partial outputs.
    latest = data["attempts"][-1] if data["attempts"] else {}
    identity_matches = (
        latest.get("status") == "success"
        and latest.get("exitCode") == 0
        and latest.get("fingerprints") == fingerprint
        and latest.get("blenderVersion") == version
    )
    outputs = latest.get("requiredOutputs", {})
    return bool(
        identity_matches
        and outputs
        and all(
            (REPO / path).is_file() and file_checksum(REPO / path) == checksum
            for path, checksum in outputs.items()
        )
    )


def required_outputs(world: str) -> dict[str, str]:
    paths = [REPO / "assets/blender" / f"{world}.blend", QA / f"model-{world}.json"]
    absent = [str(path) for path in paths if not path.is_file()]
    if absent:
        raise SafetyError(
            f"Blender exited successfully but required outputs are missing: {absent}"
        )
    return {str(path.relative_to(REPO)): file_checksum(path) for path in paths}


def terminate_group(process: subprocess.Popen, grace: float = 10) -> None:
    """TERM then KILL only the private session/process group created by this runner."""
    group = process.pid
    try:
        os.killpg(group, signal.SIGTERM)
    except ProcessLookupError:
        process.wait()
        return
    until = time.monotonic() + grace
    while time.monotonic() < until:
        process.poll()
        try:
            os.killpg(group, 0)
        except ProcessLookupError:
            process.wait()
            return
        time.sleep(0.2)
    try:
        os.killpg(group, signal.SIGKILL)
    except ProcessLookupError:
        pass
    process.wait(timeout=5)


def run_world(args: argparse.Namespace, world: str) -> bool:
    QA.mkdir(parents=True, exist_ok=True)
    log_path = QA / f"{args.phase}-{world}.log"
    receipt_path = QA / f"{args.phase}-{world}.resources.json"
    fingerprint = fingerprints(args.seed_dir, world)
    history = load_receipts(receipt_path)
    if args.resume and resumable(history, fingerprint, args.blender_version):
        print(
            f"{args.phase} {world}: matching successful receipt; skipped.", flush=True
        )
        return True
    timeout = args.build_timeout if args.phase == "build" else args.review_timeout
    command = [
        "/usr/bin/nice",
        "-n",
        "12",
        str(BLENDER),
        "--background",
        "--factory-startup",
        "--threads",
        "2",
        "--python-exit-code",
        "1",
        "--python",
        str(BUILDER),
        "--",
        "--world",
        world,
        "--phase",
        args.phase,
    ]
    receipt: dict[str, Any] = {
        "world": world,
        "phase": args.phase,
        "startedAt": now(),
        "status": "starting",
        "blenderVersion": args.blender_version,
        "fingerprints": fingerprint,
        "command": command,
        "cwd": str(REPO),
        "log": str(log_path.relative_to(REPO)),
        "limits": {
            "rssBytes": int(args.rss_limit_gib * GIB),
            "deadlineSeconds": timeout,
            "minimumAvailableBytes": int(args.min_available_gib * GIB),
            "threads": 2,
            "niceAdjustment": 12,
            "terminationGraceSeconds": 10,
            "sampleSeconds": 0.5,
        },
        "peakSampledGroupRssBytes": 0,
        "observedProcessIds": [],
        "exitCode": None,
    }
    started = time.monotonic()
    process = None
    seen = set()
    with log_path.open("a", buffering=1, encoding="utf-8") as log:
        log.write(f"\n=== {receipt['startedAt']} {args.phase} {world} ===\n")
        try:
            others = existing_blender(process_table())
            if (
                others
                and args.idle_gui_pid
                and all(row["pid"] == args.idle_gui_pid for row in others)
            ):
                receipt["idleGui"] = check_idle_gui(args.idle_gui_pid)
                others = []
            if others:
                raise SafetyError(
                    f"Blender already running: {others}. Close it manually or retry after it finishes."
                )
            receipt["memoryStart"] = memory_snapshot()
            if (
                receipt["memoryStart"]["launchAvailableBytes"]
                < args.min_available_gib * GIB
            ):
                raise SafetyError(
                    f"Only {receipt['memoryStart']['launchAvailableBytes'] / GIB:.2f} GiB free + inactive + purgeable; {args.min_available_gib:g} GiB required. No Blender process launched."
                )
            environment = os.environ.copy()
            environment.update(
                OMP_NUM_THREADS="2",
                OPENBLAS_NUM_THREADS="2",
                VECLIB_MAXIMUM_THREADS="2",
            )
            process = subprocess.Popen(
                command,
                cwd=REPO,
                stdout=log,
                stderr=subprocess.STDOUT,
                start_new_session=True,
                env=environment,
            )
            receipt["pid"] = receipt["processGroupId"] = process.pid
            print(
                f"{args.phase} {world}: PID {process.pid}, 2 threads, RSS cap {args.rss_limit_gib:g} GiB, deadline {timeout:g}s.",
                flush=True,
            )
            last_headroom = time.monotonic()
            while process.poll() is None:
                members = [row for row in process_table() if row["pgid"] == process.pid]
                rss = sum(row["rssBytes"] for row in members)
                seen.update(row["pid"] for row in members)
                receipt["peakSampledGroupRssBytes"] = max(
                    receipt["peakSampledGroupRssBytes"], rss
                )
                if rss > args.rss_limit_gib * GIB:
                    raise SafetyError(
                        f"Owned Blender process group reached {rss / GIB:.2f} GiB RSS; cap is {args.rss_limit_gib:g} GiB."
                    )
                if time.monotonic() - started >= timeout:
                    raise SafetyError(
                        f"Owned Blender process exceeded {timeout:g}s deadline."
                    )
                if time.monotonic() - last_headroom >= 5:
                    if memory_snapshot()["freePlusInactiveBytes"] < 2 * GIB:
                        raise SafetyError(
                            "System memory headroom fell below 2 GiB; stopping only the Janus process group."
                        )
                    if args.idle_gui_pid:
                        check_idle_gui(args.idle_gui_pid)
                    last_headroom = time.monotonic()
                time.sleep(0.5)
            receipt["exitCode"] = process.returncode
            leftovers = [row for row in process_table() if row["pgid"] == process.pid]
            if leftovers:
                raise SafetyError(
                    "Owned Blender process exited leaving child processes; stopping its private group."
                )
            receipt["status"] = "success" if process.returncode == 0 else "failed"
            if process.returncode == 0:
                receipt["requiredOutputs"] = required_outputs(world)
            if process.returncode:
                receipt["error"] = (
                    f"Blender exited with code {process.returncode}; see {log_path}."
                )
        except BaseException as error:  # noqa: BLE001 -- Every failure must stop the owned process group.
            receipt["status"] = (
                "interrupted" if isinstance(error, KeyboardInterrupt) else "failed"
            )
            receipt["error"] = str(error) or type(error).__name__
            if process is not None:
                terminate_group(process)
                receipt["exitCode"] = process.returncode
            log.write(f"RUNNER: {receipt['error']}\n")
        finally:
            receipt["observedProcessIds"] = sorted(seen)
            receipt["elapsedSeconds"] = round(time.monotonic() - started, 3)
            receipt["endedAt"] = now()
            try:
                receipt["memoryEnd"] = memory_snapshot()
            except (
                SafetyError,
                OSError,
                ValueError,
                subprocess.SubprocessError,
            ) as error:
                receipt["memoryEndError"] = str(error)
            save_receipt(receipt_path, receipt)
            log.write(
                f"RUNNER: {receipt['status']} after {receipt['elapsedSeconds']}s; peak sampled group RSS {receipt['peakSampledGroupRssBytes'] / GIB:.3f} GiB.\n"
            )
    print(
        f"{args.phase} {world}: {receipt['status']}; {receipt_path.relative_to(REPO)}",
        flush=True,
    )
    if receipt.get("error"):
        print(receipt["error"], file=sys.stderr, flush=True)
    return receipt["status"] == "success"


def positive(value: str) -> float:
    result = float(value)
    if not 0 < result < float("inf"):
        raise argparse.ArgumentTypeError("Value must be a finite positive number.")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--worlds", nargs="+", default=WORLDS, choices=WORLDS)
    parser.add_argument("--phase", choices=["build", "review"], default="build")
    parser.add_argument(
        "--build-timeout", type=positive, default=240, metavar="SECONDS"
    )
    parser.add_argument(
        "--review-timeout", type=positive, default=600, metavar="SECONDS"
    )
    parser.add_argument("--rss-limit-gib", type=positive, default=4)
    parser.add_argument("--min-available-gib", type=positive, default=4)
    parser.add_argument(
        "--idle-gui-pid",
        type=int,
        help="A previously inspected idle Blender GUI PID; leaves it untouched and aborts our job if it becomes busy.",
    )
    parser.add_argument(
        "--blender-version",
        help="Previously verified Blender version, recorded without another Blender launch.",
    )
    parser.add_argument(
        "--seed-dir",
        type=Path,
        default=REPO / "assets/blender/seeds",
        help="Seed input directory containing origin.json, s1.json etc.",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Skip only the latest successful receipt with identical runner, builder/modules, seeds and supplied version.",
    )
    args = parser.parse_args()
    if args.seed_dir:
        args.seed_dir = args.seed_dir.resolve()
        if not args.seed_dir.is_dir():
            parser.error(f"Seed directory does not exist: {args.seed_dir}")
    if len(set(args.worlds)) != len(args.worlds):
        parser.error("Each world can appear only once per serial run")

    def interrupt(_signum, _frame):
        raise KeyboardInterrupt(
            "Runner interrupted; stopping only its owned Blender group."
        )

    signal.signal(signal.SIGTERM, interrupt)
    try:
        if not BLENDER.is_file() or not BUILDER.is_file():
            raise SafetyError(
                f"Required Blender executable or builder missing: {BLENDER}, {BUILDER}"
            )
        with runner_lock(REPO):
            for world in args.worlds:
                if not run_world(args, world):
                    return 1
    except (SafetyError, OSError, ValueError, subprocess.SubprocessError) as error:
        print(f"Blender runner stopped: {error}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        return 130
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
