#!/bin/bash
set -x

git config --global --add safe.directory "${containerWorkspaceFolder}"

wget -P /tmp https://go.dev/dl/go1.26.2.linux-amd64.tar.gz
sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf /tmp/go1.26.2.linux-amd64.tar.gz
rm /tmp/go1.26.2.linux-amd64.tar.gz
go version

npm install -g @kilocode/cli

curl -fsSL https://claude.ai/install.sh | bash

# Install dependencies
sudo apt install curl gpg -y

# Add GitHub CLI's official GPG key and repo
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
  sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg

sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] \
  https://cli.github.com/packages stable main" | \
  sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null

# Install
sudo apt update && sudo apt install gh -y

git clone https://github.com/lintingzhen/commitizen-go.git  /tmp/commitizen-go
cd /tmp/commitizen-go
make 
sudo make install

pnpm add turbo --global

sudo chown -R 1000:1000 /home/node/.claude 
# Always (re)write global settings so a stale copy persisted in the
# claude-code-config volume doesn't shadow template updates.
cat > ~/.claude/settings.json << 'SETTINGS'
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "defaultMode": "acceptEdits",
  "permissions": {
    "allow": [
      "mcp__*",
      "Read(**)",
      "Edit(**)",
      "Write(**)",
      "Bash(ls *)",
      "Bash(cat *)",
      "Bash(grep *)",
      "Bash(find *)",
      "Bash(echo *)",
      "Bash(pwd)",
      "Bash(which *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(wc *)",
      "Bash(sort *)",
      "Bash(uniq *)",
      "Bash(diff *)",
      "Bash(cd *)",
      "Bash(mkdir *)",
      "Bash(cp *)",
      "Bash(mv *)",
      "Bash(touch *)",
      "Bash(test *)",
      "Bash(env)",
      "Bash(git *)",
      "Bash(gh *)",
      "Bash(npm *)",
      "Bash(npx *)",
      "Bash(pnpm *)",
      "Bash(yarn *)",
      "Bash(node *)",
      "Bash(python3 *)",
      "Bash(pip *)",
      "Bash(uv *)",
      "Bash(pytest *)",
      "Bash(ruff *)",
      "Bash(mypy *)",
      "Bash(go *)",
      "Bash(cargo *)",
      "Bash(make *)",
      "Bash(jq *)",
      "Bash(sed *)",
      "Bash(awk *)",
      "Bash(curl *)",
      "Bash(bd *)",
      "Bash(bv *)",
      "Bash(chmod *)",
      "Bash(claude *)",
      "Bash(cut *)",
      "Bash(deno *)",
      "Bash(docker *)",
      "Bash(env *)",
      "Bash(export *)",
      "Bash(helm *)",
      "Bash(kubectl *)",
      "Bash(ln *)",
      "Bash(printf *)",
      "Bash(pwd *)",
      "Bash(source *)",
      "Bash(tee *)",
      "Bash(tr *)",
      "Bash(wget *)",
      "Bash(xargs *)",
      "Bash(yq *)"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf /*)",
      "Bash(rm -rf ~)",
      "Bash(rm -rf ~/*)",
      "Bash(rm -rf $HOME*)",
      "Bash(sudo rm*)",
      "Bash(:(){ :|:& };:*)",
      "Bash(mkfs*)",
      "Bash(dd if=* of=/dev/*)",
      "Bash(> /dev/sd*)",
      "Bash(chmod -R 777 /*)",
      "Bash(git push --force*)",
      "Bash(git push -f*)",
      "Bash(git reset --hard*)",
      "Bash(git clean -fd*)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(**/.env)",
      "Read(**/.env.*)",
      "Read(./secrets/**)",
      "Read(**/secrets/**)",
      "Read(~/.ssh/**)",
      "Read(/root/.ssh/**)",
      "Read(~/.aws/credentials)",
      "Read(~/.config/gcloud/**)",
      "Read(~/.azure/**)",
      "Edit(./.env)",
      "Edit(**/.env)",
      "Write(./.env)",
      "Write(**/.env)"
    ]
  },
  "additionalDirectories": [
    "/tmp"
  ],
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "0"
  },
  "theme": "dark",
  "enableAllProjectMcpServers": true
}
SETTINGS
echo "✓ Claude Code global settings written"

echo ""
 
echo "✓ Claude Code global settings written to ~/.claude/settings.json"


