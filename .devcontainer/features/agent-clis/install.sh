#!/usr/bin/env bash
# Installs AI coding agent CLIs into the dev container.
#
# Runs as root during the image build. Per-user installers (curl | bash) are
# executed as the remote (non-root) user via run_as_user so their artifacts
# land in the user's home and on a shared, user-writable npm prefix — instead
# of root's home, which would be invisible at runtime.
set -euo pipefail

USERNAME="${_REMOTE_USER:-node}"
USER_HOME="${_REMOTE_USER_HOME:-/home/${USERNAME}}"
NPM_PREFIX="/usr/local/share/npm-global"

# Ensure the build prerequisites exist (the node base image already has these,
# but a Feature should not assume its base).
if ! command -v curl >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y --no-install-recommends curl ca-certificates
  rm -rf /var/lib/apt/lists/*
fi

# Shared npm global prefix the remote user can write to without sudo.
mkdir -p "${NPM_PREFIX}/bin"
chown -R "${USERNAME}:${USERNAME}" "${NPM_PREFIX}"

# Run a command as the remote user with a sane PATH/npm prefix.
run_as_user() {
  su - "${USERNAME}" -c \
    "export NPM_CONFIG_PREFIX='${NPM_PREFIX}' PATH=\"${NPM_PREFIX}/bin:${USER_HOME}/.local/bin:\$PATH\"; $1"
}

is_enabled() { [ "${1:-false}" = "true" ]; }

if is_enabled "${OPENCODE:-true}"; then
  echo "==> Installing OpenCode"
  run_as_user 'curl -fsSL https://opencode.ai/install | bash'
fi

if is_enabled "${CLAUDE:-true}"; then
  echo "==> Installing Claude Code"
  run_as_user 'curl -fsSL https://claude.ai/install.sh | bash'
fi

if is_enabled "${COPILOT:-true}"; then
  echo "==> Installing GitHub Copilot CLI"
  run_as_user 'npm install -g @github/copilot'
fi

if is_enabled "${CURSOR:-true}"; then
  echo "==> Installing Cursor CLI"
  run_as_user 'curl https://cursor.com/install -fsS | bash'
fi

if is_enabled "${CODEX:-true}"; then
  echo "==> Installing Codex"
  run_as_user "curl -fsSL https://chatgpt.com/codex/install.sh | CODEX_NON_INTERACTIVE=1 CODEX_INSTALL_DIR='${NPM_PREFIX}/bin' sh"
fi

echo "==> AI coding agent CLIs installed."
