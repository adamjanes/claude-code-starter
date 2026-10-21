#!/usr/bin/env node
// `pnpm gate`: snapshots the worktree (untracked included; index and HEAD untouched), merges it onto origin/main, pushes it
// to gate/<lane>, waits for ci.yml. rc: 0 pass · 1 fail · 2 not run · 3 not submitted · 124 timed out · 130 interrupted

import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const HELP = `Usage: pnpm gate [--timeout <min>] [--poll <sec>] [--fresh] [--dry-run]

Pushes this worktree's exact state (merged onto origin/main) to gate/<lane> and waits for CI.
  --timeout <min>  stop watching after this long (default 45); the run keeps going on GitHub
  --poll <sec>     how often to check the run (default 30)
  --fresh          push a new run even when the last gate had this exact tree
  --dry-run        build the gate commit and print it; push nothing
Run it again on an unchanged tree to re-attach to the same run.`

export class GateError extends Error {
  constructor(message, rc = 3) {
    super(message)
    this.rc = rc
  }
}

export function parseArgs(argv) {
  const args = { timeoutMin: 45, pollSec: 30, fresh: false, dryRun: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--fresh') args.fresh = true
    else if (a === '--dry-run') args.dryRun = true
    else if (a === '--help' || a === '-h') args.help = true
    else if (a === '--timeout' || a === '--poll') {
      const n = Number(argv[++i])
      if (!Number.isFinite(n) || n <= 0) throw new GateError(`${a} needs a positive number`)
      if (a === '--timeout') args.timeoutMin = n
      else args.pollSec = n
    } else throw new GateError(`unknown flag: ${a}\n\n${HELP}`)
  }
  return args
}

/** `issue/12-Fix thumbnails` → `issue-12-fix-thumbnails`. pr-guards' gate cleanup applies the same rule. */
export function laneName(branch) {
  return branch
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
}

const FAILED = new Set(['failure', 'timed_out', 'startup_failure'])

/** A GitHub Actions run → the gate's verdict, or null while it is still going. */
export function verdictFor(run) {
  if (run.status !== 'completed') return null
  if (run.conclusion === 'success') return { rc: 0, word: 'PASS' }
  if (FAILED.has(run.conclusion)) return { rc: 1, word: 'FAIL' }
  return { rc: 2, word: `NOT RUN (${run.conclusion ?? 'no conclusion'})` }
}

export function formatElapsed(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`
}

function run(cmd, args, { env, cwd, allowFail = false } = {}) {
  const r = spawnSync(cmd, args, { cwd, env: env ? { ...process.env, ...env } : process.env, encoding: 'utf8' })
  if (r.error) throw new GateError(`${cmd} is not available: ${r.error.message}`)
  if (r.status !== 0 && !allowFail) {
    throw new GateError(`${cmd} ${args.join(' ')} failed:\n${(r.stderr || r.stdout).trim()}`)
  }
  return { code: r.status ?? 1, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() }
}

const git = (args, opts) => run('git', args, opts).out

/** Commit the working tree as it stands, through a scratch index, so the real index and HEAD never move. */
export function snapshot(cwd, message) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'))
  const index = path.join(tmp, 'index')
  try {
    const realIndex = path.resolve(cwd, git(['rev-parse', '--git-path', 'index'], { cwd }))
    // Copying the real index keeps its stat cache, so `add -A` re-hashes only what changed.
    if (fs.existsSync(realIndex)) fs.copyFileSync(realIndex, index)
    const env = { GIT_INDEX_FILE: index }
    git(['add', '-A'], { cwd, env })
    const tree = git(['write-tree'], { cwd, env })
    const commit = git(['commit-tree', tree, '-p', 'HEAD', '-m', message], { cwd })
    return { tree, commit }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

/** The snapshot merged onto base, as a commit — or a GateError naming the conflicts. */
export function mergeOnto(cwd, baseSha, snap, message) {
  const r = run('git', ['merge-tree', '--write-tree', '--name-only', baseSha, snap.commit], { cwd, allowFail: true })
  if (r.code === 1) {
    const files = r.out.split('\n').slice(1).filter((l) => l && !l.startsWith('Auto-merging') && !l.startsWith('CONFLICT'))
    throw new GateError(
      `this tree conflicts with origin/main — nothing was pushed.\n  ${files.join('\n  ')}\n` +
        'Rebase onto origin/main, resolve, then gate again.',
    )
  }
  if (r.code !== 0) throw new GateError(`git merge-tree failed (git 2.38+ needed): ${r.err}`)
  const tree = r.out.split('\n')[0]
  const commit = git(['commit-tree', tree, '-p', baseSha, '-p', snap.commit, '-m', message], { cwd })
  return { tree, commit }
}

const gh = (args) => {
  const r = run('gh', args, { allowFail: true })
  if (r.code !== 0) throw new GateError(`gh ${args.join(' ')} failed: ${r.err || r.out}`, 2)
  return r.out
}
const ghJson = (endpoint) => JSON.parse(gh(['api', endpoint]))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const say = (line) => process.stdout.write(`${line}\n`)

async function findRun(repo, sha, deadline) {
  while (Date.now() < deadline) {
    const { workflow_runs: runs } = ghJson(`repos/${repo}/actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=5`)
    if (runs.length > 0) return runs[0]
    await sleep(10_000)
  }
  return null
}

function reportJobs(repo, runInfo) {
  const { jobs } = ghJson(`repos/${repo}/actions/runs/${runInfo.id}/jobs?per_page=100`)
  for (const job of jobs) say(`  ${job.conclusion === 'success' ? '✓' : job.conclusion === 'skipped' ? '-' : '✗'} ${job.name} — ${job.conclusion ?? job.status}`)
  if (runInfo.conclusion !== 'success') {
    const log = run('gh', ['run', 'view', String(runInfo.id), '--repo', repo, '--log-failed'], { allowFail: true }).out
    if (log) say(`\n--- failed steps, last 150 lines ---\n${log.split('\n').slice(-150).join('\n')}`)
  }
}

function record(root, verdict) {
  const dir = path.join(root, '.lane')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'gate-verdict.json'), `${JSON.stringify(verdict, null, 2)}\n`)
}

export async function main(argv) {
  const args = parseArgs(argv)
  if (args.help) {
    say(HELP)
    return 0
  }
  const root = git(['rev-parse', '--show-toplevel'])
  const branch = git(['branch', '--show-current'], { cwd: root })
  if (!branch) throw new GateError('detached HEAD — gate from a branch (issue/<n>-<slug>).')
  if (branch === 'main') throw new GateError('this checkout is on main — work and gate in a worktree on its own branch.')
  const lane = laneName(branch)
  const ref = `gate/${lane}`

  run('git', ['fetch', '--quiet', 'origin', 'main'], { cwd: root })
  const baseSha = git(['rev-parse', 'refs/remotes/origin/main'], { cwd: root })
  const snap = snapshot(root, `gate snapshot: ${branch}`)
  const gate = mergeOnto(root, baseSha, snap, `gate: ${branch} onto main@${baseSha.slice(0, 7)}`)
  say(`gate ${ref} · tree ${gate.tree.slice(0, 12)} · main@${baseSha.slice(0, 7)}`)

  if (args.dryRun) {
    say(`dry run — would push ${gate.commit} (tree ${gate.tree}) to ${ref}`)
    return 0
  }

  const repo = gh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'])
  const tip = run('git', ['ls-remote', 'origin', `refs/heads/${ref}`], { cwd: root }).out.split(/\s+/)[0]
  let sha = gate.commit
  if (tip && !args.fresh && ghJson(`repos/${repo}/git/commits/${tip}`).tree.sha === gate.tree) {
    sha = tip
    say('same tree as the last gate — re-attaching to its run (--fresh to run again)')
  } else {
    run('git', ['push', '--quiet', '--force', 'origin', `${gate.commit}:refs/heads/${ref}`], { cwd: root })
  }

  const started = Date.now()
  const runInfo = await findRun(repo, sha, started + 3 * 60_000)
  if (!runInfo) throw new GateError(`no CI run appeared for ${sha.slice(0, 7)} — does ci.yml trigger on push to gate/**?`, 2)
  say(`watching ${runInfo.html_url}`)

  const deadline = started + args.timeoutMin * 60_000
  let lastBeat = 0
  let current = runInfo
  const onInterrupt = () => {
    say(`\ninterrupted — the run keeps going: ${runInfo.html_url}\n\`pnpm gate\` on the same tree re-attaches.`)
    process.exit(130)
  }
  process.once('SIGINT', onInterrupt)
  process.once('SIGTERM', onInterrupt)

  for (;;) {
    const verdict = verdictFor(current)
    if (verdict) {
      reportJobs(repo, current)
      record(root, { rc: verdict.rc, verdict: verdict.word, sha, tree: gate.tree, url: current.html_url })
      say(`=== GATE ${verdict.word} (rc=${verdict.rc}) === ${current.html_url}`)
      return verdict.rc
    }
    if (Date.now() > deadline) {
      say(`=== GATE TIMED OUT (rc=124) — still ${current.status}: ${current.html_url} — \`pnpm gate\` re-attaches ===`)
      return 124
    }
    if (Date.now() - lastBeat >= 60_000) {
      say(`… ${formatElapsed(Date.now() - started)} · ${current.status}`)
      lastBeat = Date.now()
    }
    await sleep(args.pollSec * 1000)
    current = ghJson(`repos/${repo}/actions/runs/${runInfo.id}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (rc) => process.exit(rc),
    (err) => {
      process.stderr.write(`gate: ${err.message}\n`)
      process.exit(err instanceof GateError ? err.rc : 3)
    },
  )
}
