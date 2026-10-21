---
name: design-pages
description: /mockup's build-to-decision flow — a throwaway route under app/(design)/design/<slug>/ that renders the real app with 2–3 clickable options on sample data, on a live preview, so the human picks a design before /work builds it. Load for /mockup, and when /work starts from a design/<slug> branch.
user-invocable: false
---

# design-pages — decide on a live page, not a picture

**The contract:** a design page is a throwaway route that renders **real components** against made-up
data, offers **2–3 genuinely different options** to click between, and is deleted (its chosen pieces
promoted into real code) by the PR that ships the feature. The decision happens on a live,
on-brand preview, never a static image or an ASCII sketch.

**When:** a new screen or flow with real layout uncertainty. Not a copy tweak, not a settings toggle.

## 1. Design it — the work that matters

**The session model designs.** Whoever decides the options writes them; a cheaper helper may do
scaffolding (sample data, the registry entry, the test), never the options. Building is
expensive, so the divergence happens in your notes first:

1. **Research** the issue, the screen's code today, how this app already solves the same problem
   elsewhere, and how strong products handle it (Linear, Notion, Figma, Stripe).
2. **The journey before any screen:** who, where they start, each step, where they end, what
   they're trying to get done. A flow that serves two jobs is two flows.
3. **Explore wide, privately:** 5–6 concepts that differ in *approach*, not position: inline vs a
   dedicated step; ask first vs do and offer undo; one dense table vs a guided sequence. Moving a
   button is a detail inside a concept, never a concept.
4. **Keep 2–3.** At least one rethinks the flow rather than adjusting today's screen. Each gets a
   label (`A · Blank slate`) and a one-line `caption` naming its trade-off.
5. **Every state:** empty, saving, error, the open menu or dialog, the result after the action.
6. **Answer product questions yourself.** Pick the answer you'd defend and draw it. Ask before
   building only if the answer changes which options are worth building.

**The quality bar** — every option is something a designer at Linear would ship:
the one thing the user came to do is the most prominent thing on screen; one grid, consistent
spacing; the right control for the data; consistent with the screens around it; calm (no borders,
badges or colours that carry no meaning); **show, don't explain** (no sentence on screen that
describes the screen).

## 2. Build

Branch `design/<slug>` in its own worktree off `origin/main`:

```bash
git fetch origin
git worktree add ../<repo>-worktrees/design-<slug> -b design/<slug> origin/main
```

The layout (the worked example is `app/(design)/design/first-run/`):

```
app/(design)/design/<slug>/
  page.tsx          # reads searchParams, renders <DesignHost design={build<Slug>Design()} variant=… state=… />
  design.tsx        # export function build<Slug>Design(action = fake…): Design
  meta.ts           # export const <SLUG>_DESIGN_META = { slug, title, summary } as const
  fake-actions.ts   # every server action the options call, faked
  parts/            # new UI a single option needs, while choosing
tests/unit/design-<slug>.test.tsx
```

Register the meta in `app/(design)/design/registry.ts`; `/design` lists every entry.

**The host** (`components/design/`): a `Design` is `{ slug, title, states, variants, picture, frame? }`.
Each **variant** is `{ id: 'a', label: 'A · …', caption, render(stateId) }`; each **state** is
`{ id, label }`. `<DesignHost>` is server-rendered: option and state tabs are links
(`?variant=<id>&state=<id>`), the caption is the tab's tooltip (never page text), and an unknown or
missing selection falls back to `picture`. `frame: 'app'` (the default) wraps every screen in the
real `AppShell`; `'bare'` lets a screen draw its own chrome. The root carries `data-design`,
`data-picture-variant` and `data-picture-state`; tabs carry `data-variant` / `data-state`; the
stage carries `data-design-stage`. `pnpm design:capture` reads exactly those.

**Rules:**

- **Model the whole page.** Every screen is the real page the feature lives on, its chrome and
  surrounding content included, on sample data. Never a lone component on an empty canvas.
- **Real components around it; cheap pieces while choosing.** New UI one option needs lives in
  `parts/`, so an option costs little to try. Approval promotes the chosen option's parts.
- **Sample data is typed from the real types** (`lib/tasks.ts`), never `any`, with plausible values.
- **Every server action is an injected fake** — async, waits ~800ms, returns the same shape a real
  success or failure would, never touches real data (`fakeAddTasks`). Never sign in, never read or
  write real data.
- **Set `picture`** to the screen and state that most needs the human's eyes, not the first one.
- **Tokens only.** No hex or `rgb()` literals in `app/(design)` or `components/design`:
  `tests/unit/conventions/design-tokens.test.ts` fails the build on one.

The test: `build<Slug>Design()` builds; every variant renders at every state
(`renderToStaticMarkup`); `picture` points at a real variant and state; the registry lists it; no
design file imports a real action or data module.

## 3. Check it, push it, look at it before the human does

```bash
pnpm check
git push -u origin design/<slug>      # no PR: the preview builds from the push alone
pnpm design:capture <slug> --base <preview url>     # → .lane/design-<slug>-<variant>.png
```

Read every option's screenshot, at the picture state and at each dialog or error state. Judge it as
a critic, not its author: what would the human call ugly or wrong? Fix, push, look again. If two
options look alike, one isn't an option: replace it. Hand over only options you'd defend.

## 4. Record it on the issue

`design:capture` prints the block to post:

```
**Design options:** https://app-git-design-first-run-acme.vercel.app/design/first-run?variant=a&state=empty  (A · B · C)
- **A · Blank slate**: One input and one button: the fastest first task, but the user starts from nothing.
- **B · Starter list**: Three suggested tasks to keep or dismiss: …
```

Upload the screenshots (`pnpm evidence <file> design-<slug> <variant>`, the `visual-evidence`
skill), and post the block with the images as a comment on the issue, plus **at most two** open
questions, each with your recommendation (the one you drew). Use the deployment's own URL, not the
branch alias: the alias moves on the next push. Then stop: the human answers on the issue or in chat.

**Iterating:** apply the feedback, push, capture, post again. Each ruling goes in the issue body
under `### Rulings`, one line each, in the human's words.

**Approval:** cut the page down to the chosen option: delete the other variants, move its `parts/`
into `components/`, apply the QA, set `picture`, push, capture once more. Then add
`**Branch:** design/<slug>` to the issue (or the epic's agent section), so `/work` starts from it.

## 5. `/work` consumes it

`/work` bases its worktree on `origin/design/<slug>`. Its PR deletes `app/(design)/design/<slug>/`,
its registry entry and its test, keeping the promoted components; after merge,
`git push origin --delete design/<slug>`.

## Anti-patterns

- ❌ Options that are the same screen with a control moved.
- ❌ Handing over options nobody screenshotted and critiqued.
- ❌ A list of product questions instead of answers drawn on the page (ask at most two).
- ❌ A component on an empty canvas, hand-copied CSS instead of real components, image generation.
- ❌ Real data, a real login, or a real server action left un-faked.
- ❌ Subtitles, helper paragraphs, or captions rendered on the page.
