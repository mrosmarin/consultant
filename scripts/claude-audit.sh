#!/usr/bin/env bash
set -uo pipefail
# claude-audit.sh — Diagnose Claude Code permission prompts.
#
# The key insight: Claude Code records EVERY tool call, but a permission
# PROMPT is a distinct event — a tool_result whose text says permission
# wasn't granted. This script matches those denial results back to the
# command that triggered them, so it reports the commands that ACTUALLY
# prompted you, not just everything Claude ran.
#
# Usage: bash claude-audit.sh [--days N] [--verbose]

DAYS=30; VERBOSE=false; FIX=false; ASSUME_YES=false; FIX_ALL=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --days) DAYS="$2"; shift 2 ;;
    --verbose|-v) VERBOSE=true; shift ;;
    --fix) FIX=true; shift ;;
    --fix-all) FIX=true; FIX_ALL=true; shift ;;
    --yes|-y) ASSUME_YES=true; shift ;;
    --global) shift ;;
    -h|--help) echo "Usage: claude-audit.sh [--days N] [--verbose] [--fix|--fix-all] [--yes]"; exit 0 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

# Scratch files: commands the audit decides should be allowed.
#   SUGGEST_FILE      — commands that ACTUALLY prompted (high confidence)
#   SUGGEST_GAPS_FILE — common commands not yet allowed (speculative)
SUGGEST_FILE="$(mktemp)"
SUGGEST_GAPS_FILE="$(mktemp)"
trap 'rm -f "$SUGGEST_FILE" "$SUGGEST_GAPS_FILE"' EXIT

R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' C='\033[0;36m' D='\033[2m' B='\033[1m' N='\033[0m'
hdr() { echo -e "\n${B}${C}=== $1 ===${N}\n"; }

GS="$HOME/.claude/settings.json"; PS=".claude/settings.json"; LS=".claude/settings.local.json"
GC="$HOME/.claude.json"

hdr "Settings Files"
for f in "$GS" "$PS" "$LS" "$GC"; do
  [[ -f "$f" ]] && echo -e "${G}✓${N} $f ($(wc -c < "$f" | tr -d ' ')B)" || echo -e "${D}  $f (not found)${N}"
done

command -v jq &>/dev/null || { echo -e "${R}✗ jq required${N}"; exit 1; }

hdr "Permission Rules"
for p in "$GS:Global" "$PS:Project" "$LS:Local"; do
  f="${p%%:*}"; l="${p#*:}"; [[ ! -f "$f" ]] && continue
  a=$(jq -r '.permissions.allow // [] | length' "$f" 2>/dev/null || echo 0)
  d=$(jq -r '.permissions.deny // [] | length' "$f" 2>/dev/null || echo 0)
  echo -e "${B}$l${N}: allow=$a deny=$d"
done

# ─── The real diagnostic: commands that ACTUALLY prompted ──────────────

hdr "Commands That Actually Prompted You (last ${DAYS} days)"

TRANSCRIPT_DIR="$HOME/.claude/projects"

if [[ ! -d "$TRANSCRIPT_DIR" ]]; then
  echo -e "${D}  No transcript directory at $TRANSCRIPT_DIR${N}"
else
  FILES=$(find "$TRANSCRIPT_DIR" -name "*.jsonl" -mtime -"$DAYS" 2>/dev/null || true)
  NFILES=$(echo "$FILES" | grep -c '.' 2>/dev/null || echo 0)

  if [[ "$NFILES" -eq 0 ]]; then
    echo -e "${D}  No transcripts in the last $DAYS days${N}"
  else
    echo -e "  Scanning ${B}$NFILES${N} transcript files..."

    # Two-pass matcher in python:
    #   pass 1 — map tool_use_id -> bash command (handles nested content[])
    #   pass 2 — find tool_result blocks that look like permission denials,
    #            look up their tool_use_id, report those commands.
    echo "$FILES" | tr '\n' '\0' | xargs -0 cat 2>/dev/null | VERBOSE="$VERBOSE" SUGGEST_FILE="$SUGGEST_FILE" python3 -c '
import sys, os, json, re
from collections import Counter

DENIAL_PAT = re.compile(
    r"(permission to use|requested permissions|haven.?t granted|"
    r"not allowed to|user (?:doesn.?t want|declined|rejected|denied)|"
    r"permission denied|requires approval|tool use was rejected)",
    re.IGNORECASE,
)

id_to_cmd = {}
denied_ids = []
all_cmds = []

def first_word(cmd):
    # Normalize to the real program name, skipping shell noise:
    #   "(test -f x)"      -> test
    #   "# a comment"      -> (skipped)
    #   "FOO=bar mycmd"    -> mycmd   (leading VAR=val assignments)
    #   "sudo apt install" -> apt     (sudo wrapper)
    #   "cd x && grep y"   -> cd      (first real command)
    s = cmd.strip()
    if not s or s.startswith("#"):
        return ""
    # strip leading subshell / grouping / negation punctuation
    s = s.lstrip("({!;&|`$ \t")
    tok = s.split()
    if not tok:
        return ""
    # skip leading VAR=value environment assignments
    i = 0
    while i < len(tok) and re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", tok[i]):
        i += 1
    # skip a sudo wrapper (and its flags) to report the real command
    if i < len(tok) and os.path.basename(tok[i]) == "sudo":
        i += 1
        while i < len(tok) and tok[i].startswith("-"):
            i += 1
    if i >= len(tok):
        return ""
    word = os.path.basename(tok[i])
    # drop anything that is not a plausible command name
    if not re.match(r"^[A-Za-z0-9_.-]+$", word):
        return ""
    return word

def harvest_tool_use(obj):
    if isinstance(obj, dict) and obj.get("type") == "tool_use":
        if obj.get("name", "") in ("Bash", "bash", ""):
            inp = obj.get("input") or {}
            if isinstance(inp, dict):
                cmd = inp.get("command") or inp.get("cmd")
                if cmd:
                    tid = obj.get("id") or obj.get("tool_use_id")
                    if tid:
                        id_to_cmd[tid] = cmd
                    all_cmds.append(cmd)

def harvest_denial(obj):
    if isinstance(obj, dict) and obj.get("type") == "tool_result":
        tid = obj.get("tool_use_id") or obj.get("id")
        content = obj.get("content", "")
        if isinstance(content, str):
            text = content
        elif isinstance(content, list):
            text = " ".join(c.get("text", "") for c in content if isinstance(c, dict))
        else:
            text = ""
        if tid and DENIAL_PAT.search(text):
            denied_ids.append(tid)

def walk(obj, fn):
    fn(obj)
    if isinstance(obj, dict):
        for v in obj.values():
            walk(v, fn)
    elif isinstance(obj, list):
        for v in obj:
            walk(v, fn)

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        obj = json.loads(line)
    except Exception:
        continue
    walk(obj, harvest_tool_use)
    walk(obj, harvest_denial)

prompted = Counter()
unmatched = 0
for tid in denied_ids:
    cmd = id_to_cmd.get(tid)
    if cmd:
        w = first_word(cmd)
        if w:
            prompted[w] += 1
        else:
            unmatched += 1
    else:
        unmatched += 1

YEL = "\033[1;33m"; GRN = "\033[0;32m"; DIM = "\033[2m"; BLD = "\033[1m"; NC = "\033[0m"

if prompted:
    print()
    print(f"{BLD}These commands triggered approval prompts (add to allow list):{NC}")
    for cmd, n in prompted.most_common(30):
        print(f"  {YEL}{n:4d}  {cmd}{NC}")
    if unmatched:
        print(f"  {DIM}({unmatched} denial events could not be matched to a command){NC}")
    # Record bare command names for the --fix step
    sf = os.environ.get("SUGGEST_FILE")
    if sf:
        with open(sf, "a") as out:
            for cmd, n in prompted.most_common(30):
                out.write(cmd + "\n")
elif denied_ids:
    print()
    print(f"  {DIM}{len(denied_ids)} denial events found but none matched a Bash command")
    print(f"  (they may be Edit/Write/other tools){NC}")
else:
    print()
    print(f"  {GRN}No permission-denial events found in transcripts.{NC}")
    print(f"  {DIM}Either nothing prompted, or this CC version logs prompts differently.{NC}")

if os.environ.get("VERBOSE") == "true" and all_cmds:
    print()
    print(f"{BLD}All bash commands run (context, approved or not):{NC}")
    ctr = Counter(first_word(c) for c in all_cmds if first_word(c))
    for cmd, n in ctr.most_common(30):
        print(f"  {n:4d}  {cmd}")
' 2>/dev/null || echo -e "${D}  (parser error — run with --verbose)${N}"
  fi
fi

# ─── Coverage check ────────────────────────────────────────────────────

hdr "Allow-List Coverage"

if [[ -f "$GS" || -f "$PS" ]]; then
  ALL_ALLOW=$( { [[ -f "$GS" ]] && jq -r '.permissions.allow // [] | .[]' "$GS" 2>/dev/null; \
                 [[ -f "$PS" ]] && jq -r '.permissions.allow // [] | .[]' "$PS" 2>/dev/null; } | sort -u )

  if echo "$ALL_ALLOW" | grep -qE '^Bash\(\*\)$'; then
    echo -e "${G}✓ Bash(*) catch-all present — no bash command will prompt${N}"
  else
    echo -e "${D}Checking common dev commands against your allow rules...${N}"
    echo ""
    COMMON="cd mkdir cp mv touch rm chmod ln test cat ls echo printf sed awk grep cut tr tee xargs find sort uniq wc head tail diff which pwd export source env git gh npm npx pnpm yarn node deno python3 pip uv pytest ruff mypy go cargo make docker kubectl helm jq yq curl wget bd bv claude"
    MISSING=""
    for cmd in $COMMON; do
      if ! echo "$ALL_ALLOW" | grep -qE "^Bash\(($cmd |$cmd\)|\*$cmd )"; then
        MISSING="$MISSING $cmd"
      fi
    done
    if [[ -n "$MISSING" ]]; then
      echo -e "${Y}⚠ Common commands NOT in allow list (will prompt):${N}"
      echo "$MISSING" | fold -s -w 66 | sed 's/^/   /'
      # Record gaps for the --fix-all step (one per line)
      for c in $MISSING; do echo "$c" >> "$SUGGEST_GAPS_FILE"; done
    else
      echo -e "${G}✓ All common commands covered${N}"
    fi
  fi
fi

# ─── Overly specific ───────────────────────────────────────────────────

hdr "Overly Specific Rules"
FOUND_SPECIFIC=false
for p in "$GS:Global" "$PS:Project"; do
  f="${p%%:*}"; l="${p#*:}"; [[ ! -f "$f" ]] && continue
  while IFS= read -r r; do
    [[ -n "$r" ]] && { echo -e "  ${Y}⚠ ${l}: ${R}$r${N}"; FOUND_SPECIFIC=true; }
  done < <(jq -r '.permissions.allow // [] | .[]' "$f" 2>/dev/null | grep -E 'Bash\(.*(\/workspaces\/|\/home\/)' || true)
done
[[ "$FOUND_SPECIFIC" == false ]] && echo -e "${G}✓ None${N}"

# ─── Redundancy ────────────────────────────────────────────────────────

if [[ -f "$GS" && -f "$PS" ]]; then
  hdr "Redundancy"
  ga=$(jq -r '.permissions.allow // [] | .[]' "$GS" 2>/dev/null | sort)
  pa=$(jq -r '.permissions.allow // [] | .[]' "$PS" 2>/dev/null | sort)
  dup=$(comm -12 <(echo "$ga") <(echo "$pa") 2>/dev/null || true)
  if [[ -n "$dup" ]]; then
    echo -e "${Y}⚠ Project rules already in global:${N}"
    echo "$dup" | while read -r r; do echo -e "  ${D}$r${N}"; done
  else
    echo -e "${G}✓ No redundant rules${N}"
  fi
fi

# ─── Accumulated approvals ─────────────────────────────────────────────

hdr "Accumulated 'Always Allow' (~/.claude.json)"
if [[ -f "$GC" ]]; then
  PROJ_DIR=$(pwd)
  TOOLS=$(jq -r --arg d "$PROJ_DIR" '.projects[$d].allowedTools // [] | .[]' "$GC" 2>/dev/null || true)
  if [[ -n "$TOOLS" ]]; then
    echo -e "${B}This project accumulated these one-off approvals:${N}"
    echo "$TOOLS" | sort | while read -r t; do echo "  $t"; done
    echo ""
    echo -e "${D}Promote useful ones into .claude/settings.json, then clear with:${N}"
    echo -e "${D}  make claude-clear-approvals${N}"
  else
    echo -e "${G}✓ No accumulated per-project approvals${N}"
  fi
else
  echo -e "${D}  ~/.claude.json not found${N}"
fi

# ─── Security ──────────────────────────────────────────────────────────

hdr "Security"
for p in "$GS:Global" "$PS:Project"; do
  f="${p%%:*}"; l="${p#*:}"; [[ ! -f "$f" ]] && continue
  bad=$(jq -r '.permissions.allow // [] | .[]' "$f" 2>/dev/null | grep -iE 'rm -rf /|sudo rm|chmod 777|:\(\)' || true)
  if [[ -n "$bad" ]]; then
    echo -e "${R}✗ ${l} risky allows:${N}"
    echo "$bad" | while read -r r; do echo -e "  ${R}$r${N}"; done
  else
    echo -e "${G}✓ ${l} no risky allows${N}"
  fi
done

hdr "How to Read This"
echo "• 'Commands That Actually Prompted You' matches permission-denial"
echo "  events back to the triggering command — the real signal."
echo "• 'Allow-List Coverage' shows which common commands WOULD prompt."
echo "• Run with --fix to add the flagged commands to your allow list"
echo "  (updates live settings AND postinstall.sh for future rebuilds)."
echo "• Run with --verbose to also see every command Claude ran."

# ─── Fix mode: add flagged commands to the allow list ──────────────────

# Build a clean, deduped candidate list.
#   default --fix     → only commands that actually prompted (SUGGEST_FILE)
#   --fix-all         → also include speculative coverage gaps
CANDIDATE_SRC="$SUGGEST_FILE"
if [[ "$FIX_ALL" == true ]]; then
  cat "$SUGGEST_GAPS_FILE" >> "$SUGGEST_FILE" 2>/dev/null || true
fi
CANDIDATES=""
if [[ -s "$SUGGEST_FILE" ]]; then
  CANDIDATES=$(sort -u "$SUGGEST_FILE" | grep -vE '^\s*$' || true)
fi

# Drop anything already covered by an allow rule, and anything that is
# explicitly denied (never auto-allow a denied command).
NEW_CMDS=""
if [[ -n "$CANDIDATES" ]]; then
  EXISTING_ALLOW=$( { [[ -f "$GS" ]] && jq -r '.permissions.allow // [] | .[]' "$GS" 2>/dev/null; \
                      [[ -f "$PS" ]] && jq -r '.permissions.allow // [] | .[]' "$PS" 2>/dev/null; } | sort -u )
  DENY_WORDS=$( [[ -f "$GS" ]] && jq -r '.permissions.deny // [] | .[]' "$GS" 2>/dev/null | grep -oE 'Bash\([a-z-]+' | sed 's/Bash(//' | sort -u )
  for cmd in $CANDIDATES; do
    # already allowed? (exact "Bash(cmd *)" or "Bash(cmd)")
    if echo "$EXISTING_ALLOW" | grep -qE "^Bash\(${cmd} \*?\)$|^Bash\(${cmd}\)$|^Bash\(${cmd} \)$"; then
      continue
    fi
    # explicitly denied as a bare command? skip for safety
    if echo "$DENY_WORDS" | grep -qx "$cmd"; then
      continue
    fi
    NEW_CMDS="$NEW_CMDS $cmd"
  done
fi
# trim
NEW_CMDS=$(echo "$NEW_CMDS" | xargs 2>/dev/null || true)

if [[ "$FIX" == true ]]; then
  if [[ "$FIX_ALL" == true ]]; then
    hdr "Fix (all) — Add Prompt Drivers + Coverage Gaps"
  else
    hdr "Fix — Add Commands That Actually Prompted You"
  fi

  if [[ -z "$NEW_CMDS" ]]; then
    echo -e "${G}✓ Nothing to add — every flagged command is already allowed.${N}"
    exit 0
  fi

  echo -e "${B}Proposed additions to the allow list:${N}"
  for c in $NEW_CMDS; do echo -e "  ${G}+ Bash(${c} *)${N}"; done
  echo ""
  echo -e "${D}This updates BOTH:${N}"
  echo -e "${D}  • ~/.claude/settings.json   (takes effect on next Claude Code restart)${N}"
  echo -e "${D}  • .devcontainer/post-install.sh  (so it survives container rebuilds)${N}"
  echo ""

  if [[ "$ASSUME_YES" != true ]]; then
    printf "${B}Apply these additions? [y/N]:${N} "
    read -r REPLY < /dev/tty || REPLY="n"
    case "$REPLY" in
      [yY]*) ;;
      *) echo "Skipped. No changes made."; exit 0 ;;
    esac
  fi

  # ── 1. Update live ~/.claude/settings.json ──
  if [[ -f "$GS" ]]; then
    NEW_JSON=$(printf '%s\n' "$NEW_CMDS" | tr ' ' '\n' | grep -v '^$' | \
      jq -R '"Bash(\(.) *)"' | jq -s '.' )
    tmp=$(mktemp)
    jq --argjson add "$NEW_JSON" \
       '.permissions.allow = ((.permissions.allow // []) + $add | unique)' \
       "$GS" > "$tmp" && mv "$tmp" "$GS"
    echo -e "${G}✓ Updated ~/.claude/settings.json${N}"
  else
    echo -e "${Y}⚠ ~/.claude/settings.json not found — skipped live update${N}"
  fi

  # ── 2. Update postinstall.sh allow block ──
  PI=".devcontainer/post-install.sh"
  if [[ -f "$PI" ]]; then
    NEW_CMDS="$NEW_CMDS" python3 - "$PI" << 'PYFIX'
import sys, os, re, json

path = sys.argv[1]
new_cmds = os.environ["NEW_CMDS"].split()

with open(path) as f:
    content = f.read()

# Extract the SETTINGS heredoc JSON
m = re.search(r"(cat > ~/\.claude/settings\.json << 'SETTINGS'\n)(.*?)(\nSETTINGS)", content, re.DOTALL)
if not m:
    print("  (could not locate settings block in postinstall.sh — skipped)")
    sys.exit(0)

head, body, tail = m.group(1), m.group(2), m.group(3)
cfg = json.loads(body)
allow = cfg.setdefault("permissions", {}).setdefault("allow", [])
existing = set(allow)
added = []
for c in new_cmds:
    rule = f"Bash({c} *)"
    if rule not in existing:
        allow.append(rule)
        existing.add(rule)
        added.append(rule)

# Pretty-print with 2-space indent to match the file style
new_body = json.dumps(cfg, indent=2)
content = content[:m.start()] + head + new_body + tail + content[m.end():]

with open(path, "w") as f:
    f.write(content)

print(f"  Added {len(added)} rule(s) to postinstall.sh")
PYFIX
    echo -e "${G}✓ Updated .devcontainer/post-install.sh${N}"
    echo ""
    echo -e "${D}Commit the postinstall.sh change so teammates/rebuilds get it:${N}"
    echo -e "${D}  git add .devcontainer/post-install.sh && git commit -m 'chore: allow audited commands'${N}"
  else
    echo -e "${Y}⚠ .devcontainer/post-install.sh not found — skipped${N}"
  fi

  echo ""
  echo -e "${B}Done.${N} Restart Claude Code for the live settings to take effect."
else
  # Not fixing — nudge based on what we found
  DRIVERS=$(sort -u "$SUGGEST_FILE" 2>/dev/null | grep -vE '^\s*$' | wc -l | tr -d ' ')
  GAPS=$(sort -u "$SUGGEST_GAPS_FILE" 2>/dev/null | grep -vE '^\s*$' | wc -l | tr -d ' ')
  if [[ "${DRIVERS:-0}" -gt 0 ]]; then
    hdr "Suggested Fix Available"
    echo -e "${Y}${DRIVERS} command(s) actually prompted you and aren't allowed yet.${N}"
    echo -e "Run ${B}make claude-fix${N} to add just those to your live settings + postinstall.sh."
    [[ "${GAPS:-0}" -gt 0 ]] && echo -e "${D}(${GAPS} more common commands are uncovered — ${B}make claude-fix-all${D} adds those too.)${N}"
  fi
fi
