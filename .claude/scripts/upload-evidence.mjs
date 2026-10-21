#!/usr/bin/env node
// `pnpm evidence <image> <target> <short-name>` — uploads a screenshot and prints the markdown to embed it. Files are
// immutable (old comments embed their URLs): a retake gets a new name. Private repos need EVIDENCE_REPO (see the skill).

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const MAX_BYTES = 5 * 1024 * 1024
const BRANCH = 'evidence'

function fail(message) {
  process.stderr.write(`evidence: ${message}\n`)
  process.exit(1)
}

function gh(args, input) {
  const r = spawnSync('gh', args, { encoding: 'utf8', input })
  if (r.error) fail(`gh is not available: ${r.error.message}`)
  return { ok: r.status === 0, out: r.stdout.trim(), err: r.stderr.trim() }
}

const [file, target, name] = process.argv.slice(2)
if (!file || !target || !name) fail('usage: pnpm evidence <image> <issue-12 | pr-34 | design-first-run> <short-name>')
if (!fs.existsSync(file)) fail(`no such file: ${file}`)
if (!/^(issue|pr)-\d+$|^design-[a-z0-9-]+$/.test(target)) fail(`target must be issue-<n>, pr-<n> or design-<slug>, got: ${target}`)
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) fail(`short-name must be kebab-case without an extension, got: ${name}`)
const ext = path.extname(file).slice(1).toLowerCase()
if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) fail(`unsupported image type .${ext}`)
if (fs.statSync(file).size > MAX_BYTES) fail(`${file} is over 5 MB: compress it (pngquant) and retry`)

const here = gh(['repo', 'view', '--json', 'nameWithOwner,visibility'])
if (!here.ok) fail(`cannot read this repo with gh: ${here.err}`)
const { nameWithOwner, visibility } = JSON.parse(here.out)
// raw.githubusercontent.com images in a private repo do not render in issues and PRs, so they go to a public assets repo.
const repo = process.env.EVIDENCE_REPO || (visibility === 'PUBLIC' ? nameWithOwner : null)
if (!repo) fail(`${nameWithOwner} is private: set EVIDENCE_REPO to a public assets repo (e.g. ${nameWithOwner}-evidence)`)

function ensureBranch() {
  if (gh(['api', `repos/${repo}/git/ref/heads/${BRANCH}`]).ok) return
  const readme = 'Screenshots embedded in issues and PRs. Never overwrite a file: old comments link to it.\n'
  const tree = gh(['api', `repos/${repo}/git/trees`, '--input', '-', '--jq', '.sha'], JSON.stringify({ tree: [{ path: 'README.md', mode: '100644', type: 'blob', content: readme }] }))
  if (!tree.ok) fail(`cannot create the ${BRANCH} branch in ${repo}: ${tree.err}`)
  const commit = gh(['api', `repos/${repo}/git/commits`, '--input', '-', '--jq', '.sha'], JSON.stringify({ message: 'evidence: start', tree: tree.out, parents: [] }))
  if (!commit.ok) fail(`cannot create the ${BRANCH} branch in ${repo}: ${commit.err}`)
  const ref = gh(['api', `repos/${repo}/git/refs`, '--input', '-'], JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: commit.out }))
  if (!ref.ok) fail(`cannot create the ${BRANCH} branch in ${repo}: ${ref.err}`)
}

ensureBranch()
const dest = `${target}/${name}.${ext}`
if (gh(['api', `repos/${repo}/contents/${dest}?ref=${BRANCH}`]).ok) fail(`${dest} already exists in ${repo}: files are immutable, use ${name}-2`)

const put = gh(
  ['api', '-X', 'PUT', `repos/${repo}/contents/${dest}`, '--input', '-'],
  JSON.stringify({ message: `evidence: ${target} ${name}`, branch: BRANCH, content: fs.readFileSync(file).toString('base64') }),
)
if (!put.ok) fail(`upload failed: ${put.err}`)

const url = `https://raw.githubusercontent.com/${repo}/${BRANCH}/${dest}`
process.stdout.write(`${url}\n![${name}](${url})\n`)
