# CLAUDE.md

Every Claude Code session in this repo reads this file first. It holds the rules; the procedures
live in `.claude/commands/` (what you type) and `.claude/skills/` (the engines they share).
**Each rule is stated in exactly one file; everything else links to it.**

## Project facts — fill these in

- **Product:** Tasks, a tiny to-do app that stands in for yours. <!-- one line: what it is, who uses it -->
- **Decision-maker:** <!-- the person who signs off plans and merges PRs --> Every question, decision and approval goes to them.
- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`) · Vitest · pnpm · Node 24. No re-litigating the stack in a PR.
- **Commands:** `pnpm check` (lint, typecheck, unit tests: the fast local loop) · `pnpm gate` (the
  full suite on GitHub Actions: the verdict) · `pnpm dev` · `pnpm build`.
- **Previews:** every pushed branch gets a Vercel preview; `pr-preview-link.yml` pins its URL at the
  top of the PR. The preview is the review surface.

## The flow — the only route

**issue → `/work` → PR + preview → `/qa` (repeat) → the human merges.**

1. **`/issue`** — a description becomes a GitHub issue with testable acceptance criteria.
2. **`/mockup`** *(when the layout is uncertain)* — 2–3 live options on a design page; the human picks.
3. **`/work <n>`** — plan → **one sign-off** → worktree → agent team → `pnpm gate` → fresh-eyes
   review → PR closing the issue, with screenshots and try-it steps.
4. **`/qa <PR#>`** — feedback on the preview becomes a fix on the same branch, recorded on the PR.
5. **`/overnight`** — the same lanes, unattended, across every `ready` issue; one morning report.

**The issue is the command center.** Lanes narrate there in plain English: started → ready to test
(preview + try-it steps + screenshots) → shipped. Code detail belongs in the PR; the issue thread
must read complete to someone who doesn't read code.

## Non-negotiables

- **Merging to `main` is the human's action, always.** Agents push branches and open PRs; they never
  merge and never push `main`. Enforced three times: branch protection, the deny rule in
  `.claude/settings.json`, and the `guard-bash.mjs` hook.
- **Done = CI green on the pushed SHA + local review SHIP.** Never leave a red PR for the human.
  "Tests pass locally" is not a verdict; `pnpm gate` is (the `gate` skill).
- **Work happens in worktrees**, one per lane, cut from a fresh `origin/main`. The root checkout stays
  a clean `main` for reading (a SessionStart hook warns when it isn't).
- **Stage explicit paths.** Never `git add -A` or `commit -a`: concurrent lanes share a machine.
- **A user-visible change ships with screenshots** in the PR's `## Visual evidence` section
  (CI-enforced, the `visual-evidence` skill). **Every PR closes an issue** (CI-enforced).
- **Migrations ship as their own PR, merged first**, so the schema exists before the code using it
  (CI-enforced in `pr-guards.yml`; point `MIGRATIONS_PATH` at your migrations folder).
- **Verify, don't trust.** A sub-agent's report, a green tick, a grep and your own reasoning are
  claims. The diff, the CI run on the pushed SHA and a test seen to fail are evidence.

## Secrets

- **The agent's GitHub token has `repo` and `read:org` scope, never `workflow`.** A change to
  `.github/workflows/` is described in the PR body for the human to apply; the agent never adds
  the scope, not even "just for this push". A workflow can read every secret the repo holds.
- **A secret with production blast radius lives only in the `production` environment**, which only
  deploys from `main`. PR branches and `gate/**` refs can't read it, so the human gate is review at
  merge. Scoped credentials (a test user's login, a spend-capped API key) may be repo secrets.
- Secrets never go in a file, a commit, a PR body, an issue, or a log line.

## Lanes and scratch

- A lane's scratch (plans, agent reports, PR bodies, comments, screenshots) goes in
  `<worktree>/.lane/`, which is gitignored. **No planning documents in the repo:** the plan, the run
  log and the review verdict go in the PR body.
- **Every file handed to `gh` is written to `.lane/<name>.md` and re-read in the same command**
  (`head -3 .lane/pr-body.md && gh pr create … --body-file .lane/pr-body.md`). An earlier check
  proves nothing about the moment `gh` opens the path.
- **Wait in the background, never in turns.** A gate, a CI run or a preview build is one
  `run_in_background` command that exits on every end state.

## Models, by role

The orchestrator, planners, designers and reviewers run on the session model (Opus); the
pre-PR reviewer is pinned to `--model opus`. **Every sub-agent that edits files runs on
`model: "sonnet"`.** At most three builders per lane.

## Comments

Comment the non-obvious decision, not the change: at most two lines, no narration ("previously",
"now", "no longer"), no dates. When shortening, delete. A comment that wouldn't leave a reader
wrong if it vanished shouldn't exist.

## UI copy: show, don't explain

Screens carry labels, values and actions, not sentences about themselves: no subtitle restating a
heading, no helper paragraph saying what a panel does. Text earns its place only when the user
can't act correctly without it: an error, the consequence before an irreversible action, a unit.

## What goes on the backlog

- **The bar: would a user or the decision-maker notice if it were never done?** If not, don't file it.
- **At most one new issue per lane.** Anything else a lane noticed goes in its PR body under
  **Follow-ups considered**.
- **Whoever ships the work closes the issue**, with a comment linking what replaced it, if anything.

## The handback footer

Once a session has made something durable (an issue, branch, PR, preview), **every message ends
with the three-line footer** in `.claude/skills/handback/SKILL.md`.

## Where everything else lives

- `.claude/commands/` — `/issue`, `/work`, `/qa`, `/mockup`, `/overnight`
- `.claude/skills/` — `agent-team` (the swarm) · `gate` (CI as the test suite) · `local-review` ·
  `tdd` · `visual-evidence` · `check-steps` · `design-pages` · `handback`
- `.claude/hooks/` — the Bash guard and the root-checkout check; wired in `.claude/settings.json`
- `.github/workflows/` — `ci.yml` (the gate), `pr-guards.yml`, `pr-preview-link.yml`, `gate-cleanup.yml`
- `docs/` — `workflow.md` (a worked example), `github-actions.md` (the CI topology), `setup.md`,
  `adapting.md` (porting this to another stack)
