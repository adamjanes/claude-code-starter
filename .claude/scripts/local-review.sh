#!/usr/bin/env bash
# The pre-PR review (.claude/skills/local-review/SKILL.md): a fresh `claude -p` session reads the branch diff with
# Read/Grep/Glob only and returns a verdict. Usage: pnpm review [--qa]   (--qa: keep the transcript out of .lane/)
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "run this inside the repo" >&2; exit 1; }
cd "$ROOT"
PROMPT_FILE=.claude/skills/local-review/prompt.md

QA=0
case "${1:-}" in
  --qa) QA=1 ;;
  "") ;;
  *) echo "unknown flag: $1 (only --qa)" >&2; exit 1 ;;
esac

command -v claude >/dev/null 2>&1 || { echo "the claude CLI is not on PATH" >&2; exit 1; }
git fetch --quiet origin main 2>/dev/null || echo "warning: could not fetch origin/main; reviewing against the cached copy" >&2
git rev-parse --verify -q origin/main >/dev/null || { echo "no origin/main to diff against: push main to GitHub first" >&2; exit 1; }

R=$(mktemp -d)   # one dir per run, so concurrent lanes never share a path
echo "review dir: $R"
git status --porcelain --untracked-files=all > "$R/before.txt"
git diff origin/main...HEAD --name-only > "$R/files.txt"
git diff origin/main...HEAD > "$R/branch.patch"
[ -s "$R/files.txt" ] || { echo "no committed changes against origin/main: commit first, the reviewer sees only commits" >&2; exit 1; }

{
  printf '%s\n' \
    "Your working directory is a checkout of this repository. You have ONLY the Read, Grep and Glob" \
    "tools: no shell and no git. Review ONLY these changes:" "" \
    "- changed files: $R/files.txt" \
    "- full diff:     $R/branch.patch" ""
  cat "$PROMPT_FILE"
} > "$R/prompt.txt"

if [ "${LOCAL_REVIEW_DRY_RUN:-0}" = "1" ]; then
  echo "dry run: prompt written to $R/prompt.txt"
  exit 0
fi

# --tools is what makes it read-only: --allowedTools only skips prompts, it restricts nothing.
rc=0
claude -p --model opus --tools "Read,Grep,Glob" < "$R/prompt.txt" > "$R/review.md" || rc=$?
if [ "$rc" -ne 0 ]; then
  echo "claude -p failed (exit $rc): no review happened" >&2
  cat "$R/review.md"
  exit "$rc"
fi

if ! git status --porcelain --untracked-files=all | diff -q "$R/before.txt" - >/dev/null; then
  echo "THE REVIEWER CHANGED THE TREE. Inspect before any git add:" >&2
  git status --porcelain --untracked-files=all
  exit 1
fi

if [ "$QA" = "0" ]; then
  mkdir -p .lane
  cp "$R/review.md" .lane/local-review.md
fi
cat "$R/review.md"
