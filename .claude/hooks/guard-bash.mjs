#!/usr/bin/env node
// PreToolUse seatbelt for Bash: exit 2 blocks the call and shows Claude the reason. Branch protection is the lock;
// this catches the slip before it reaches GitHub. Patterns are deliberately literal — it is a seatbelt, not a sandbox.

import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const PROTECTED = new Set(['main', 'master'])

/** Split a command line into simple commands, each a list of words (quotes honoured, no expansion). */
export function commands(line) {
  const out = []
  let words = []
  let word = ''
  let quote = null
  let inWord = false
  const endWord = () => {
    if (inWord) words.push(word)
    word = ''
    inWord = false
  }
  const endCommand = () => {
    endWord()
    if (words.length) out.push(words)
    words = []
  }
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quote) {
      if (c === quote) quote = null
      else if (c === '\\' && quote === '"' && i + 1 < line.length) word += line[++i]
      else word += c
    } else if (c === "'" || c === '"') {
      quote = c
      inWord = true
    } else if (c === '\\' && i + 1 < line.length) {
      word += line[++i]
      inWord = true
    } else if (c === ' ' || c === '\t') endWord()
    else if (c === '\n' || c === ';' || c === '&' || c === '|' || c === '(' || c === ')') endCommand()
    else {
      word += c
      inWord = true
    }
  }
  endCommand()
  return out
}

/** `FOO=1 git -C dir push …` → ['push', …]; anything that is not git → null. */
function gitArgs(words) {
  let i = 0
  while (i < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i])) i++
  if (words[i] !== 'git') return null
  i++
  while (i < words.length && words[i].startsWith('-')) {
    if (words[i] === '-C' || words[i] === '-c') i += 2
    else i++
  }
  return words.slice(i)
}

function pushReason(args, currentBranch) {
  const flags = args.filter((a) => a.startsWith('-'))
  const positional = args.filter((a) => !a.startsWith('-'))
  if (flags.some((f) => f === '--force' || f === '-f' || (/^-[a-z]+$/.test(f) && f.includes('f')))) {
    return 'a bare force-push can overwrite someone else’s commits. Use --force-with-lease=<branch>:<expected sha>.'
  }
  if (flags.includes('--force-with-lease')) {
    return 'a bare --force-with-lease silently overwrites a commit it fetched in the background. Name it: --force-with-lease=<branch>:<expected sha>.'
  }
  const refspecs = positional.slice(1)
  const targets = refspecs.map((r) => r.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, ''))
  if (targets.some((t) => PROTECTED.has(t))) return 'nothing is pushed to main directly. Push your branch and open a PR.'
  if (refspecs.length === 0 && currentBranch && PROTECTED.has(currentBranch)) {
    return `this checkout is on ${currentBranch}; a bare push would push it. Work on a branch in a worktree.`
  }
  return null
}

/**
 * Why this command line is blocked, or null when it may run.
 * @param {string} line
 * @param {{ currentBranch?: string | null }} [opts]
 */
export function blockReason(line, { currentBranch = null } = {}) {
  for (const words of commands(line)) {
    if (words[0] === 'gh' && words[1] === 'pr' && words[2] === 'merge') {
      return 'merging is the human’s call. Hand the PR back with its preview link and try-it steps.'
    }
    const args = gitArgs(words)
    if (!args) continue
    const [sub, ...rest] = args
    if (sub === 'push') {
      const reason = pushReason(rest, currentBranch)
      if (reason) return reason
    }
    if (sub === 'add' && rest.some((a) => a === '-A' || a === '--all' || a === '.' || a === ':/')) {
      return 'stage explicit paths. A sweep picks up other lanes’ files, secrets and scratch.'
    }
    if (sub === 'commit' && rest.some((a) => a === '--all' || /^-[a-zA-Z]*a[a-zA-Z]*$/.test(a))) {
      return 'commit -a sweeps every tracked change. Stage explicit paths, then commit.'
    }
    if (sub === 'reset' && rest.includes('--hard')) {
      return 'reset --hard throws away uncommitted work with no undo. Ask the human first.'
    }
    if (sub === 'clean' && rest.some((a) => /^-[a-zA-Z]*f/.test(a))) {
      return 'clean -f deletes untracked files with no undo. Ask the human first.'
    }
  }
  return null
}

function branchAt(cwd) {
  const r = spawnSync('git', ['-C', cwd, 'branch', '--show-current'], { encoding: 'utf8' })
  return r.status === 0 ? r.stdout.trim() || null : null
}

async function main() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    return 0
  }
  const line = payload?.tool_input?.command
  if (typeof line !== 'string') return 0
  const reason = blockReason(line, { currentBranch: payload.cwd ? branchAt(payload.cwd) : null })
  if (!reason) return 0
  process.stderr.write(`Blocked by .claude/hooks/guard-bash.mjs: ${reason}\n`)
  return 2
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((rc) => process.exit(rc))
}
