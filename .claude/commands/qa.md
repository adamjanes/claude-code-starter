---
description: Turn feedback on an open PR into an answer or a fix pushed to the same branch, with an audit trail on the PR
argument-hint: <PR#> "<feedback or question>"
model: opus
---

# /qa — your feedback on a PR, handled on the same PR

Usage: `/qa 41 "the thumbnail stretches on wide cards — keep the aspect ratio"` · `/qa 41` (ask for the feedback)

**Input:** `$ARGUMENTS`

The feedback lane. The human reviews an open PR (usually on its preview), says what's wrong or asks
a question, and `/qa` turns that into an answer or a fix **pushed to the PR's existing branch** —
never a new branch, never a new PR. Every round leaves a record on the PR thread, and a change
request gets its QA-record comment **before** any code changes.

## Step 0 — Load the PR

1. `gh pr view <n> --json number,title,body,state,headRefName,url,statusCheckRollup`, `gh pr diff <n>`,
   the comment thread, and the linked issue (`Closes #…`) for its acceptance criteria.
   **Not OPEN → stop:** a merged or closed PR isn't reopened; that's a new `/issue` and `/work`.
2. Capture the feedback **verbatim**. Not in the arguments → ask, once. Two readings that would lead
   to different fixes → confirm in that same exchange; otherwise go: the feedback *is* the sign-off.

## Step 1 — Classify

- **Question** ("why does X…", "does this handle Y?") → answer from the diff, the code and CI
  evidence; post the question and answer as the QA-record comment (the PR thread is the QA log).
  No code changes. Done.
- **Change request** → Steps 2–5.
- **Scope guardrail:** needs a migration, a product or approach decision, or grows the PR past its
  issue → stop and propose the route (`/issue` + `/work`). `/qa` amends the PR; it doesn't grow it.

## Step 2 — QA-record comment, BEFORE any change

Write `.lane/qa-<n>-round<k>.md` (`<k>` = the round number) and post it:
`head -3 .lane/qa-<n>-round<k>.md && gh pr comment <n> --body-file .lane/qa-<n>-round<k>.md`

```markdown
## 🔍 QA round <k> — <YYYY-MM-DD>

**Feedback (verbatim):** "<exactly what was said>"
**The ask:** <one-sentence interpretation>
**What we'll change:** <the planned change, as an outcome, not file paths>
```

Never skipped, never retroactive, never edited later. A second round gets a second comment.

## Step 3 — Fix on the PR's branch

A worktree on the PR's **existing** head branch, never the main checkout:

```bash
git fetch origin
git worktree add --track -b <headRefName> ../<repo>-worktrees/qa-pr-<n> origin/<headRefName>
# branch already exists locally: git worktree add ../<repo>-worktrees/qa-pr-<n> <headRefName> && git -C … pull --ff-only
```

- Trivial (one or two files, one logical edit) → the orchestrator edits directly.
- Larger → shape it as `agent-team` input and run that skill inside the worktree.
- Tests follow the `tdd` skill: the feedback is the evidence the red test is written from.

## Step 4 — Gate, review, push

1. `pnpm gate` (the `gate` skill). Classify any red before fixing it. Never push a known-red branch.
2. **Visual evidence** for any user-visible change: refresh the PR's `## Visual evidence` rows.
3. Commit on the PR branch — explicit paths, a message referencing the issue `(#<issue>)`.
4. `pnpm review --qa` on the committed amendment (`local-review` skill). Verify each finding; fix
   what's real in its own commit; note refutations.
5. `git push` — same branch, so the PR and its preview update in place.
6. CI green on the pushed SHA (`gate` skill).

## Step 5 — Close the loop

1. **Reply on the PR** under the QA round: what changed, the commit SHA, the review verdict, and
   1–3 re-test steps on the refreshed preview (`check-steps`: URL → action → what you see).
2. If the fix changes what the human should test, update the PR body's **Try it on the preview**
   and post a fresh "ready to test" on the linked issue, so neither goes stale.
3. Remove the worktree. **Report** what was asked, what changed, gate and review verdicts, re-test
   steps, and the `handback` footer (`/qa` always has a PR to link). **Merging stays the human's.**

## Anti-patterns

- ❌ Editing code before the QA-record comment is posted.
- ❌ A new branch or a new PR for feedback on an open one.
- ❌ "Fixed" with no re-test steps.
