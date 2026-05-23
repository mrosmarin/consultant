#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# claude-audit.sh
# Analyzes Claude Code permission friction and suggests
# settings.json improvements.
#
# Usage:
#   bash claude-audit.sh                  # audit current project
#   bash claude-audit.sh --global         # audit global settings
#   bash claude-audit.sh --days 7         # last 7 days of transcripts
#   bash claude-audit.sh --verbose        # show all raw matches
# ─────────────────────────────────────────────────────────────

DAYS=30
VERBOSE=false
SCOPE="project"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --global)  SCOPE="global"; shift ;;
    --days)    DAYS="$2"; shift 2 ;;
    --verbose) VERBOSE=true; shift ;;
    -h|--help)
      echo "Usage: claude-audit.sh [--global] [--days N] [--verbose]"
      exit 0
      ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

header() { echo -e "\n${BOLD}${CYAN}═══ $1 ═══${NC}\n"; }
warn()   { echo -e "${YELLOW}⚠  $1${NC}"; }
good()   { echo -e "${GREEN}✓  $1${NC}"; }
bad()    { echo -e "${RED}✗  $1${NC}"; }
dim()    { echo -e "${DIM}$1${NC}"; }

# ─── Locate settings files ──────────────────────────────────

GLOBAL_SETTINGS="$HOME/.claude/settings.json"
PROJECT_SETTINGS=".claude/settings.json"
LOCAL_SETTINGS=".claude/settings.local.json"
GLOBAL_CONFIG="$HOME/.claude.json"

header "Settings Files"

for f in "$GLOBAL_SETTINGS" "$PROJECT_SETTINGS" "$LOCAL_SETTINGS" "$GLOBAL_CONFIG"; do
  if [[ -f "$f" ]]; then
    good "$f ($(wc -c < "$f" | tr -d ' ') bytes)"
  else
    dim "   $f (not found)"
  fi
done

# ─── Check for jq ───────────────────────────────────────────

if ! command -v jq &>/dev/null; then
  bad "jq is required but not installed"
  echo "  Install: sudo apt-get install jq"
  exit 1
fi

# ─── Analyze permission rules ───────────────────────────────

header "Permission Rules Summary"

analyze_rules() {
  local file="$1"
  local label="$2"

  if [[ ! -f "$file" ]]; then
    return
  fi

  echo -e "${BOLD}$label${NC} ($file)"

  local allow_count deny_count ask_count
  allow_count=$(jq -r '.permissions.allow // [] | length' "$file" 2>/dev/null || echo 0)
  deny_count=$(jq -r '.permissions.deny // [] | length' "$file" 2>/dev/null || echo 0)
  ask_count=$(jq -r '.permissions.ask // [] | length' "$file" 2>/dev/null || echo 0)

  echo "  allow: $allow_count  deny: $deny_count  ask: $ask_count"
  echo ""
}

analyze_rules "$GLOBAL_SETTINGS" "Global"
analyze_rules "$PROJECT_SETTINGS" "Project"
analyze_rules "$LOCAL_SETTINGS" "Local"

# ─── Find overly specific rules ─────────────────────────────

header "Overly Specific Rules (candidates to consolidate)"

find_specific_rules() {
  local file="$1"
  local label="$2"

  if [[ ! -f "$file" ]]; then
    return
  fi

  # Find Bash rules with absolute paths or very long commands
  local specific_rules
  specific_rules=$(jq -r '.permissions.allow // [] | .[]' "$file" 2>/dev/null | grep -E 'Bash\(.*(\/workspaces\/|\/home\/|\/tmp\/[a-z])' || true)

  if [[ -n "$specific_rules" ]]; then
    warn "$label has path-specific rules that should be wildcards:"
    echo "$specific_rules" | while read -r rule; do
      echo -e "  ${RED}$rule${NC}"
    done
    echo ""
  fi

  # Find rules longer than 80 chars (likely "always allow" one-offs)
  local long_rules
  long_rules=$(jq -r '.permissions.allow // [] | .[]' "$file" 2>/dev/null | awk 'length > 80' || true)

  if [[ -n "$long_rules" ]]; then
    warn "$label has long rules (likely one-off approvals):"
    echo "$long_rules" | while read -r rule; do
      echo -e "  ${RED}${rule:0:100}...${NC}"
    done
    echo ""
  fi
}

find_specific_rules "$GLOBAL_SETTINGS" "Global"
find_specific_rules "$PROJECT_SETTINGS" "Project"
find_specific_rules "$LOCAL_SETTINGS" "Local"

# ─── Check ~/.claude.json for accumulated per-project allows ─

header "Per-Project Accumulated Allows (from ~/.claude.json)"

if [[ -f "$GLOBAL_CONFIG" ]]; then
  # Extract project-specific allowed tools
  project_allows=$(jq -r '
    .projects // {} | to_entries[] |
    select(.value.allowedTools // [] | length > 0) |
    "\(.key): \(.value.allowedTools | length) rules"
  ' "$GLOBAL_CONFIG" 2>/dev/null || true)

  if [[ -n "$project_allows" ]]; then
    warn "These projects have accumulated 'Always Allow' rules:"
    echo "$project_allows" | while read -r line; do
      echo "  $line"
    done
    echo ""

    # Show the actual tools for current project
    PROJECT_DIR=$(pwd)
    current_project_tools=$(jq -r --arg dir "$PROJECT_DIR" '
      .projects[$dir].allowedTools // [] | .[]
    ' "$GLOBAL_CONFIG" 2>/dev/null || true)

    if [[ -n "$current_project_tools" ]]; then
      echo -e "${BOLD}Current project accumulated allows:${NC}"
      echo "$current_project_tools" | sort | while read -r tool; do
        echo "  $tool"
      done
      echo ""

      # Suggest consolidation
      echo -e "${BOLD}Suggested consolidations:${NC}"

      # Group by command prefix
      echo "$current_project_tools" | grep '^Bash(' | sed 's/Bash(\(.*\))/\1/' | while read -r cmd; do
        prefix=$(echo "$cmd" | awk '{print $1}')
        echo "  $prefix"
      done | sort | uniq -c | sort -rn | while read -r count prefix; do
        if [[ "$count" -gt 1 ]]; then
          echo -e "  ${GREEN}Bash($prefix *) ${DIM}← would replace $count specific rules${NC}"
        fi
      done
      echo ""
    fi
  else
    good "No accumulated per-project allows found"
  fi
else
  dim "  ~/.claude.json not found"
fi

# ─── Analyze transcripts for permission friction ─────────────

header "Transcript Analysis (last ${DAYS} days)"

TRANSCRIPT_DIR="$HOME/.claude/projects"

if [[ ! -d "$TRANSCRIPT_DIR" ]]; then
  dim "  No transcript directory found at $TRANSCRIPT_DIR"
else
  # Find recent transcript files
  TRANSCRIPT_FILES=$(find "$TRANSCRIPT_DIR" -name "*.jsonl" -mtime -"$DAYS" 2>/dev/null || true)
  FILE_COUNT=$(echo "$TRANSCRIPT_FILES" | grep -c '.' 2>/dev/null || echo 0)

  if [[ "$FILE_COUNT" -eq 0 ]]; then
    dim "  No transcripts found in the last $DAYS days"
  else
    echo "  Found $FILE_COUNT transcript files"
    echo ""

    # Look for permission prompts in transcripts
    echo -e "${BOLD}Tools that triggered permission prompts:${NC}"

    PROMPTED_TOOLS=$(echo "$TRANSCRIPT_FILES" | xargs grep -h '"permission"' 2>/dev/null | \
      jq -r 'select(.type == "tool_use" or .tool_name != null) | .tool_name // .name // empty' 2>/dev/null | \
      sort | uniq -c | sort -rn || true)

    if [[ -n "$PROMPTED_TOOLS" ]]; then
      echo "$PROMPTED_TOOLS" | head -20 | while read -r count tool; do
        echo -e "  ${YELLOW}$tool${NC} (prompted $count times)"
      done
    else
      # Fallback: look for any tool mentions alongside permission/ask patterns
      TOOL_MENTIONS=$(echo "$TRANSCRIPT_FILES" | xargs grep -h 'tool_name\|permission\|approved\|denied' 2>/dev/null | \
        jq -r '.tool_name // empty' 2>/dev/null | \
        sort | uniq -c | sort -rn | head -20 || true)

      if [[ -n "$TOOL_MENTIONS" ]]; then
        echo "$TOOL_MENTIONS" | while read -r count tool; do
          echo "  $tool ($count uses)"
        done
      else
        dim "  Could not parse permission events from transcripts"
        dim "  (transcript format may vary by version)"
      fi
    fi
    echo ""
  fi
fi

# ─── Redundancy check ───────────────────────────────────────

header "Redundancy Check"

if [[ -f "$GLOBAL_SETTINGS" && -f "$PROJECT_SETTINGS" ]]; then
  global_allows=$(jq -r '.permissions.allow // [] | .[]' "$GLOBAL_SETTINGS" 2>/dev/null | sort)
  project_allows=$(jq -r '.permissions.allow // [] | .[]' "$PROJECT_SETTINGS" 2>/dev/null | sort)

  redundant=$(comm -12 <(echo "$global_allows") <(echo "$project_allows") 2>/dev/null || true)

  if [[ -n "$redundant" ]]; then
    warn "These project rules are redundant (already in global):"
    echo "$redundant" | while read -r rule; do
      echo -e "  ${DIM}$rule${NC}"
    done
  else
    good "No redundant rules between global and project"
  fi

  # Check deny redundancy
  global_denies=$(jq -r '.permissions.deny // [] | .[]' "$GLOBAL_SETTINGS" 2>/dev/null | sort)
  project_denies=$(jq -r '.permissions.deny // [] | .[]' "$PROJECT_SETTINGS" 2>/dev/null | sort)

  redundant_denies=$(comm -12 <(echo "$global_denies") <(echo "$project_denies") 2>/dev/null || true)

  if [[ -n "$redundant_denies" ]]; then
    warn "These project deny rules are redundant (already in global):"
    echo "$redundant_denies" | while read -r rule; do
      echo -e "  ${DIM}$rule${NC}"
    done
  else
    good "No redundant deny rules"
  fi
else
  dim "  Need both global and project settings to check redundancy"
fi

# ─── Wildcard coverage check ────────────────────────────────

header "Wildcard Coverage"

if [[ -f "$GLOBAL_SETTINGS" ]]; then
  # Check if broad wildcards already cover specific rules
  has_git_wildcard=$(jq -r '.permissions.allow // [] | .[]' "$GLOBAL_SETTINGS" 2>/dev/null | grep -c '^Bash(git \*)$' || echo 0)
  has_npm_wildcard=$(jq -r '.permissions.allow // [] | .[]' "$GLOBAL_SETTINGS" 2>/dev/null | grep -c '^Bash(npm \*)$' || echo 0)
  has_npx_wildcard=$(jq -r '.permissions.allow // [] | .[]' "$GLOBAL_SETTINGS" 2>/dev/null | grep -c '^Bash(npx \*)$' || echo 0)
  has_mcp_wildcard=$(jq -r '.permissions.allow // [] | .[]' "$GLOBAL_SETTINGS" 2>/dev/null | grep -c '^mcp__\*$' || echo 0)

  [[ "$has_git_wildcard" -gt 0 ]] && good "Bash(git *) covers all git commands" || warn "No git wildcard — specific git rules may accumulate"
  [[ "$has_npm_wildcard" -gt 0 ]] && good "Bash(npm *) covers all npm commands" || warn "No npm wildcard"
  [[ "$has_npx_wildcard" -gt 0 ]] && good "Bash(npx *) covers all npx commands" || warn "No npx wildcard"
  [[ "$has_mcp_wildcard" -gt 0 ]] && good "mcp__* covers all MCP tools" || warn "No MCP wildcard — individual MCP rules may accumulate"
fi

# ─── Security check ─────────────────────────────────────────

header "Security Check"

check_security() {
  local file="$1"
  local label="$2"

  if [[ ! -f "$file" ]]; then
    return
  fi

  echo -e "${BOLD}$label:${NC}"

  # Check for dangerous allows
  local dangerous
  dangerous=$(jq -r '.permissions.allow // [] | .[]' "$file" 2>/dev/null | grep -iE 'rm -rf|sudo|chmod 777|eval|> /dev' || true)
  if [[ -n "$dangerous" ]]; then
    bad "Dangerous allow rules found:"
    echo "$dangerous" | while read -r rule; do
      echo -e "    ${RED}$rule${NC}"
    done
  else
    good "No dangerous allow rules"
  fi

  # Check for env/secret protection
  local has_env_deny
  has_env_deny=$(jq -r '.permissions.deny // [] | .[]' "$file" 2>/dev/null | grep -c '\.env' || echo 0)
  [[ "$has_env_deny" -gt 0 ]] && good ".env files protected in deny rules" || warn "No .env deny rules"

  local has_ssh_deny
  has_ssh_deny=$(jq -r '.permissions.deny // [] | .[]' "$file" 2>/dev/null | grep -c 'ssh' || echo 0)
  [[ "$has_ssh_deny" -gt 0 ]] && good "SSH keys protected in deny rules" || warn "No SSH deny rules"

  echo ""
}

check_security "$GLOBAL_SETTINGS" "Global"
check_security "$PROJECT_SETTINGS" "Project"

# ─── Summary ─────────────────────────────────────────────────

header "Recommendations"

echo "1. Run this script periodically to catch rule drift"
echo "2. After a coding session, check ~/.claude.json for new"
echo "   'Always Allow' entries and promote useful ones to settings.json"
echo "3. Use --verbose to see raw transcript matches"
echo "4. Clean up ~/.claude.json accumulated rules with:"
echo -e "   ${DIM}jq '.projects[].allowedTools = []' ~/.claude.json > /tmp/clean.json && mv /tmp/clean.json ~/.claude.json${NC}"
echo ""