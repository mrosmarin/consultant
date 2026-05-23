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
cat > ~/.claude/settings.json << 'EOF'
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "defaultMode": "acceptEdits",
  "permissions": {
    "allow": [
      "mcp__*",
      "Bash(find *)",
      "Bash(pwd)",
      "Bash(awk *)",
      "Bash(env)",
      "Bash(ls *)",
      "Bash(cat *)",
      "Bash(grep *)",
      "Bash(echo *)",
      "Bash(wc *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(sort *)",
      "Bash(uniq *)",
      "Bash(diff *)",
      "Bash(which *)",
      "Bash(git *)",
      "Bash(gh *)",
      "Bash(npx *)",
      "Bash(pnpm *)",
      "Bash(npm *)",
      "Bash(node *)",
      "Bash(python3 *)",
      "Bash(deno *)",
      "Bash(make *)",
      "Bash(curl *)",
      "Bash(timeout *)",
      "Bash(pkill -f *)",
      "Bash(*supabase *)",
      "Bash(*playwright *)",
      "Bash(*prisma *)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(rm -r *)",
      "Bash(sudo *)",
      "Bash(git push --force*)",
      "Bash(git reset --hard*)",
      "Bash(git clean -fd*)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(~/.ssh/**)",
      "Read(/root/.ssh/**)",
      "Read(~/.aws/credentials)",
      "Read(~/.config/gcloud/**)",
      "Read(~/.azure/**)"
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
EOF
 
echo "✓ Claude Code global settings written to ~/.claude/settings.json"


