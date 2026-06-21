#!/usr/bin/env bash
# Installs the t3 CLI into the dev container.
#
# Runs as root during the image build. The npm install runs as the remote
# (non-root) user against a shared, user-writable npm prefix so the binary is
# visible at runtime instead of landing in root's home.
set -euo pipefail

USERNAME="${_REMOTE_USER:-node}"
USER_HOME="${_REMOTE_USER_HOME:-/home/${USERNAME}}"
NPM_PREFIX="/usr/local/share/npm-global"
T3_VERSION="${VERSION:-latest}"

# Shared npm global prefix the remote user can write to without sudo.
mkdir -p "${NPM_PREFIX}/bin"
chown -R "${USERNAME}:${USERNAME}" "${NPM_PREFIX}"

echo "==> Installing t3@${T3_VERSION}"
su - "${USERNAME}" -c \
  "export NPM_CONFIG_PREFIX='${NPM_PREFIX}' PATH=\"${NPM_PREFIX}/bin:${USER_HOME}/.local/bin:\$PATH\"; npm install -g 't3@${T3_VERSION}'"

echo "==> t3 installed."
