---
name: gate
description: How a lane proves its work green — `pnpm gate` (CI on GitHub Actions is the full test suite), waiting in the background, polling a PR's checks by REST, and what counts as green. Load before running tests to decide "done", before pushing, and whenever waiting on CI.
user-invocable: false
---

# gate — CI is the test suite, GitHub is the queue

**The contract:** "the full gate" means one thing: `.github/workflows/ci.yml`, run on GitHub
Actions against the lane's exact working tree merged onto `main`. Not "the tests pass on my
machine", not a narrow run of the file you touched. A lane never pushes a branch it knows is red.

## What the gate runs

| Layer | Locally | Catches |
|---|---|---|
| **ESLint** with Next's rules **and custom rules** (`eslint-rules/`) | `pnpm lint` | framework misuse; comments that sprawl past two lines or narrate the change |
| **TypeScript**, strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | `pnpm typecheck` | the type errors a loose config lets through |
| **Unit tests** at public seams, plus tests of the tooling itself (gate, guard hook, lint rules, evidence table) | `pnpm test` | behaviour, per the `tdd` skill |
| **Convention tests** (`tests/unit/conventions/`) | `pnpm test` | house rules as tests: design tokens only, secrets only in production jobs, every workflow declares permissions, no focused tests |
| **Build** | `pnpm build` | what only the production build sees |
| **End-to-end smoke** in a real browser against the built app | `pnpm test:e2e` | the pages actually render and respond |

`pnpm check` runs the first four in under a minute; it is the fast loop between edits, never the
verdict. Adding a layer means adding a step to `ci.yml`'s gate job: from then on every lane runs it.

## Run it

```bash
pnpm gate        # Bash tool: run_in_background
```

`scripts/gate.mjs` snapshots the working tree (uncommitted and untracked files included; branch,
index and HEAD untouched), merges it onto `origin/main`'s tip, pushes the result to
`gate/<lane>`, and waits for ci.yml's run on it. Its header has the mechanics.

| rc | meaning | do this |
|---|---|---|
| 0 | PASS | carry on to review / push |
| 1 | FAIL | read the failed-step log it printed, classify (below), fix, gate again |
| 2 | NOT RUN — cancelled, or no run appeared | a newer gate on the same lane cancels the older one; otherwise check ci.yml's triggers |
| 3 | not submitted — conflicts with `main`, or on `main` itself | rebase onto `origin/main`, resolve, gate again (say so at the next report) |
| 124 | stopped watching; the run continues | `pnpm gate` again on the same tree re-attaches, no new run |

- **Read the exit code or `.lane/gate-verdict.json`**, never a log tail.
- **Cut off halfway?** Run it again. The same tree re-attaches to the same run; a changed tree
  pushes a new run and the old one is cancelled.
- **Merged onto `main`, so a PR reuses it.** When the PR opens on that same tree, ci.yml's
  "Reuse a green gate run" job finds the green gate run and skips the duplicate. So **no
  routine rebase** before pushing: it only changes the tree and forces a second run.
- **Between edits, locally:** `pnpm check` (lint, typecheck, unit tests) is the fast loop. It is
  never the verdict.

## Classify a failure before touching it

Prove where it came from; never assume the lane caused it, never assume it didn't.

- Fails on `main` too (`git stash`, or gate a clean branch off `origin/main`) → **pre-existing**.
  Say so in the PR body; fix it only if it's in scope.
- The same error hits files nobody touched, or a network or runner hiccup → **environmental**.
  Re-run once; if it repeats, report it rather than chase it.
- Otherwise → **introduced**. Fix it, then gate again.
- A pre-existing break the change newly *exposes* (a new check catching an old fixture) is in scope.

## Waiting — in the background, never in turns

Every wait (a gate, CI on a pushed SHA, a preview build) is **one** `run_in_background` command
that checks on an interval and exits on every end state, so the session hears once. Never a
foreground `sleep`, `tail` or `gh run view` loop: each turn re-reads the whole context.

## CI on a pushed PR — what counts as green

Poll the REST API at most every 5 minutes, on **the pushed SHA**, both endpoints:

```bash
gh api repos/{owner}/{repo}/commits/<sha>/check-runs --jq '.check_runs[] | [.name, .status, .conclusion] | @tsv'
gh api repos/{owner}/{repo}/commits/<sha>/status --jq '.statuses[] | [.context, .state] | @tsv'
```

The second matters: Vercel reports deployments as commit *statuses*, not check runs. Never
`gh pr checks --watch` (GraphQL, burns the rate limit).

**Green** = every check SUCCESS on the pushed SHA, or the gate job SKIPPED because "Reuse a green
gate run" succeeded and its notice links a run you opened and confirmed green. An empty conclusion
is still running, never passed. CANCELLED beside a FAILURE was stopped by fail-fast: it did not pass.

## Gate a fix before pushing it

A red PR gets a fix commit, `pnpm gate` green, **then** one push. Never push to find out.
