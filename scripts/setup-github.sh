#!/usr/bin/env bash
# One-time GitHub setup for a repo made from this starter: labels, branch protection on main, branch cleanup on merge.
# Prints the plan and changes nothing until you answer y. Usage: bash scripts/setup-github.sh
set -uo pipefail

die() { printf '%s\n' "$1" >&2; exit 1; }

command -v gh >/dev/null 2>&1 || die "gh (the GitHub CLI) is not installed: https://cli.github.com"
gh auth status >/dev/null 2>&1 || die "gh is not signed in: run 'gh auth login' first."
INFO=$(gh repo view --json nameWithOwner,visibility,defaultBranchRef 2>/dev/null) \
  || die "This folder isn't a GitHub repo gh can see. Push it first (gh repo create), then re-run."
REPO=$(printf '%s' "$INFO" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).nameWithOwner))')
VISIBILITY=$(printf '%s' "$INFO" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).visibility))')
BRANCH=$(printf '%s' "$INFO" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).defaultBranchRef?.name ?? "main"))')
[ "$BRANCH" = "main" ] || die "The default branch is '$BRANCH'; the workflows and hooks assume main. Rename it first."

# name|colour|description
LABELS=(
  "story|1d76db|Something new or better"
  "bug|d73a4a|Something broken"
  "epic|5319e7|One outcome, several sub-issues, one PR"
  "ready|0e8a16|Picked up by /overnight"
  "shift|fbca04|The record of one /overnight shift"
  "no-issue|cfd3d7|PR guard: this PR closes no issue"
)
CHECKS=("Lint, typecheck, test & build" "Issue link, visual evidence and migrations")

cat <<EOF
Repo: $REPO ($VISIBILITY)

This will:
  1. Create or update ${#LABELS[@]} labels: $(printf '%s ' "${LABELS[@]%%|*}")
  2. Protect main: changes arrive only through a PR; required checks:
       - ${CHECKS[0]}
       - ${CHECKS[1]}
     No force-pushes or deletion. Admins can still merge (that's you; agents never do).
  3. Delete a PR's branch automatically when it merges.

Undo: gh api -X DELETE repos/$REPO/branches/main/protection
EOF
[ "$VISIBILITY" = "PUBLIC" ] || echo "Note: branch protection on a private repo needs GitHub Pro, Team or Enterprise."

if [ -t 0 ]; then
  read -r -p "Apply? [y/N] " ANSWER
else
  echo "stdin is not a terminal: reading the answer (y/N) from stdin."
  read -r ANSWER || ANSWER=""
fi
case "$ANSWER" in
  y|Y|yes) ;;
  "") die "No answer given: nothing changed." ;;
  *) die "Not applied: nothing changed." ;;
esac

for entry in "${LABELS[@]}"; do
  IFS='|' read -r name colour description <<<"$entry"
  gh label create "$name" --repo "$REPO" --color "$colour" --description "$description" --force >/dev/null \
    && echo "✓ label $name" || echo "✗ label $name"
done

PROTECTION=$(node -e '
  const checks = process.argv.slice(1).map((context) => ({ context }))
  console.log(JSON.stringify({
    required_status_checks: { strict: false, checks },
    enforce_admins: false,
    required_pull_request_reviews: { required_approving_review_count: 0 },
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
  }))' "${CHECKS[@]}")
if printf '%s' "$PROTECTION" | gh api -X PUT "repos/$REPO/branches/main/protection" --input - >/dev/null 2>/tmp/setup-github-err.$$; then
  echo "✓ main protected"
else
  echo "✗ main not protected: $(cat /tmp/setup-github-err.$$)"
fi
rm -f /tmp/setup-github-err.$$

gh api -X PATCH "repos/$REPO" -F delete_branch_on_merge=true >/dev/null \
  && echo "✓ merged branches are deleted" || echo "✗ could not turn on branch deletion"
