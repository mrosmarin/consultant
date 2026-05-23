FROM mcr.microsoft.com/devcontainers/javascript-node:4-24-trixie

# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends libnspr4 libnss3 libatk1.0-0t64 \
    libatk-bridge2.0-0t64 libdbus-1-3 libcups2t64 libxkbcommon0 libasound2t64 libgbm1 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 ibatspi2.0-0t64 bubblewrap socat pipx \
    chromium-driver ffmpeg python3.13-venv  python3 python3-pip

RUN apt-get -y upgrade
# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"
