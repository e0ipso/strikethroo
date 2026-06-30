#!/usr/bin/env bash
#
# Host-side launcher: execs `t3 serve` inside this repo's ALREADY-RUNNING
# devcontainer. Start the container any way you like (`devcontainer up`, VS
# Code, ...). The published host port is a literal baked into devcontainer.json
# at scaffold time (127.0.0.1:<port>:34489 — the port is the basename hash,
# frozen by new-devcontainer), so it applies automatically however the container
# starts. You do not need to set anything.
#
#   ./.devcontainer/t3-serve.sh
#
# Connect t3 desktop to the http://127.0.0.1:<port> printed below + the pairing
# token from t3 serve's output.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config="$repo_root/.devcontainer/devcontainer.json"

# Read the published host port straight from the --publish runArg (single source of truth).
host_port="$(node -e '
  const a = require(process.argv[1]).runArgs || [];
  const i = a.indexOf("--publish");
  const m = i >= 0 && /:(\d+):\d+$/.exec(a[i + 1] || "");
  if (!m) { console.error("no --publish host port in devcontainer.json"); process.exit(1); }
  process.stdout.write(m[1]);
' "$config")"

container_port=34489

echo "t3 desktop endpoint: http://127.0.0.1:$host_port  (use the pairing token from the output below)" >&2

devcontainer exec --workspace-folder "$repo_root" \
  t3 serve --host 0.0.0.0 --port "$container_port" --mode web --no-browser
