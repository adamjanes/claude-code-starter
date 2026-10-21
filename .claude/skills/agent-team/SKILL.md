---
name: agent-team
description: The engine /work, /qa and /overnight drive — split a planned change into file-disjoint units, run one builder sub-agent per unit in parallel, then loop (verify the diff, gate on CI, adversarial review), sending every failure back to a fresh fixer agent until the work is green, with bounds on when to re-diagnose or stop. Load when a change spans more than one or two files.
user-invocable: false
---

# agent-team — parallel builders, one orchestrator, a loop until green

**The contract:** the orchestrator (the session model) plans, splits, verifies and decides; sub-agents
read and edit. Builders never see each other, never share a file, and never run git or the gate.
The orchestrator trusts the diff and the CI run, not the reports. **Nothing leaves the loop
until it is green or explicitly parked.**

Driven by `/work` or `/qa`, everything below happens inside that lane's worktree; the command owns
the worktree, the PR and the narration.

## 1. Shape the input

Each unit of work as `{ id, files[] (with line refs), change, verification }` — from `/work`'s
LOCATE step, review findings, or a QA round. When a change has options, pick the one that keeps
existing invariants (one shared constant, one helper) over the most local edit.

## 2. Group into FILE-DISJOINT units

No two units edit the same file. Changes that share a file share a unit; a file and its test stay
together. Nothing else makes parallel edits safe: there is no file locking, so the last writer
silently wins. A unit of one or two lines isn't worth an agent: the orchestrator keeps it.

## 3. One builder per unit, in parallel — the build loop

One message, several `Agent` calls, **at most three builders at once**, each `model: "sonnet"`.
Every brief is self-contained (a sub-agent cannot see this conversation):

- The worktree path and branch; *edit ONLY these files*.
- The change verbatim, the option chosen, and why.
- "Read each file first; confirm the lines still say what the plan says."
- **Do NOT run git, or the gate** (`pnpm gate`, `pnpm build`): the orchestrator runs them once.
- **The build loop is yours:** failing test first (the `tdd` skill), the smallest change that
  turns it green, your own narrow run only (`pnpm vitest run <your test file>`). Never green by
  editing the expectation. Report the red line.
- **Last action:** write `<worktree>/.lane/<agent>-report.md` — before/after per file, new exports
  and signatures, the red line, the final test line. The orchestrator reads the file, not your
  hand-back message.

## 4. The loop — verify, gate, review, and send failures back

```
        ┌──────────────── fresh fixer agent ◀──────────────┐
        ▼                                                   │ introduced
  builders' diff ──▶ VERIFY ──▶ GATE (CI) ──▶ REVIEW ──▶ green: ship
                       │ wrong     │ red         │ real finding
                       └───────────┴─────────────┴──▶ classify ──▶ pre-existing / environmental: record, don't chase
```

Every pass goes through the same three checks, in order, and every failure goes back through the
same door:

1. **VERIFY the diff yourself.** `git diff --stat`, then the hunks. Did each unit do what was
   asked **and** keep the invariants? The tells of a self-check that passed while breaking
   something: a shared constant redefined locally, a helper copied instead of imported, an
   expectation edited to match the code, a test that can't fail.
2. **GATE** — `pnpm gate` in the background (the `gate` skill): lint and custom lint rules,
   typecheck, unit and convention tests, build, end-to-end smoke, on GitHub Actions.
3. **REVIEW** — `pnpm review` (the `local-review` skill): a fresh, read-only Claude attacks the
   committed diff. Verify each finding against the diff before acting on it.

**Classify before fixing** (the `gate` skill): *pre-existing* (fails on `main` too) and
*environmental* (a runner or network hiccup; re-run once) are recorded, not chased. *Introduced*
goes back into the loop.

**Send it back to a fresh fixer, not the original builder.** A fixer is a new `sonnet` sub-agent
whose whole brief is: the failing check or finding verbatim (the assertion line, the log excerpt,
the reviewer's file:line and scenario), the files it may touch, what the unit was for, and "make
this pass without weakening any test". A fresh agent with one sharp problem beats a long context
that already believes its own work is right. Trivial fixes (one line, obvious) the orchestrator
makes itself. Then the pass starts again at VERIFY.

**Bounds — the loop never spins.**

- **Same failure red three times** → stop patching. Send read-only scouts at the failure for a
  fresh diagnosis, choose a different approach, and continue from there.
- **Still red after the new approach** → `/work` stops and reports to the human: the failure, both
  diagnoses, the options. `/overnight` parks that issue (drops it from `Closes`, comments why) and
  ships the rest of the lane.
- **Never** green by deleting or weakening a test, raising a timeout, or skipping a check.

## 5. Close out

One commit per logical change, explicit paths only (never `git add -A`). The run log goes in the
PR body under **What happened**:

```markdown
## What happened
**Base:** main @ <sha> · **Units:** 3, file-disjoint · **Loop passes:** 2

| Agent | Change | Files | Result |
|-------|--------|-------|--------|
| A builder | overdue chip says how late | lib/tasks.ts, tests/unit/tasks.test.ts | red → green |
| B builder | done tasks sink | components/TaskList.tsx, tests/unit/task-list.test.tsx | red → green |
| C fixer | gate: e2e expected old order | tests/e2e/smoke.spec.ts | green on pass 2 |

**Caught in verify:** B re-declared the date format locally → switched to lib/format.ts.
**Failures classified:** e2e "home shows tasks in order" → introduced (order changed by #3) → fixer C.
**Gate:** PASS on pass 2 (run link) · **Review:** SHIP, 1 finding refuted (below).
```

## Context — why the orchestrator stays small

The orchestrator is the only long-lived context in a lane, so it holds **decisions and evidence,
never raw material**:

- **Sub-agents do the reading and editing** in their own context windows; the orchestrator gets
  their conclusions.
- **Reports come from files** (`.lane/<agent>-report.md`), short and structured, not long
  hand-back messages.
- **Diffs by stat first**, then only the hunks that matter; never whole files "for context".
- **Long output goes to a file** in `.lane/` and is searched, never read whole. The gate prints
  only the failed step's tail.
- **Waits happen in the background**: one command that exits on every end state, so the session
  hears once instead of re-reading its whole context on every poll.
- **Fresh agents for new work**: a fix after a hand-back goes to a new fixer with one problem,
  never back into a builder's long context.
