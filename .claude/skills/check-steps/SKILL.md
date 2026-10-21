---
name: check-steps
description: The "Try it on the preview" steps a PR and its "ready to test" comment carry — exact URL, exact action, what you should see — and the two-phase rule for the preview URL. Load when writing a PR body, a ready-to-test comment, or QA re-test steps.
user-invocable: false
---

# check-steps — how the human checks it in two minutes

**The contract:** the reviewer should be able to verify a PR from its body alone, on its preview,
without asking anyone what to click.

## The step contract

Every step is **where** (exact URL) → **what to do** (exact action) → **what you should see** (a pass
condition naming concrete values). No pass condition, no step.

```markdown
## Try it on the preview  (~2 min)
1. Open https://app-git-issue-12-acme.vercel.app/ → the summary reads **3 open · 1 done · 1 overdue**.
2. Open https://app-git-issue-12-acme.vercel.app/?empty=1 → you see **Add your first task**, and no counts.
3. Control: https://app-acme.vercel.app/ (main) still shows the old summary line.
```

- Derive steps from the issue's **acceptance criteria** plus the **diff actually changed**; every
  criterion maps to a step.
- Happy path first, then the edge or failure path the diff touched, with its message spelled out.
- One **control**: the same page on `main`, so "it looks different" is provable.
- App paths come from the code (`find app -name 'page.tsx'`), never memory. **Verify every URL**
  responds before it reaches the human (`curl -sI`): a 307 to a sign-in page proves nothing.
- For a visual change, the pass condition points at the PR's Visual evidence screenshots.

## The two-phase preview URL

The preview doesn't exist when the PR is created.

1. **At PR creation**, write the steps against a literal `<preview>` placeholder
   (`<preview>/tasks`), with a note that the link attaches once the preview builds.
2. **Once CI is green and the preview responds**, substitute the real URL (pinned at the top of
   the PR body by `pr-preview-link.yml`, or from the Vercel bot comment), write
   `.lane/pr-body-resolved.md`, and re-read it in the same call that updates the PR:
   `head -3 .lane/pr-body-resolved.md && gh pr edit <n> --body-file .lane/pr-body-resolved.md`.
3. The issue's "ready to test" comment posts after, with the resolved URL.

A `<preview>` placeholder never survives to review, and an unchecked URL is never handed over.
