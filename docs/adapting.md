# Adapting it to your stack

The process (`.claude/`, `CLAUDE.md`, the workflows) is stack-agnostic. The demo app is Next.js
because previews and design pages need *something* that renders. These are the touch points when
your project is different, roughly in the order you'll meet them.

| Touch point | Where | What to change |
|---|---|---|
| **The gate's suite** | `.github/workflows/ci.yml`, job `gate` | Your install, lint, typecheck, test, build and e2e steps. Whatever runs here *is* "the full suite". Keep the job name, or update the required check in `scripts/setup-github.sh`. |
| **Custom lint rules** | `eslint-rules/` | Keep the comment rules; add one whenever a review comment repeats itself. A rule is cheaper than a reminder. |
| **Convention tests** | `tests/unit/conventions/` | House rules as tests (tokens only, where secrets may live). Each fails naming the file and line. |
| **The fast loop** | `package.json` → `check` | Lint + typecheck + unit tests, under a minute. Python: `ruff check && mypy . && pytest -q`. |
| **Script entry points** | `package.json` | `pnpm gate`, `pnpm review`, `pnpm capture`, `pnpm evidence` are Node scripts. Not a Node project? Keep a tiny `package.json` for them, or call `node scripts/gate.mjs` directly and update the commands' text. |
| **Project facts** | `CLAUDE.md`, top block | Product, decision-maker, stack, commands, preview host. |
| **UI paths** | `pr-guards.yml` → `UI_PATHS` | The folders whose changes need screenshots (`src/components/`, `templates/`). |
| **Migrations** | `pr-guards.yml` → `MIGRATIONS_PATH` | Your migrations folder (`alembic/versions/`, `prisma/migrations/`). |
| **Previews** | `pr-preview-link.yml`, `vercel.json` | Another host: change the bot login and URL parsing, and skip `gate/**` branches in its build settings. |
| **Design pages** | `app/(design)/`, `components/design/` | The host is ~80 lines of React. Elsewhere, any route that renders real screens with `?variant=&state=` tabs and the same `data-*` attributes keeps `pnpm design:capture` working. |
| **Test rules** | `.claude/skills/tdd/SKILL.md` | Name your seams (routes, handlers, components) and what may be faked in your stack. |
| **Model choices** | `CLAUDE.md` → Models, `model:` in each command | Opus for orchestration, design and review; Sonnet for builders. |

## Growing it

Worth adding once the basics hold:

- **A request inbox before issues.** Asks from anyone but the decision-maker land in a separate
  `Requests` repo; only the decision-maker promotes one into planned work. Keeps the engineering
  backlog to things someone decided to do.
- **Boards.** A sprint board of epics for planning, an engineering board of agent-sized issues.
  The commands move cards as best-effort side effects; the issue thread stays the record.
- **A workflow mirror.** Agents propose CI changes in `.github/workflows-src/`; a GitHub App
  installs them after merge, so agent tokens never need `workflow` scope.
- **CI on your own machines**, with one runner per heavy resource so parallel runs never share a
  database (see [github-actions.md → Running CI on your own machine](github-actions.md#running-ci-on-your-own-machine)).
- **A lane map.** `pnpm lanes` reads git to show which open branches and worktrees touch the files
  you're about to edit, before you cut a branch.
- **Domain-specific review evidence.** The local reviewer reads a scored corpus of real inputs
  alongside the diff, because fixtures can't see the case they weren't chosen for.
