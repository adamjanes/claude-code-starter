#!/usr/bin/env node
// `pnpm evidence <image> <target> <short-name>`: uploads one screenshot and prints its URL and the markdown to embed it.

import { EvidenceError, uploadEvidence } from '../../scripts/lib/evidence.mjs'

const [file, target, name] = process.argv.slice(2)
if (!file || !target || !name) {
  process.stderr.write('evidence: usage: pnpm evidence <image> <issue-12 | pr-34 | design-first-run> <short-name>\n')
  process.exit(1)
}

try {
  const url = uploadEvidence(file, target, name)
  process.stdout.write(`${url}\n![${name}](${url})\n`)
} catch (err) {
  if (!(err instanceof EvidenceError)) throw err
  process.stderr.write(`evidence: ${err.message}\n`)
  process.exit(1)
}
