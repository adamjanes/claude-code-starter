---
name: local-review
description: The pre-PR review gate — a fresh-context, read-only `claude -p` session reviews the committed branch diff before anything is pushed or a PR is opened or amended. Load at /work's ship step, /qa's push step, and after any non-trivial fix push.
user-invocable: false
---

# local-review — fresh eyes before the PR

**The contract:** before a branch is pushed for review, a **separate** Claude session that never
saw the work reads the real diff and tries to break it. The session that wrote the code is the
worst-placed reviewer of it.

## When

- `/work` — after the gate is green, before `gh pr create`.
- `/qa` — on the amended branch, before the push, with `--qa`.
- After a fix that added non-trivial code: run it again before reporting done.

## Run it

Commit first: the reviewer diffs `origin/main...HEAD` and sees only committed state.

```bash
pnpm review          # or: pnpm review --qa  (a QA round: transcript stays out of .lane/)
```

`.claude/scripts/local-review.sh` writes the diff to a temp dir, prepends it to
[`prompt.md`](prompt.md), and runs `claude -p --model opus --tools "Read,Grep,Glob"`. **`--tools`
is what makes it read-only**; `--allowedTools` only skips permission prompts and restricts nothing.
The script then proves the tree didn't change before copying the transcript to
`.lane/local-review.md`. Two to six minutes, on your Claude subscription.

## Handling the output

- **Verify, don't trust, in both directions.** Check each finding against the diff before acting.
  **Never auto-apply a suggested fix**: a confident HIGH can prescribe a bug.
- Real → fix in its own commit, re-gate, re-review if the fix was non-trivial.
- Refuted or deferred → one line each, with the reason, or where it's tracked.
- A finding you can't confidently refute is a question for the human, never a silent drop.
- **A test-quality finding is a finding.** A test that cannot fail is a defect shipped as reassurance.
- The PR body carries `## Local review`: the verdict, then per finding fixed (commit) /
  refuted (why) / deferred (where). `/qa` rounds put it in the follow-up PR comment instead.

## Going further

`/code-review` in Claude Code reviews a diff or PR in-session; `/code-review ultra` launches the
billed multi-agent cloud review, which **a human launches, never an agent**.
