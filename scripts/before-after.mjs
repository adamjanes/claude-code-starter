// pnpm before-after --issue <n> --name <kebab> --before <url> --after <url> [--selector <css>] [--full] [--upload]
// Shoots the same view on main and on the preview, then prints one row of the Visual evidence table on stdout.
import fs from "node:fs";
import { parseArgs } from "node:util";

import { fail, goto, openBrowser } from "./lib/browser.mjs";
import { EvidenceError, evidenceRow, uploadEvidence } from "./lib/evidence.mjs";

const USAGE =
  "usage: pnpm before-after --issue <n> --name <kebab-name> --before <url> --after <url> [--selector <css>] [--full] [--upload]";

let values;
try {
  ({ values } = parseArgs({
    options: {
      issue: { type: "string" },
      name: { type: "string" },
      before: { type: "string" },
      after: { type: "string" },
      selector: { type: "string" },
      full: { type: "boolean", default: false },
      upload: { type: "boolean", default: false },
    },
  }));
} catch (error) {
  fail(`${error instanceof Error ? error.message : String(error)}\n${USAGE}`);
}

const { issue, name, before, after, selector } = values;
if (!issue || !name || !before || !after) fail(USAGE);
if (!/^\d+$/.test(issue)) fail(`--issue must be an issue number, got: ${issue}`);
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) fail(`--name must be kebab-case, got: ${name}`);

fs.mkdirSync(".lane", { recursive: true });
const files = { before: `.lane/${issue}-${name}-before.png`, after: `.lane/${issue}-${name}-after.png` };

const { browser, page } = await openBrowser();
try {
  for (const side of /** @type {const} */ (["before", "after"])) {
    const url = values[side];
    await goto(page, url);
    if (selector) {
      const element = page.locator(selector).first();
      if ((await element.count()) === 0) fail(`no element matches ${selector} on ${url}`);
      await element.screenshot({ path: files[side] });
    } else {
      await page.screenshot({ path: files[side], fullPage: values.full });
    }
  }
} finally {
  await browser.close();
}

let cells = files;
if (values.upload) {
  try {
    cells = {
      before: uploadEvidence(files.before, `issue-${issue}`, `${name}-before`),
      after: uploadEvidence(files.after, `issue-${issue}`, `${name}-after`),
    };
  } catch (error) {
    if (!(error instanceof EvidenceError)) throw error;
    fail(error.message);
  }
}

process.stdout.write(`${evidenceRow({ issue, what: "<what changed>", before: cells.before, after: cells.after })}\n`);
