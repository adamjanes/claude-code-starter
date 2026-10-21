---
name: visual-evidence
description: Screenshot proof for any user-visible change — capture on the preview with Playwright, read every image against the acceptance criteria, upload, embed on the issue, aggregate in the PR's Visual evidence section (CI enforces it). Load whenever a change touches something a user can see.
user-invocable: false
---

# visual-evidence — the reviewer sees the result without booting anything

**The contract:** every issue whose acceptance criteria describe something a user can *see* ships
with **verified screenshots** on its issue thread, and the PR body carries a `## Visual evidence`
section aggregating them. "Tests pass" is not evidence for a visual change. `pr-guards.yml` fails a
PR that touches UI paths without the section.

Not required for back-end, infra or test-only changes: say so instead —
`no visual surface — verified by <suite>`.

## 1. Capture — on the preview, headless

Push the branch (the preview builds on push, no PR needed), then capture the **preview**: the
exact build that will ship, nothing booted locally.

```bash
pnpm capture <preview-url>/tasks .lane/12-tasks-after.png              # 1440×900
pnpm capture https://<main's deployment>/tasks .lane/12-tasks-before.png # before/after when fixing
```

- One shot per acceptance criterion where feasible; at least one per issue.
- Files in `<worktree>/.lane/`, named `<issue>-<slug>-{before,after}[-N].png`, never committed.
- **Protected previews:** set `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel → Settings → Deployment
  Protection → Protection Bypass for Automation) and `scripts/capture.mjs` sends it. The script
  fails rather than capture a login wall: a bounced session looks the same whether the fix is
  there or not.

## 2. Verify — what makes a screenshot evidence

**Read every image** against the acceptance criteria, one by one:

- Does it *demonstrably show* the criterion met? A blank page, a login wall, an error, or a shot
  that doesn't exercise the change is a **capture failure**: recapture, don't attach.
- **Could this image exist if the feature were broken?** "The page rendered" passes on a broken
  build too. Capture a value only the changed code path could produce, and its control.
- One line per criterion: shown, or *cannot be shown visually* plus the non-visual proof.

## 3. Upload and attach to the issue

```bash
pnpm evidence .lane/12-tasks-after.png issue-12 tasks-after
```

Prints an immutable raw URL and the markdown to embed. A public repo stores screenshots on its own
`evidence` branch. A **private** repo needs `EVIDENCE_REPO=<owner>/<public-assets-repo>`: GitHub
can't render a private repo's raw image URLs in issues. Files are never overwritten; a retake gets
`-2`. Embed the shots, captioned, in the issue's "ready to test" comment.

## 4. Aggregate on the PR

```markdown
## Visual evidence
| Issue | Shows | Evidence |
|-------|-------|----------|
| #12 | summary counts, before/after | ![](…/12-tasks-before.png) ![](…/12-tasks-after.png) |
| #13 | no visual surface — date parsing, proven by tasks.test.ts | — |
```

Every `Closes #<n>` gets a row, with evidence or an explicit "no visual surface" reason.

Never screenshot the code, the diff or DevTools: evidence is the rendered surface.
