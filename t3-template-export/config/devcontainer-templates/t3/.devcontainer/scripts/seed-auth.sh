#!/usr/bin/env bash
# Copies read-only host credential seeds into writable runtime locations.
set -euo pipefail

seed() {
  local source_path="$1"
  local target_path="$2"

  mkdir -p "$(dirname "${target_path}")"
  cp -f "${source_path}" "${target_path}" 2>/dev/null && chmod 600 "${target_path}" || true
}

seed /home/node/.cred-seed/codex/auth.json /home/node/.codex/auth.json
seed /home/node/.cred-seed/claude/.credentials.json /home/node/.claude/.credentials.json
seed /home/node/.cred-seed/cursor/auth.json /home/node/.config/cursor/auth.json
seed /home/node/.cred-seed/opencode/auth.json /home/node/.local/share/opencode/auth.json
