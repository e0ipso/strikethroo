#!/usr/bin/env bash
# Seeds t3 settings once into writable T3CODE_HOME so the server can drift.
set -euo pipefail

t3_home="${T3CODE_HOME:-/home/node/.t3}"
target_path="${t3_home}/userdata/settings.json"
seed_path="/home/node/.cred-seed/t3/settings.json"

mkdir -p "$(dirname "${target_path}")"

if [ ! -f "${target_path}" ] && [ -f "${seed_path}" ]; then
  cp "${seed_path}" "${target_path}"
  chmod 600 "${target_path}"
fi
