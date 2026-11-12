#!/bin/sh
# Keep a time-stamped copy of every work-in-progress kit sheet, for process reels.
# Usage: scripts/kit-process-archive.sh [minutes]   (runs until the time is up)
cd "$(dirname "$0")/.." || exit 1
SRC=tmp/premium/sheets
DST=media/kit-process/wip
END=$(( $(date +%s) + ${1:-600} * 60 ))
mkdir -p "$DST"
while [ "$(date +%s)" -lt "$END" ]; do
  find "$SRC" -type f \( -name '*.png' -o -name '*.jpg' \) 2>/dev/null | while read -r f; do
    rel=${f#"$SRC"/}
    dir=$DST/$(dirname "$rel")
    base=$(basename "$rel")
    stamp=$(stat -f '%Sm' -t '%Y%m%d-%H%M%S' "$f")
    out="$dir/${base%.*}__$stamp.${base##*.}"
    [ -f "$out" ] || { mkdir -p "$dir"; cp -p "$f" "$out"; }
  done
  sleep 45
done
