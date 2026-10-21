// pnpm capture <url> <out.png> [--full] [--width 1440 --height 900]
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { VIEWPORT, fail, goto, openBrowser } from "./lib/browser.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    full: { type: "boolean", default: false },
    width: { type: "string", default: String(VIEWPORT.width) },
    height: { type: "string", default: String(VIEWPORT.height) },
  },
});

const [url, out] = positionals;
if (!url || !out) fail("usage: pnpm capture <url> <out.png> [--full] [--width 1440 --height 900]");

const viewport = { width: Number(values.width), height: Number(values.height) };
if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)) fail("--width and --height must be numbers");

fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
const { browser, page } = await openBrowser(viewport);
try {
  await goto(page, url);
  await page.screenshot({ path: out, fullPage: values.full });
} finally {
  await browser.close();
}
process.stdout.write(`${out}\n`);
