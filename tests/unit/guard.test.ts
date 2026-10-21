import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { blockReason } from '../../.claude/hooks/guard-bash.mjs'

const HOOK = fileURLToPath(new URL('../../.claude/hooks/guard-bash.mjs', import.meta.url))

describe('the Bash guard stops what only a human may do', () => {
  it.each([
    'gh pr merge 12 --squash',
    'git push origin main',
    'git push origin HEAD:main',
    'git push origin +feature:refs/heads/main',
    'git -C ../wt push origin main',
    'cd ../wt && git push origin main',
    'FOO=1 git push origin master',
    'git push --force origin issue/12-fix',
    'git push -uf origin issue/12-fix',
    'git push --force-with-lease origin issue/12-fix',
    'git add -A',
    'git add .',
    'git commit -am "wip"',
    'git reset --hard origin/main',
    'git clean -fd',
  ])('blocks %s', (command) => {
    expect(blockReason(command)).not.toBeNull()
  })

  it.each([
    'git push -u origin issue/12-fix',
    'git push --force-with-lease=issue/12-fix:3f2c1a9 -u origin issue/12-fix',
    'git push origin --delete design/first-run',
    'git add app/page.tsx tests/unit/tasks.test.ts',
    'git commit -m "fix: keep thumbnails square (#12)"',
    'gh pr create --base main --body-file .lane/pr-body.md',
    'gh pr view 12 --json body',
    'echo "git push origin main" > notes.txt',
    'pnpm gate',
  ])('allows %s', (command) => {
    expect(blockReason(command)).toBeNull()
  })

  it('blocks a bare push only when the checkout is on main', () => {
    expect(blockReason('git push', { currentBranch: 'main' })).toMatch(/on main/)
    expect(blockReason('git push', { currentBranch: 'issue/12-fix' })).toBeNull()
  })
})

describe('the hook speaks Claude Code’s PreToolUse protocol', () => {
  function hook(payload: unknown) {
    return spawnSync('node', [HOOK], { input: JSON.stringify(payload), encoding: 'utf8' })
  }

  it('exits 2 with the reason on stderr for a blocked command', () => {
    const r = hook({ tool_name: 'Bash', tool_input: { command: 'gh pr merge 3' } })
    expect(r.status).toBe(2)
    expect(r.stderr).toMatch(/merging is the human’s call/)
  })

  it('exits 0 silently for an allowed command or a payload it does not understand', () => {
    expect(hook({ tool_name: 'Bash', tool_input: { command: 'pnpm test' } }).status).toBe(0)
    expect(spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' }).status).toBe(0)
  })
})
