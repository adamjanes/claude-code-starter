# GitHub Actions — CI is the gate

This starter is opinionated about one thing above all: **the verdict on a change comes from GitHub
Actions, never from a laptop.** Agents and humans run the same suite, in the same place, against
the same tree, and the PR only gets a green tick for a tree that actually passed.

```
 lane worktree                    GitHub                                     you
 ─────────────                    ──────                                     ───
 edit, pnpm check (fast)
        │
 pnpm gate ──snapshot + merge onto main──▶ gate/<lane> ──▶ ci.yml ──▶ PASS / FAIL
        ◀──────────────────── verdict, failed-step log ◀──────┘
        │
 commit, pnpm review, push ─────────────▶ issue/<n>-<slug> ──▶ Vercel preview ──▶ try it
 gh pr create ──────────────────────────▶ PR ──▶ ci.yml   (reuses the gate run: same tree)
                                              ├▶ pr-guards.yml  (issue link, screenshots, migrations)
                                              └▶ pr-preview-link.yml (pins the preview URL)
                                                                         review ──▶ merge
                                              on close ▶ gate-cleanup.yml (deletes gate/<lane>)
```

## The workflows

| File | Runs on | What it does |
|---|---|---|
| `ci.yml` | push to `main` and `gate/**`, every PR | The gate: lint, typecheck, test, build. On a PR, first checks whether this exact tree already passed on a gate branch and, if so, skips the duplicate run. |
| `pr-guards.yml` | PR opened, edited, pushed, labelled | One cheap job: a bare `Closes #<n>` line; a `## Visual evidence` section when UI paths change; migrations alone. |
| `pr-preview-link.yml` | the Vercel bot's first comment, PR edits | Pins the branch's preview URL as the first line of the PR description. Delete it if you're not on Vercel. |
| `gate-cleanup.yml` | PR closed | Deletes the lane's `gate/<lane>` branch. |

## `pnpm gate`, step by step

`scripts/gate.mjs` (about 200 lines, no dependencies beyond `git` 2.38+ and `gh`):

1. **Snapshot** the worktree through a scratch index: tracked edits, untracked files, everything
   `.gitignore` doesn't exclude. The branch, the real index and HEAD never move.
2. **Merge onto `origin/main`'s tip** with `git merge-tree`, in memory. A conflict stops here,
   before anything is pushed (exit 3).
3. **Push** the merge commit to `gate/<lane>` (lane = the branch name, made ref-safe). Unless the
   last gate on that ref had the identical tree: then it re-attaches to that run instead.
4. **Wait** for `ci.yml`'s run on that SHA, print a heartbeat each minute, then the per-job result
   and the last 150 lines of any failed step. Exit 0 pass · 1 fail · 2 not run · 3 not submitted ·
   124 stopped watching. The verdict also lands in `.lane/gate-verdict.json`.

Why this shape:

- **One definition of "the full suite".** Whatever `ci.yml` runs *is* the gate. Add a leg there and
  every lane, agent or human, runs it from then on.
- **The laptop stays free.** Five agents running five test suites at once on one machine flake on
  shared ports and starve each other. GitHub's queue serializes nothing you didn't ask it to.
- **It tests what will merge**, not what's on the branch: the gate commit is already merged onto
  `main`. A green gate predicts a green PR.
- **No routine rebase.** Because the PR's CI reuses the gate run for an identical tree, rebasing just
  to be current only changes the tree and costs a second run (and a second preview build).

## Branch protection

`bash scripts/setup-github.sh` sets it up (and the labels) after printing the plan and asking:

- changes reach `main` only through a PR;
- required checks: **Lint, typecheck, test & build** and **Issue link, visual evidence and migrations**
  (a check *skipped* because the gate run was reused counts as passing);
- no force-pushes, no deletion; `strict` off (no "branch must be up to date": see No routine rebase);
- admins can still merge. That's the human. The agent can't, for three independent reasons: the
  `gh pr merge` deny rule in `.claude/settings.json`, the `guard-bash.mjs` hook, and the token
  rules below.

Branch protection on a private repo needs GitHub Pro, Team or Enterprise.

## Tokens and secrets

- **The agent's token: `repo` + `read:org`. Never `workflow`.** A workflow can read every secret the
  repo has, so the ability to push one is the keys to everything. When a lane needs a CI change, it
  describes it in the PR body; a human applies it. (Kelvin goes one step further: an agent edits a
  mirror in `.github/workflows-src/`, and a GitHub App installs it into `.github/workflows/` after
  a human merges. Worth it once agents propose CI changes weekly.)
- **Production secrets live in the `production` environment**, deployable only from `main`. A job
  that needs one declares `environment: production`. PR branches and `gate/**` refs can't read
  them, so nothing an agent pushes can reach production credentials before a human merges.
- **Scoped credentials are fine as repo secrets**: a test user whose permissions confine it to its
  own data, a spend-capped API key.

## Running CI on your own machine

GitHub-hosted runners are the default. When the suite outgrows them (a database per run, long e2e),
register a self-hosted runner and change the gate job:

```yaml
    runs-on: [self-hosted, my-runner]
    # Never run a fork's code on your machine:
    if: ${{ !cancelled() && (github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository) && needs.reuse.outputs.reused != 'true' }}
```

Keep `pr-guards.yml`, `gate-cleanup.yml` and anything holding a production secret on
GitHub-hosted runners: a self-hosted runner runs as the same user for every job, PR code included.

## Previews

Every pushed branch gets a Vercel preview; `gate/**` branches don't (`scripts/vercel-ignore.sh`).
The preview is the review surface, and three things depend on it:

- `/work` and `/qa` capture screenshots on it (`pnpm capture`, the `visual-evidence` skill);
- the PR's **Try it on the preview** steps link into it (the `check-steps` skill);
- `/mockup` designs are judged on it.

Using Netlify, Render or Cloudflare Pages instead? Everything works the same; change
`pr-preview-link.yml`'s bot login and URL parsing, or delete it and resolve the URL by hand.
