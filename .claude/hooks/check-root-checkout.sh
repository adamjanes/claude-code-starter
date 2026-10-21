#!/usr/bin/env bash
# SessionStart: warn when the root checkout is not a clean, current main. Real work happens in worktrees, and a root left
# on a stale branch silently answers every ad-hoc read from it. Read-only on purpose; silent when all is well.
set -uo pipefail

command -v git >/dev/null 2>&1 || exit 0
ROOT=$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2; exit}')
[ -n "${ROOT:-}" ] && [ -d "$ROOT" ] || exit 0

WARN=""
add() { WARN="${WARN}$1"$'\n'; }

MAIN_WT=$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{wt=$2} /^branch refs\/heads\/main$/{print wt; exit}')
if [ -n "${MAIN_WT:-}" ] && [ "$MAIN_WT" != "$ROOT" ]; then
  add "• main is checked out in a worktree, so the root cannot return to it: $MAIN_WT"
fi

BRANCH=$(git -C "$ROOT" branch --show-current 2>/dev/null)
if [ -n "${BRANCH:-}" ] && [ "$BRANCH" != "main" ]; then
  add "• The root checkout is on '$BRANCH', not main. Reads there answer from that branch."
fi

DIRTY=$(git -C "$ROOT" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "${DIRTY:-0}" != "0" ]; then
  add "• The root checkout has $DIRTY uncommitted file(s). Work belongs in a worktree."
fi

# Against the cached origin/main: a session start must not wait on the network.
BEHIND=$(git -C "$ROOT" rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
if [ "${BEHIND:-0}" -gt 50 ]; then
  add "• The root checkout is $BEHIND commits behind origin/main. Pull before reading code there."
fi

if [ -n "$WARN" ]; then
  printf 'Root checkout check (%s):\n%sInspect before changing anything: git -C %q status\n' "$ROOT" "$WARN" "$ROOT"
fi
exit 0
