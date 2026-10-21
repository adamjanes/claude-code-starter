// Evidence for issues and PRs: immutable screenshot uploads, and the one table every PR's Visual evidence uses.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const MAX_BYTES = 5 * 1024 * 1024;
const BRANCH = "evidence";

export const EVIDENCE_HEADER = "| Issue | What changed | Before | After |\n|---|---|---|---|";

const image = (alt, src) => (src ? `![${alt}](${src})` : "new screen");

/** One row of the Visual evidence table; a missing `before` means the screen is new. */
export function evidenceRow({ issue, what, before, after }) {
  return `| #${issue} | ${what} | ${image("before", before)} | ${image("after", after)} |`;
}

export function noVisualRow(issue, reason) {
  return `| #${issue} | no visual surface: ${reason} | — | — |`;
}

export class EvidenceError extends Error {}

function gh(args, input) {
  const r = spawnSync("gh", args, { encoding: "utf8", input });
  if (r.error) throw new EvidenceError(`gh is not available: ${r.error.message}`);
  return { ok: r.status === 0, out: r.stdout.trim(), err: r.stderr.trim() };
}

// raw.githubusercontent.com images in a private repo do not render in issues and PRs, so they go to a public assets repo.
function evidenceRepo() {
  const here = gh(["repo", "view", "--json", "nameWithOwner,visibility"]);
  if (!here.ok) throw new EvidenceError(`cannot read this repo with gh: ${here.err}`);
  const { nameWithOwner, visibility } = JSON.parse(here.out);
  const repo = process.env.EVIDENCE_REPO || (visibility === "PUBLIC" ? nameWithOwner : null);
  if (!repo) throw new EvidenceError(`${nameWithOwner} is private: set EVIDENCE_REPO to a public assets repo (e.g. ${nameWithOwner}-evidence)`);
  return repo;
}

function ensureBranch(repo) {
  if (gh(["api", `repos/${repo}/git/ref/heads/${BRANCH}`]).ok) return;
  const readme = "Screenshots embedded in issues and PRs. Never overwrite a file: old comments link to it.\n";
  const step = (args, body) => {
    const r = gh(args, JSON.stringify(body));
    if (!r.ok) throw new EvidenceError(`cannot create the ${BRANCH} branch in ${repo}: ${r.err}`);
    return r.out;
  };
  const tree = step(["api", `repos/${repo}/git/trees`, "--input", "-", "--jq", ".sha"], { tree: [{ path: "README.md", mode: "100644", type: "blob", content: readme }] });
  const commit = step(["api", `repos/${repo}/git/commits`, "--input", "-", "--jq", ".sha"], { message: "evidence: start", tree, parents: [] });
  step(["api", `repos/${repo}/git/refs`, "--input", "-"], { ref: `refs/heads/${BRANCH}`, sha: commit });
}

/** Uploads one image to `<target>/<name>.<ext>` and returns its raw URL. Never overwrites. */
export function uploadEvidence(file, target, name) {
  if (!fs.existsSync(file)) throw new EvidenceError(`no such file: ${file}`);
  if (!/^(issue|pr)-\d+$|^design-[a-z0-9-]+$/.test(target)) throw new EvidenceError(`target must be issue-<n>, pr-<n> or design-<slug>, got: ${target}`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new EvidenceError(`short-name must be kebab-case without an extension, got: ${name}`);
  const ext = path.extname(file).slice(1).toLowerCase();
  if (!["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) throw new EvidenceError(`unsupported image type .${ext}`);
  if (fs.statSync(file).size > MAX_BYTES) throw new EvidenceError(`${file} is over 5 MB: compress it (pngquant) and retry`);

  const repo = evidenceRepo();
  ensureBranch(repo);
  const dest = `${target}/${name}.${ext}`;
  if (gh(["api", `repos/${repo}/contents/${dest}?ref=${BRANCH}`]).ok) {
    throw new EvidenceError(`${dest} already exists in ${repo}: files are immutable, use ${name}-2`);
  }
  const put = gh(
    ["api", "-X", "PUT", `repos/${repo}/contents/${dest}`, "--input", "-"],
    JSON.stringify({ message: `evidence: ${target} ${name}`, branch: BRANCH, content: fs.readFileSync(file).toString("base64") }),
  );
  if (!put.ok) throw new EvidenceError(`upload failed: ${put.err}`);
  return `https://raw.githubusercontent.com/${repo}/${BRANCH}/${dest}`;
}
