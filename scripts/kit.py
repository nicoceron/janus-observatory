#!/usr/bin/env python3
"""Run a kit command in background Blender, one job at a time.

  python3 scripts/kit.py list | stats | review ... | export

Jobs are short. A lock file serialises them so several authors can work in parallel without
stacking Blender processes, and each job is limited to two CPU threads. See
scripts/blender/kit/build.py for the commands.
"""

from __future__ import annotations

import fcntl
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "scripts/blender/kit/build.py"
LOCK = Path(os.environ.get("TMPDIR", "/tmp")) / "janus-kit-blender.lock"
NOISE = ("Blender ", "Read prefs", "Saved:", "Time:", "Fra:", "Error: Cannot read file", "Info: ")


def main() -> int:
    blender = os.environ.get("BLENDER") or shutil.which("blender")
    if not blender:
        candidate = "/Applications/Blender.app/Contents/MacOS/Blender"
        blender = candidate if os.path.exists(candidate) else None
    if not blender:
        print("Blender was not found; set BLENDER=/path/to/blender.", file=sys.stderr)
        return 2
    command = [
        blender, "-b", "--factory-startup", "--threads", "2",
        "--python-exit-code", "1", "--python", str(BUILD), "--", *sys.argv[1:],
    ]
    with open(LOCK, "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        assert process.stdout
        for line in process.stdout:
            if not line.strip() or line.startswith(NOISE):
                continue
            sys.stdout.write(line)
        return process.wait()


if __name__ == "__main__":
    sys.exit(main())
