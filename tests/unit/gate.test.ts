import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { laneName, parseArgs, verdictFor } from '../../scripts/gate.mjs'

const GATE = path.resolve(__dirname, '../../scripts/gate.mjs')

describe('the gate names a lane after its branch', () => {
  it('turns a branch into a ref-safe lane name', () => {
    expect(laneName('issue/12-fix-thumbnails')).toBe('issue-12-fix-thumbnails')
    expect(laneName('Milestone/Export Timing')).toBe('milestone-export-timing')
    expect(laneName('design/first-run.')).toBe('design-first-run')
  })
})

describe('the gate reads a CI run as a verdict', () => {
  it('passes only on success', () => {
    expect(verdictFor({ status: 'completed', conclusion: 'success' })).toEqual({ rc: 0, word: 'PASS' })
  })

  it('fails on a failed, timed-out or unstartable run', () => {
    for (const conclusion of ['failure', 'timed_out', 'startup_failure']) {
      expect(verdictFor({ status: 'completed', conclusion })?.rc).toBe(1)
    }
  })

  it('reports a cancelled run as not run, never as passed', () => {
    expect(verdictFor({ status: 'completed', conclusion: 'cancelled' })?.rc).toBe(2)
  })

  it('has no verdict while the run is still going', () => {
    expect(verdictFor({ status: 'in_progress', conclusion: null })).toBeNull()
  })
})

describe('the gate rejects flags it does not know', () => {
  it('names the bad flag', () => {
    expect(() => parseArgs(['--fast'])).toThrow(/unknown flag: --fast/)
    expect(parseArgs(['--timeout', '10']).timeoutMin).toBe(10)
  })
})

// A real repo with a local bare "origin": the gate commit is built for real, only the push is skipped.
describe('the gate commit is the working tree merged onto main', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true })
  })

  function sh(cwd: string, ...args: string[]): string {
    return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
  }

  // Main moves by fetching into the bare origin from a seed repo, so the fixture never pushes to a main branch.
  function setup(): { work: string; land: (file: string, body: string) => void } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-test-'))
    dirs.push(root)
    const seed = path.join(root, 'seed')
    const origin = path.join(root, 'origin.git')
    const work = path.join(root, 'work')
    sh(root, 'init', '-q', '-b', 'main', seed)
    for (const [k, v] of [['user.email', 'gate@test.local'], ['user.name', 'Gate Test']] as const) sh(seed, 'config', k, v)
    fs.writeFileSync(path.join(seed, 'app.txt'), 'one\n')
    sh(seed, 'add', 'app.txt')
    sh(seed, 'commit', '-q', '-m', 'base')
    sh(root, 'clone', '-q', '--bare', seed, origin)
    sh(root, 'clone', '-q', origin, work)
    for (const [k, v] of [['user.email', 'gate@test.local'], ['user.name', 'Gate Test']] as const) sh(work, 'config', k, v)
    sh(work, 'checkout', '-q', '-b', 'issue/1-thing')
    const land = (file: string, body: string) => {
      fs.writeFileSync(path.join(seed, file), body)
      sh(seed, 'add', file)
      sh(seed, 'commit', '-q', '-m', `landed ${file}`)
      sh(origin, 'fetch', '-q', seed, 'main:main')
    }
    return { work, land }
  }

  function gate(cwd: string) {
    return spawnSync('node', [GATE, '--dry-run'], { cwd, encoding: 'utf8' })
  }

  it('includes uncommitted and untracked work and main’s newer commits, without moving HEAD or the index', () => {
    const { work, land } = setup()
    land('theirs.txt', 'landed on main\n')

    fs.writeFileSync(path.join(work, 'app.txt'), 'one\ntwo\n')
    fs.writeFileSync(path.join(work, 'new.txt'), 'untracked\n')
    const headBefore = sh(work, 'rev-parse', 'HEAD')
    const statusBefore = sh(work, 'status', '--porcelain')

    const r = gate(work)
    expect(r.status, r.stderr).toBe(0)
    const commit = /would push ([0-9a-f]{40})/.exec(r.stdout)?.[1]
    expect(commit).toBeDefined()
    expect(sh(work, 'ls-tree', '-r', '--name-only', commit!).split('\n').sort()).toEqual(['app.txt', 'new.txt', 'theirs.txt'])
    expect(sh(work, 'show', `${commit!}:app.txt`)).toBe('one\ntwo')
    expect(sh(work, 'rev-parse', 'HEAD')).toBe(headBefore)
    expect(sh(work, 'status', '--porcelain')).toBe(statusBefore)
  })

  it('refuses to gate a tree that conflicts with main, and pushes nothing', () => {
    const { work, land } = setup()
    land('app.txt', 'theirs\n')
    fs.writeFileSync(path.join(work, 'app.txt'), 'mine\n')

    const r = gate(work)
    expect(r.status).toBe(3)
    expect(r.stderr).toMatch(/conflicts with origin\/main/)
    expect(r.stderr).toMatch(/app\.txt/)
  })

  it('refuses to gate from main itself', () => {
    const { work } = setup()
    sh(work, 'checkout', '-q', 'main')
    const r = gate(work)
    expect(r.status).toBe(3)
    expect(r.stderr).toMatch(/on main/)
  })
})
