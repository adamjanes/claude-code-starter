---
description: Build a live design page with 2–3 clickable options on the real app, so you can pick a design before /work builds it
argument-hint: <issue#> | "<description>"
model: opus
---

# /mockup — build a design page, get a decision

Front door for the `design-pages` skill (`.claude/skills/design-pages/SKILL.md`): read it in full
and follow it exactly. It is authoritative and not restated here.

Usage: `/mockup 12` (the design for issue #12; its acceptance criteria are the brief) ·
`/mockup "what a new user sees with zero tasks"` (no issue yet: build it, then offer `/issue`)

**Input:** `$ARGUMENTS`

The shape of a run: research and explore privately → build 2–3 real options on branch
`design/<slug>` → push (the preview builds) → screenshot and critique every option yourself →
post the options, screenshots and at most two questions on the issue → stop for the human's pick.
No sign-off is asked before building: the human judges options on the live page.

**Handback footer** from the moment the design branch exists: the preview link, the issue link,
what the last action did.
