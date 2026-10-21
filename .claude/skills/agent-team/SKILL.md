---
name: agent-team
description: The swarm engine /work, /qa and /overnight drive — split a planned change into file-disjoint units, run one builder sub-agent per unit in parallel, review the real diff (verify, don't trust), classify failures, gate once, close out with one commit and a run log. Load when a change spans more than one or two files.
user-invocable: false
---

# agent-team — parallel builders, one orchestrator

**The contract:** the orchestrator (the session model) plans, splits and verifies; builder
sub-agents edit. Builders never see each other, never share a file, and never run git or the gate.
The orchestrator trusts the diff, not the reports.

Driven by `/work` or `/qa`, everything below happens inside that lane's worktree; the command owns
the worktree, the PR and the narration.

## 1. Shape the input

Each unit of work as `{ id, files[] (with line refs), change, verification }` — from `/work`'s
LOCATE step, a review's findings, or a QA round. When a fix has options, pick the one that keeps
existing invariants (one shared constant, one helper) over the most local edit.

## 2. Group into FILE-DISJOINT units

No two units edit the same file. Changes that share a file share a unit; a file and its test stay
together. Nothing else makes parallel edits safe: there is no file locking, so the last writer
silently wins.

A unit of one or two lines isn't worth an agent: the orchestrator keeps cheap residue itself.

## 3. One builder per unit, in parallel

One message, several `Agent` calls, **at most three builders at once**, each `model: "sonnet"`.
Every brief is self-contained (a sub-agent cannot see this conversation):

- The worktree path and branch; *edit ONLY these files*.
- The change verbatim, the option chosen, and why.
- "Read each file first; confirm the lines still say what the plan says."
- **Do NOT run git, or the gate** (`pnpm gate`, `pnpm build`): the orchestrator runs them once.
- Verify with your own narrow run only (`pnpm vitest run <your test file>`), iterate to green,
  never by editing the expectation. Tests follow the `tdd` skill: red first, and report the red line.
- **Last action:** write a report to `<worktree>/.lane/<agent>-report.md` — before/after per file,
  new exports and their signatures, the final test line. The orchestrator reads the file, not the
  hand-back message.

## 4. Review — VERIFY, DON'T TRUST

Read the actual diff (`git diff`), not the prose. A builder's self-check still passes while it
introduces a regression a wider lens catches: a shared constant redefined locally, a helper copied
instead of imported, an expectation edited to match. Confirm each unit did what was asked **and**
kept the batch's invariants. Images get the same treatment (`visual-evidence` skill).

## 5. Classify any failure, then gate once

Pre-existing, introduced or environmental, with evidence (`gate` skill). Then **one** full
`pnpm gate` over the assembled tree — never N builders gating in parallel.

## 6. Close out

One commit, explicit paths only (never `git add -A`), with the session's trailers. The run log
below goes in the PR body under **What happened**.

```markdown
## What happened
**Trigger:** <why — e.g. /work #12, three file-disjoint units>   **Base:** main @ <sha>

| Agent | Change | Files (disjoint) | Result |
|-------|--------|------------------|--------|
| A     | …      | …                | …      |

**Caught in review:** <e.g. agent B re-declared MAX_TITLE locally → switched to the shared constant>
**Failures classified:** <failure> → <pre-existing | introduced | environmental> → <evidence> → <action>
**Gate:** <verdict + run link>
```

## Lessons that cost something to learn

- **One close-out.** Fix-on-fix spirals happen when every builder commits. They don't.
- **Short lanes.** Work found after a hand-back goes to a fresh agent briefed with the finding,
  the branch and the paths, never back into a long context.
- **Long output goes to a file** in `.lane/` and is searched, never read whole.
