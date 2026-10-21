---
description: Turn a description (or this conversation) into a GitHub issue with testable acceptance criteria — draft, one confirmation, file
argument-hint: "<description>" | sub <epic#> "<description>"
model: sonnet
---

# /issue — describe it, get a well-formed issue

Usage: `/issue "thumbnails stretch on wide cards"` · `/issue sub <epic#> "<description>"` (filed as a
sub-issue of that epic) · `/issue` (describe it in chat first)

**Input:** `$ARGUMENTS`

An issue is the unit of work: `/work <n>` builds exactly one, and its **acceptance criteria are
the contract** the PR is verified against. So the job here is to make them testable by someone who
didn't build it, on the preview.

## Ground rules

- **Draft in chat first; file only after one confirmation.** Show the exact title and body; the
  human tweaks in one line. No revision loops. (`/work <epic#>` and `/overnight` file without this
  confirmation: their own gate covers it.)
- Classify: **story** (new or better) or **bug** (broken). An outcome too big for one PR is an
  **epic**: its pieces become sub-issues when `/work <epic#>` picks it up, never listed up front.
- **Mine the conversation first**: names, URLs, error text, screenshots, who asked. Ask only for
  what's missing.
- The top half reads to a non-coder. Code pointers go in Context.

## Templates (mirror `.github/ISSUE_TEMPLATE/` — keep them in sync)

**Story** (`--label story`):

```markdown
**Who asked:** <person>, <for whom>, <call or date>

## User story
As a <role>, I want <capability>, so that <benefit>.

## Acceptance criteria
- [ ] <testable outcome — checkable on the preview by someone who didn't build it>

## Expected behaviour
<screenshots, mockups, a design page link>

## Context
<background, code pointers, related issues and PRs>

## Out of scope
<explicit non-goals that keep the change small>
```

**Bug** (`--label bug`): `**Who asked:**`, then `## What happens` (with screenshots) ·
`## What should happen` · `## Steps to reproduce` · `## Evidence` (console errors, logs) ·
`## Suspected area`.

**Epic** (`--label epic`): `## Outcome` · `## Acceptance criteria` ·
`## For the agent picking this up` (where the code lives, constraints, decisions already made, a
`**Branch:** design/<slug>` line if a design page settled the layout) · `## Out of scope`.

## Procedure

0. **Duplicate check:** `gh issue list --state open --search "<2–3 keywords>" --json number,title,url`.
   Same root cause → the draft becomes a comment on that issue instead.
1. **Draft** from the template. Title: a short imperative ("Keep thumbnails square on wide cards",
   not "Thumbnails are broken").
2. **Confirm** with the human, once.
3. **File** (body to `.lane/issue.md`, `mkdir -p .lane` first; never an inline `--body "…"`):
   ```bash
   head -3 .lane/issue.md && gh issue create --title "<title>" --label <story|bug|epic> --body-file .lane/issue.md
   ```
4. **Sub-issue of an epic** (`/issue sub <epic#>`): check the epic is open and labelled `epic`, then
   link it natively (the id is the database id, not the number):
   ```bash
   ID=$(gh api repos/{owner}/{repo}/issues/<child#> --jq .id)
   [ -n "$ID" ] && gh api -X POST repos/{owner}/{repo}/issues/<epic#>/sub_issues -F sub_issue_id="$ID"
   ```
5. **Screenshots** the issue should carry: `pnpm evidence <file> issue-<n> <short-name>` (the
   `visual-evidence` skill), never a drag-and-drop link.
6. **Report** the issue URL, and from here on the `handback` footer. To queue it for an
   unattended night, add the `ready` label (`gh issue edit <n> --add-label ready`): `/overnight` only
   picks up `ready` issues.

## Anti-patterns

- ❌ Acceptance criteria nobody can check ("works well", "is faster") — say what you'd see.
- ❌ Filing without the duplicate search.
- ❌ A hand-maintained checklist of sub-issues in an epic body: the native sub-issue link tracks them.
