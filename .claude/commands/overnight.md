---
description: The night shift — group the ready issues into file-disjoint lanes, run one agent team per lane unattended, wake up to CI-green PRs and one report
argument-hint: (none) | <theme> | <epic#> [<epic#>…]
model: opus
---

# /overnight — run N lanes unattended, wake up to finished PRs

Usage: `/overnight` (propose tonight's shift from `ready` issues) · `/overnight <theme>` (a shift
aimed at one goal) · `/overnight <epic#>` (scope a named epic and build it end to end, no approval stop)

**Input:** `$ARGUMENTS`

One orchestrator groups the work into file-disjoint lanes, runs one agent team per lane, and drives
each to a **CI-green PR onto `main`**. In the morning the human reads one report, tests previews,
merges. It is not `/work` × N: `/work` stops at a sign-off and asks; this lane has **one**
interactive moment (approving the shift, or naming the epic), then decides, records, and keeps going.

## The standing brief

Take every lane to a finished, CI-green PR. Delegate wherever possible. Decide and log; never ask
after the shift launches. Never give up or stop early. Never merge. Anything below that conflicts
with this is a bug in this file.

## Reuses, never restates

Each lane runs `/work`'s **Epic mode** steps (one branch, one PR, a bare `Closes #<n>` per issue,
narration on every issue) over the `agent-team`, `gate`, `local-review`, `visual-evidence`,
`check-steps` and `handback` skills. **Three overrides, nothing else:**

1. **The sign-off gate is skipped.** LOCATE still happens; the plan goes in each PR body.
2. **Issues the plan needs are filed without confirmation**, with `/issue`'s templates.
3. **Pushing branches and opening PRs is authorized. Merging is the human's, always.**

---

## 1. Propose — shown in chat, nothing created until approved

Write `.lane/overnight-<date>/proposal.md` in the main checkout:

- **What's actually there:** open issues labelled `ready` (or the theme's), honestly counted.
- **Lanes:** one lane = one theme = one branch = one PR, whose issues are **file-disjoint** from
  every other lane's. Group wherever possible: 5 PRs closing 30 issues beats 30 PRs. 3–6 lanes is a
  night. **Name lanes in plain English** ("Empty states that tell you what to do"): the human reads
  them at 1am on a phone.
- **Collision points** that survive grouping: the file, which lane owns it, who rebases second.
- Three short tables: **Second shift** (bench work for when a lane frees up) · **Needs you**
  (written as decisions, never asked tonight) · **Excluded** (anything needing a migration
  decision, a production secret, a `.github/workflows/` change, or a product call).

Then wait for **one approval line**, e.g. *"go — all five lanes."* Nothing is created before it.
On approval, open the shift's record: an issue `Night shift — <date>` labelled `shift`, carrying
the proposal. The decision log and morning report go there too.

### A named epic: `/overnight <epic#>`

Naming an epic is the go-ahead for all of it: scoping, filing its sub-issues, building them.
**There is no approval line to wait for.** Check each number is an open issue labelled `epic`; run
`/work`'s Epic-mode scoping (step 1) as the agent picking it up; file the sub-issues the plan needs;
post the proposal on the epic itself, which becomes the shift's record; go to Preflight. Still
parked, onto *Needs you*: any step the epic leaves to a person (a credential, a customer sign-off,
a ruling the epic says is owed).

## 2. Preflight

```bash
caffeinate -dims &          # macOS: the machine must not sleep at 2am
gh auth status              # repo scope; never `workflow`
git fetch origin
```

The orchestrator, not the lane, builds each lane's ground, all from one `origin/main` SHA:

```bash
WT=../<repo>-worktrees/lane-<slug>
git worktree add "$WT" -b lane/<slug> origin/main \
  && cd "$WT" && pnpm install --prefer-offline && mkdir -p .lane \
  && cp <main checkout>/.env.local .     # if the app needs it; it's gitignored
```

**Never `cd $_` in that chain:** `$_` is the previous command's last argument (`origin/main`), the
chain short-circuits, and every lane launches without `node_modules`.

## 3. The brief — what makes N teams behave like one shift

`.lane/overnight-<date>/brief.md` in the main checkout: the standing brief verbatim, the three
overrides, each lane's worktree, branch, base SHA and owned files, the collision points, the
straggler policy, and the never-list. Lane prompts give its **absolute** path: lanes run in their
own worktrees, where a relative path resolves somewhere else.

**Straggler policy.** *A lane that ships 8 of 9 tonight beats one that ships 0 of 9 perfectly.* An
issue that turns out bigger than the night (a schema fork, a product decision, a dead external API)
drops from the PR's `Closes`, gets a plain-English comment saying why, and moves to **Deferred**.
One already fixed on `main`: verify, comment the evidence, close it.

**Never:** push `main` · merge · deploy · run a migration against production · edit
`.github/workflows/` · `git add -A` · raise a timeout or weaken a test to get green.

## 4. Launch

One named background sub-agent per lane, in a **single message** with several `Agent` calls
(`name: "lane-<slug>"`), so lanes run concurrently and corrections can reach them by name via
`SendMessage`. At most five lanes at once; each lane runs at most three builders (`agent-team`).
Lanes report through `<worktree>/.lane/lane-report.md`, read from disk.

## 5. Drive it — the orchestrator never goes idle

| Situation | Do this |
|---|---|
| Ambiguous acceptance criteria | Build the reading that fits the product; state the assumption in the PR body |
| An issue is bigger than the night | Drop it from `Closes`, comment why, list it under **Deferred** |
| Already fixed on `main` | Verify, comment the evidence, close it |
| A lane's approach turns out wrong | Change it, log it, keep going |
| A design or naming call with no obvious answer | Pick the best one, say so in the PR body |
| A shared defect one lane finds (a flaky test, a tooling trap) | `SendMessage` it to every lane now, amend the brief with a dated **CORRECTED** note |
| Two lanes need one file | Its owner in the brief keeps it; the other rebases after and re-gates |
| A lane finishes | Start the next *Second shift* item in its place |
| A usage limit | The shift resumes when the window resets; lanes keep their state in git and `.lane/` |

Log every decision as it's made to `.lane/overnight-<date>/decisions.md` and post the log to the
shift's record. **Watch results, not chatter:** gate verdicts, PRs opening, CI on pushed SHAs.

**The shift does not stop.** Bounded is scope, never effort: a lane that can't get one issue green
parks that issue and ships the rest. An exhausted approach gets a fresh diagnosis and a fresh agent,
never banked as a loss. **Never fabricate green:** a PR is green when CI is green on the pushed SHA.

## 6. Integration proof — before the human gets a merge list

Five PRs green against one base aren't a mergeable set: each was gated against `main`, not against
its siblings. Once all are green: a throwaway branch off `origin/main`, every lane branch merged in
the proposed order, **one `pnpm gate`** on the result. Fix any conflict or red **on the owning
lane's branch**, never the throwaway (delete it after). The merge order is now a tested claim.

## 7. Morning report

Posted on the shift's record, and the same in chat with the footer:

```
## Morning report — <date>
**Shipped, in merge order** — PR #<n> <lane name> · CI green · closes #a #b #c · preview <verified url>
**Deferred** — #<n> <plain English: why, and what unblocks it>
**Decisions I took for you** — <one line each> (full log on the record)
**Needs you** — <as decisions, not questions>
**Still running** — <lane, what it's on, when it lands>
```

Plain English up top; anyone on the team should follow it. Every link real and verified. A red lane
at the top beats a green one buried.

## Anti-patterns

- ❌ Launching lanes before their worktrees, installs and the brief exist.
- ❌ Two lanes sharing a file, a temp path or a port.
- ❌ A red PR, a `<preview>` placeholder, or an un-narrated issue left for the morning.
- ❌ Asking a question after launch: decide, log it, put it under *Needs you*.
