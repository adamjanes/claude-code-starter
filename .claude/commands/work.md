---
description: Build a GitHub issue end to end — plan, one sign-off, worktree, agent team, CI gate, review, PR with a preview
argument-hint: <issue#> | <epic#>
model: opus
---

# /work — an issue in, a reviewed PR with a preview out

Usage: `/work 12` · `/work <epic#>` (scope a whole epic into sub-issues, one PR — see **Epic mode**) ·
`/work` (ask which issue)

**Input:** `$ARGUMENTS`

The default lane: plan the issue, get the human's sign-off **once**, build it in an isolated
worktree with an agent team, prove it on CI (`pnpm gate`), review it with fresh eyes, then open a
PR closing the issue. The preview attaches; **the human tests it and merges. Never the agent.**

**The issue is the command center.** Every comment on it is written for someone who doesn't read
code: what's happening, what to try, what shipped. Code detail goes in the PR.

Reuses, never restates (edit those files to change them): the `agent-team` skill (the swarm),
`gate` (CI and waiting), `tdd` (tests), `local-review` (pre-PR review), `visual-evidence`
(screenshots), `check-steps` (try-it steps), `handback` (the footer).

Every file handed to `gh` is written to `.lane/<name>.md` and re-read in the same command that
consumes it (`head -3 .lane/x.md && gh … --body-file .lane/x.md`): an earlier check proves nothing
about the moment `gh` opens the path, and concurrent lanes overwrite shared paths.

## Step 0 — Load the issue, set up the worktree

1. `gh issue view <n> --json number,title,body,labels,url` — read the story and its acceptance
   criteria. Labelled `epic` → **Epic mode** below.
2. Acceptance criteria missing or ambiguous → tighten them with the human in **one** exchange and
   update the issue body (`gh issue edit <n> --body-file .lane/ac.md`). They are the contract
   everything below is verified against.
3. **Comment "work started"** on the issue, 3–6 plain lines: what we're about to do, the approach
   in one sentence, that a preview link will follow. No file paths.
4. Cut the worktree off a fresh `origin/main` (slug = ~4 words of the title, kebab-case):
   ```bash
   git fetch origin
   git worktree add ../<repo>-worktrees/issue-<n>-<slug> -b issue/<n>-<slug> origin/main
   cd ../<repo>-worktrees/issue-<n>-<slug> && pnpm install --prefer-offline && mkdir -p .lane
   ```
   Copy any gitignored env file the app needs (`.env.local`) from the main checkout. An issue
   carrying a `**Branch:** design/<slug>` line bases the worktree on `origin/design/<slug>`
   instead (the `design-pages` skill), and says so at the gate.

From here on, every message ends with the `handback` footer.

## Step 1 — LOCATE and plan

Fan out **read-only** sub-agents, one per suspected area, returning for each unit:
`{ id, files[] with line refs, root cause (bug) or insertion points (story), the minimal change
meeting the criteria, how it will be verified }`. Diagnose against the worktree's real state;
keep existing invariants (shared constants, the helpers the codebase already uses).

**Escalate instead of building** when it needs a schema or migration decision, forks on approach,
or grows past ~8 files: stop at the gate and propose splitting it. The human decides.

## Step 2 — GATE: the one sign-off

A short plain-English plan for someone skimming in chat, not a document:

- **Issue** #<n> · **Base** `main` @ `<short sha>` · **Branch** `issue/<n>-<slug>`
- What we found, what we'll change, how we'll know it worked.
- **What gets tested, and where:** one line per behaviour with its public entry point (a route, a
  server action, a rendered component; never a private helper), per the `tdd` skill.
- Every decision point called out: an escalation, a base-branch override, anything that costs money.

The human confirms or tweaks in one line. Write the plan to `.lane/plan.md` (it becomes the PR
body's **Plan** section). No revision loops.

## Step 3 — BUILD

Run the `agent-team` skill inside the worktree: file-disjoint units, at most three builders in
parallel, red-first tests, reports to `.lane/`. Then review the actual diff yourself.

## Step 4 — VERIFY

1. `pnpm gate` in the background (the `gate` skill). Red that isn't environmental gets fixed and
   gated again. **Never push a known-red branch.**
2. **Walk the acceptance criteria against the diff:** each is **met** (say how) or **flagged** in
   the PR body.
3. **Visual evidence** for anything a user can see: commit (explicit paths), push the branch so the
   preview builds (`git push -u origin issue/<n>-<slug>`, no PR yet), then run the
   `visual-evidence` skill end to end.

## Step 5 — SHIP

1. **Commit** — explicit paths only, never `git add -A`; the session's trailers.
2. **Local review** — `pnpm review` (the `local-review` skill). Only SHIP, or every finding
   fixed / refuted / deferred in writing, proceeds. Fixes are their own commits, re-gated.
3. **PR body** to `.lane/pr-body.md`: **Summary** (two or three sentences for the user's side) ·
   a bare `Closes #<n>` line · **Plan** · **What happened** (the `agent-team` run log) ·
   **Acceptance criteria** (met / flagged) · **Test gate** (verdict + run link) · **Local review** ·
   **Visual evidence** · **Try it on the preview** (`check-steps`) · **Follow-ups considered**.
4. **Push and open it:**
   ```bash
   git push -u origin issue/<n>-<slug>
   head -3 .lane/pr-body.md && gh pr create --base main --title "<imperative title> (#<n>)" --body-file .lane/pr-body.md
   ```
   A refused push means someone else committed to the branch: stop and ask. A change to
   `.github/workflows/` is never pushed by the agent (CLAUDE.md → Secrets): describe it in the PR
   body for the human to apply.
5. **CI green on the pushed SHA** (`gate` skill). Then resolve the preview URL into the body
   (`check-steps` two-phase rule) so only real, verified links reach the human.
6. **Comment "ready to test"** on the issue: the outcome in 2–4 plain sentences, the PR and preview
   links, 2–3 try-this steps, the verified screenshots. A non-technical reader must *see* the fix.
7. Remove the worktree (`git worktree remove …`; the branch lives on the remote).
8. **Report:** PR URL, gate verdict, review verdict, try-it steps, and the footer. Then stop:
   **merging is the human's.**

**After merge** (if seen in-session): a one-line "shipped" comment on the issue. The lane that
ships closes the issue: if the work landed through a different PR, close it by hand with a link.
A PR closed unmerged → re-link the issue to the PR now carrying the work, or say it didn't ship.

**Follow-ups:** at most **one** new issue per lane, and only if a user or the decision-maker would
notice if it were never done. Everything else goes in the PR body under **Follow-ups considered**.

## Epic mode — `/work <epic#>`

An open issue labelled `epic`: one outcome, several agent-sized pieces, **one PR**.

1. **Scope it.** Read the epic and its *For the agent picking this up* section, re-check that state
   on `main`, and run Step 1's LOCATE across it. Reuse open sub-issues rather than duplicating them.
2. **One gate** — the plan, the proposed sub-issues (title + acceptance criteria each), and the
   combined change plan, in one message.
3. **After sign-off**, file the sub-issues with `/issue`'s templates (this gate is their
   confirmation) and link each under the epic (`/issue` step 4).
4. **Build** on one branch `epic/<n>-<slug>`: one LOCATE per sub-issue, already done; the
   `agent-team` skill over all of them; one gate; one PR with a bare `Closes #<n>` line **per
   sub-issue**, per-issue acceptance criteria, and evidence rows for each. Narrate "started" and
   "ready to test" on **every** sub-issue, so each thread reads complete on its own.
5. A sub-issue that trips the escalation guardrail drops out at the gate; the rest go ahead.
   Migrations still ship as their own PR, merged first.

## Anti-patterns

- ❌ Skipping the gate "because it's obvious", or building in the main checkout.
- ❌ "Tests pass locally" as the verdict — the verdict is `pnpm gate`.
- ❌ A `<preview>` placeholder, or a vague "check it works" step, left in the PR after CI is green.
- ❌ Merging, pushing `main`, or opening a second PR for the same issue.
