#!/bin/sh
# Run the deterministic visual-regression suite the way its baselines were made: the pinned
# Playwright container's Linux Chromium (software WebGL), driving a production build that this
# machine builds and serves on port 3200.
#
# Usage: scripts/visual-regression.sh [playwright test arguments]
#   scripts/visual-regression.sh                      compare against the stored baselines
#   scripts/visual-regression.sh --update-snapshots   rewrite them (look at each image afterwards)
#
# Needs Docker Desktop (the container reaches the host as host.docker.internal) and an installed
# workspace (pnpm install --frozen-lockfile). VISUAL_REUSE_BUILD=1 serves the existing
# apps/web/.next instead of building again.
set -eu
cd "$(dirname "$0")/.."

PORT=3200
# One source for the pinned image: the workflow that documents this suite's environment.
IMAGE=$(sed -n 's/^ *image: *//p' .github/workflows/visual-regression.yml | head -n 1)
case "$IMAGE" in
  mcr.microsoft.com/playwright:*@sha256:*) ;;
  *)
    echo "No digest-pinned Playwright image in .github/workflows/visual-regression.yml." >&2
    exit 1
    ;;
esac

if curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then
  echo "Port $PORT is already serving something; stop it so the suite compares this build." >&2
  exit 1
fi
docker info >/dev/null 2>&1 || {
  echo "Docker is not running." >&2
  exit 1
}

export JANUS_ENABLE_HTTPS_UPGRADE=false NEXT_TELEMETRY_DISABLED=1
if [ "${VISUAL_REUSE_BUILD:-0}" != 1 ]; then
  pnpm --filter @janus/web build
fi

# Started from apps/web without a package-manager wrapper, so $SERVER is the server itself.
(cd apps/web && exec ./node_modules/.bin/next start --hostname 127.0.0.1 --port "$PORT") &
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null || true' EXIT INT TERM

ready=0
for _ in $(seq 1 120); do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then
    ready=1
    break
  fi
  kill -0 "$SERVER" 2>/dev/null || break
  sleep 0.5
done
if [ "$ready" != 1 ]; then
  echo "The production server did not start on port $PORT." >&2
  exit 1
fi

# The suite's packages are plain JavaScript, so the container uses this checkout's node_modules
# and its own browsers; nothing is installed or built inside it.
docker run --rm --init --ipc=host --platform linux/amd64 \
  -v "$PWD":/work -w /work \
  -e PLAYWRIGHT_VISUAL_BASE_URL="http://host.docker.internal:$PORT" \
  "$IMAGE" \
  node node_modules/@playwright/test/cli.js test --config=playwright.visual.config.ts "$@"
