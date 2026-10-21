# The workflow, end to end

One issue, followed from a sentence to production. Every command below is typed into Claude Code
from the repo's root checkout; everything that edits code happens in a worktree beside it.

## 1. `/issue` — a sentence becomes a contract

```
> /issue "on wide cards the thumbnail stretches — it should keep its aspect ratio"
```

Claude searches open issues for a duplicate, then shows a draft:

```
Keep thumbnails square on wide cards                                    [bug]

**Who asked:** Sam, call on 14 Oct
## What happens        The thumbnail fills the card's width and distorts.
## What should happen  It keeps its aspect ratio and is centred.
## Steps to reproduce  1. Open /tasks on a 1440px window …
## Acceptance criteria
- [ ] On a 1440px window, a 4:3 image on a task card renders 4:3.
- [ ] Narrow cards are unchanged.
```

You reply `file it` and it becomes **#12**. The acceptance criteria are what everything after this
is checked against, so they're written to be checkable by someone who didn't build it.

## 2. `/work 12` — the one stop

Claude reads #12, comments "work started" on it in plain English, cuts
`../<repo>-worktrees/issue-12-keep-thumbnails-square` off a fresh `origin/main`, and fans out
read-only agents to find the cause. Then it stops, once:

```
Issue #12 Keep thumbnails square on wide cards · base main @ 4f2a9c1 · branch issue/12-keep-thumbnails-square

Found: the card sets the image to width:100% with a fixed height, so wide cards stretch it.
Change: object-fit: cover inside a 4:3 frame; narrow cards keep today's size.
Tested at: <TaskCard> rendered with a 4:3 image at 1440px → the frame is 4:3 (component test, red first).
Decisions: none. ~2 files.

Go?
```

You reply `go`. That's the last thing it asks.

What happens next, unattended:

1. **Build.** One builder sub-agent per file-disjoint unit (`agent-team`); the failing test first
   (`tdd`). The orchestrator reads the actual diff, not the agents' reports.
2. **Gate.** `pnpm gate` pushes the worktree, merged onto `main`, to `gate/issue-12-…` and waits
   for GitHub Actions. Red that isn't environmental gets fixed and gated again.
3. **Evidence.** It pushes the branch, waits for the preview, screenshots the card before (on
   `main`) and after (on the preview), reads every image against the acceptance criteria, and
   uploads them.
4. **Review.** `pnpm review` runs a fresh, read-only Claude session over the committed diff. Each
   finding is fixed, refuted in writing, or deferred.
5. **PR.** It opens the PR with a bare `Closes #12`, the plan, the run log, each criterion met or
   flagged, the gate run, the review verdict, the screenshots, and try-it steps:
   ```
   ## Try it on the preview  (~1 min)
   1. Open https://app-git-issue-12-acme.vercel.app/tasks at 1440px → the "Q4 plan" card's image is 4:3, not stretched.
   2. Narrow the window to 600px → the card looks as it does on main.
   ```
6. **CI green on the pushed SHA**, preview URL resolved, then a "ready to test" comment on #12 with
   the links, the steps and the screenshots.

Every message from the first branch onwards ends with the footer:

```
---
🔗 **PR [#41](…)** · preview https://app-git-issue-12-acme.vercel.app · issue [#12](…)
**Session:** `/work #12` — thumbnails keep their aspect ratio on wide cards. Gate green, review SHIP.
**Just did:** opened the PR and posted "ready to test" on #12. **Next:** you try the preview and merge.
```

## 3. `/qa 41` — feedback goes to the same PR

You open the preview and notice the image is now cropped too hard on tall photos.

```
> /qa 41 "tall photos lose their top — crop from the top, not the centre"
```

Claude posts a QA-record comment on PR #41 (your words verbatim, its reading, what it will change)
**before touching code**, fixes it on the same branch in a worktree, gates it, reviews it, pushes,
and replies with what changed and 1–3 re-test steps. The PR and its preview update in place. Repeat
until it's right.

## 4. You merge

The only step an agent never takes. On merge, `main` deploys, GitHub closes #12, and
`gate-cleanup.yml` deletes the gate branch.

---

## When the layout is the question: `/mockup` first

```
> /mockup 15
```

Claude studies the issue and the screen today, sketches five or six approaches privately, keeps two
or three that differ in kind, and builds them as a **design page**: a route under
`app/(design)/design/<slug>/` that renders the real app on sample data, with tabs for each option
and each state (empty, saving, error, done). It pushes `design/<slug>`, screenshots every option on
the preview, critiques them, and posts the options with screenshots and at most two questions on
#15. You click through and pick. On approval it cuts the page down to the winner and adds
`**Branch:** design/<slug>` to the issue, so `/work 15` starts from it. The shipping PR deletes the
design page.

Try the example in this repo: `pnpm dev`, then open http://localhost:3000/design/first-run.

## When it's bigger than one PR: epics

An issue labelled `epic` holds one outcome. `/work <epic#>` scopes it into sub-issues, shows the
plan and the proposed sub-issues at its one gate, files them under the epic after you say go, and
builds them all on one branch as **one PR** closing every sub-issue, narrating on each.

## When you're asleep: `/overnight`

Label the issues you'd be happy to see done tomorrow `ready`, then:

```
> /overnight
```

Claude reads them, groups them into 3–6 file-disjoint lanes named in plain English, and shows the
plan: lanes, collision points, what it would park for you, what it's excluding. You approve with
one line. From then on it doesn't ask: one background agent team per lane, each running `/work`'s
steps without the sign-off, every decision logged on a `shift` issue. Before it hands you a merge
list it merges every lane together on a throwaway branch and gates the result, so the merge order is
tested. In the morning there's one report: what shipped (in merge order, with previews), what was
deferred and why, the decisions it took for you, what needs you.

`/overnight <epic#>` does the same for one named epic, with no approval stop at all: naming it is
the go-ahead.

## Where things live during a run

| What | Where |
|---|---|
| The plan, run log, review verdict | the PR body (durable) |
| Progress a non-coder can follow | the issue thread |
| Scratch: drafts, agent reports, screenshots, PR bodies | `<worktree>/.lane/` (gitignored) |
| The gate's verdict | `.lane/gate-verdict.json` and the Actions run |
| Screenshots, permanently | the `evidence` branch (public repo) or `EVIDENCE_REPO` |
