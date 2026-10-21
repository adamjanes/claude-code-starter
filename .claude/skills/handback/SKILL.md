---
name: handback
description: The three-line footer that ends every message once a session has made something durable (an issue, branch, PR, preview or file). Used by /issue, /work, /qa, /mockup and /overnight, and by any ad-hoc run that creates one.
user-invocable: false
---

# handback — the footer on every message

**The contract:** once a session creates something durable (an issue, a branch, a PR, a preview,
a published page, a file deliverable), **every** message from then on ends with this footer. People
run several sessions at once and flip between them; the newest message alone must be enough to
re-sync, with no scrolling back.

```
---
🔗 **PR [#41](https://github.com/acme/app/pull/41)** · preview https://app-git-issue-12-acme.vercel.app · issue [#12](https://github.com/acme/app/issues/12)
**Session:** `/work #12` — thumbnails keep their aspect ratio on wide cards. Gate green, review SHIP.
**Just did:** pushed the review fix `c530914`; CI re-running (2/3 green). **Next:** you check the preview and merge.
```

- **Line 1 — the links.** Everything durable this session made, newest first, as real clickable
  URLs. At most four; drop the oldest rather than wrap.
- **Line 2 — the session.** What it set out to do and where it stands, one plain sentence. Changes rarely.
- **Line 3 — the last action.** What the most recent turn actually did, concretely; optionally
  **Next:** and the one thing that happens next, especially if it's the human's.

## Rules

1. **Every message, not just the last** — progress, questions, failures. Short ones too: "done"
   and "CI green" are the messages people flip back to most.
2. **Real, verified URLs only.** Never a `<preview>` placeholder or a guessed hostname. Not up yet →
   `preview: building`, swapped in once it responds.
3. **Links appear the moment they exist** — the issue on filing, the PR when `gh pr create` returns.
4. **Nothing durable yet → no footer.** The trigger is creation, never a phase of the lane.
5. **Three lines, always current.** "Just did" is rewritten every message; a stale repeat reads as
   "nothing moved". It is a bookmark, never a substitute for the full report above it.
6. **Failures get it too** — `**Just did:** gate red, 2 failures in tasks.test.ts, diagnosing.`
