# Setup

About 15 minutes from "Use this template" to your first `/work`.

## Prerequisites

| Tool | Why | Check |
|---|---|---|
| [Claude Code](https://code.claude.com) | runs the commands | `claude --version` |
| [GitHub CLI](https://cli.github.com), signed in | issues, PRs, CI | `gh auth status` |
| Node 24 + pnpm 11 | the app and the scripts | `node -v && pnpm -v` (`corepack enable` gets pnpm) |
| git 2.38+ | `pnpm gate` merges in memory with `git merge-tree` | `git --version` |
| A Vercel account *(optional)* | previews to review and screenshot | — |

## 1. Make your copy

On GitHub: **Use this template → Create a new repository**. Then:

```bash
gh repo clone <you>/<your-repo> && cd <your-repo>
pnpm install
pnpm check          # lint, typecheck, unit tests: should be green out of the box
```

## 2. Set up GitHub

```bash
bash scripts/setup-github.sh
```

It prints exactly what it will do (labels `story`, `bug`, `epic`, `ready`, `shift`, `no-issue`;
branch protection on `main` with the two required checks; delete merged branches) and changes
nothing until you answer `y`. It also prints the undo command. Branch protection on a private repo
needs GitHub Pro, Team or Enterprise; the rest works anywhere.

Then push anything to a branch and check **Actions**: `CI` should run green.

## 3. Previews (Vercel)

Import the repo in Vercel; the defaults work (`vercel.json` sets the install command and skips
`gate/**` branches). Every branch you push now gets a preview, and `pr-preview-link.yml` pins its URL
at the top of each PR.

Vercel protects previews by default. For screenshots (`pnpm capture`), create a
**Protection Bypass for Automation** secret (Project → Settings → Deployment Protection) and put it
in your shell:

```bash
export VERCEL_AUTOMATION_BYPASS_SECRET=…    # e.g. in ~/.zshrc; never in the repo
```

Not on Vercel? See [github-actions.md → Previews](github-actions.md#previews).

## 4. Screenshots for issues and PRs

`pnpm evidence <image> <issue-12|pr-34|design-slug> <name>` uploads a screenshot and prints the
markdown to embed.

- **Public repo:** nothing to do. Images go to an `evidence` branch of the repo itself.
- **Private repo:** GitHub won't render a private repo's raw image URLs in issues, so create a
  public assets repo with an unguessable name and point at it:
  ```bash
  gh repo create <you>/<your-repo>-evidence-7f3k --public --add-readme
  export EVIDENCE_REPO=<you>/<your-repo>-evidence-7f3k
  ```

## 5. Fill in CLAUDE.md

The **Project facts** block at the top: what the product is, who decides, the stack, the commands.
Leave the rest alone until you've run a few issues through; then change what didn't fit.

## 6. First run

```bash
claude
```

```
> /issue "the Done tab should show completed tasks newest first"
> /work <the issue number>
```

## Trust settings

`.claude/settings.json` pre-approves the read-only and project commands the lanes use all the time
(`pnpm check`, `pnpm gate`, `gh pr view`, …) and **denies `gh pr merge`**. Everything else asks.
For unattended `/overnight` shifts, run Claude Code in a mode that doesn't stop for prompts (for
example auto mode). The deny rule and the `guard-bash.mjs` hook still apply: they're the seatbelt
that makes leaving it alone reasonable.
