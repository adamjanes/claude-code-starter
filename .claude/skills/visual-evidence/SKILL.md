---
name: visual-evidence
description: Screenshot proof for any user-visible change — one fixed table (Issue | What changed | Before | After) in every PR, captured with `pnpm before-after` from main and the preview, every image read against the acceptance criteria, uploaded, and posted on the issue too. CI enforces the table. Load whenever a change touches something a user can see.
user-invocable: false
---

# visual-evidence — the reviewer sees the result without booting anything

**The contract:** every issue whose acceptance criteria describe something a user can *see* ships
with **a verified before and after**, in the same table in every PR, so anyone can see what changed
without booting anything. "Tests pass" is not evidence for a visual change.

Back-end, infra or test-only issues still get a row, saying so:
`| #4 | no visual surface: <what proves it> | — | — |`.

## The table — identical in every PR

One row per closed issue, always these four columns, in this order:

```markdown
## Visual evidence
| Issue | What changed | Before | After |
|---|---|---|---|
| #2 | Overdue tasks say how late they are | ![before](…/2-overdue-before.png) | ![after](…/2-overdue-after.png) |
| #3 | Done tasks sink below a "Done" divider | ![before](…/3-done-before.png) | ![after](…/3-done-after.png) |
| #4 | no visual surface: date parsing, proven by tasks.test.ts | — | — |
```

- **Before** is `main` today; **After** is this branch's preview. Same URL path, same viewport,
  same element, so the only difference between the two images is the change.
- **What changed** is one plain line a non-coder can check against the two images.
- A new screen has no before: `new screen` in the Before cell, never an empty one.
- Every `Closes #<n>` gets a row. `pr-guards.yml` fails a UI PR whose section lacks this exact header.

## 1. Capture — both sides with one command

Push the branch (the preview builds on push, no PR needed), then:

```bash
pnpm before-after --issue 2 --name overdue \
  --before https://<main deployment>/ --after https://<this branch's preview>/ \
  --selector '[aria-label="Tasks"]' --upload
```

It shoots both URLs headless at 1440×900 (just the `--selector` element when given) into
`.lane/2-overdue-{before,after}.png`, uploads both with `--upload`, and prints the table row with
`<what changed>` left for you to fill. Without `--upload` the cells hold the local paths, for a
look before anything is published.

- One row per issue; when an issue has two surfaces, two rows with the same issue number.
- Files in `<worktree>/.lane/`, never committed.
- **Protected previews:** set `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel → Settings → Deployment
  Protection → Protection Bypass for Automation) and the capture sends it. It fails rather than
  capture a login wall: a bounced session looks the same whether the fix is there or not.
- A single shot outside the table: `pnpm capture <url> <out.png>`.

## 2. Verify — what makes a screenshot evidence

**Read every image** against the acceptance criteria, one by one:

- Does the after image *demonstrably show* the criterion met, and the before image show it unmet?
  A blank page, a login wall, an error, or a pair that looks identical is a **capture failure**:
  recapture, don't attach.
- **Could this image exist if the feature were broken?** "The page rendered" passes on a broken
  build too. Frame the element only the changed code path draws.
- One line per criterion: shown, or *cannot be shown visually* plus the non-visual proof.

## 3. Upload and attach to the issue

`--upload` (or `pnpm evidence <image> issue-<n> <short-name>` for a single file) stores each image
at an immutable URL. A public repo uses its own `evidence` branch. A **private** repo needs
`EVIDENCE_REPO=<owner>/<public-assets-repo>`: GitHub can't render a private repo's raw image URLs in
issues. Files are never overwritten; a retake gets `-2`.

The issue's "ready to test" comment carries that issue's own row of the table, under the same
header, so the issue thread shows the change without opening the PR.

## 4. Aggregate on the PR

The PR body's `## Visual evidence` section is the table above, every issue's row together.

Never screenshot the code, the diff or DevTools: evidence is the rendered surface.
