ARG BASE_IMAGE=node:24
FROM ${BASE_IMAGE}

ARG TZ=Europe/Madrid
ENV TZ="$TZ"

# Install basic development tools and iptables/ipset
RUN apt-get update && apt-get install -y --no-install-recommends \
  less \
  git \
  procps \
  sudo \
  fzf \
  man-db \
  unzip \
  gnupg2 \
  gh \
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  jq \
  nano \
  vim \
  tree \
  python3-yaml \
  libxml2-utils \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Ensure default node user has access to /usr/local/share
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share

ARG USERNAME=node

# Persist bash history.
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  && mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && chown -R $USERNAME /commandhistory

# Pre-create directories that will be needed for bind mounts
RUN mkdir -p /home/$USERNAME/.config/opencode && chown -R $USERNAME:$USERNAME /home/$USERNAME/.config/opencode
RUN mkdir -p /home/$USERNAME/.local/share/opencode && chown -R $USERNAME:$USERNAME /home/$USERNAME/.local/share/opencode

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true

WORKDIR /workspace

# Configure passwordless sudo for node user
RUN echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/node && \
  chmod 0440 /etc/sudoers.d/node

# Set up non-root user
USER node

# Install global packages
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin

# Set the default editor and visual
ENV EDITOR=vim
ENV VISUAL=vim

# Install OpenCode
RUN curl -fsSL https://opencode.ai/install | bash
