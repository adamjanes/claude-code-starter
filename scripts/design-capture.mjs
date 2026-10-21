// pnpm design:capture <slug> --base <url> [--state <id>]
// Screenshots every option of /design/<slug> into .lane/ and prints the block that goes on the issue.
import fs from "node:fs";
import { parseArgs } from "node:util";

import { fail, goto, openBrowser } from "./lib/browser.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { base: { type: "string" }, state: { type: "string" } },
});

const [slug] = positionals;
if (!slug || !values.base) fail("usage: pnpm design:capture <slug> --base <preview url> [--state <id>]");
const base = values.base.replace(/\/+$/, "");
const designUrl = `${base}/design/${slug}`;

fs.mkdirSync(".lane", { recursive: true });
const { browser, page } = await openBrowser();
const shots = [];
let picture;
try {
  await goto(page, designUrl);
  const root = page.locator(`[data-design="${slug}"]`);
  if ((await root.count()) === 0) fail(`${designUrl} has no [data-design="${slug}"] root; is the design registered and deployed?`);
  picture = {
    variant: await root.getAttribute("data-picture-variant"),
    state: values.state ?? (await root.getAttribute("data-picture-state")),
  };
  const variants = await page.locator("[data-variant]").evaluateAll((tabs) =>
    tabs.map((tab) => ({ id: tab.getAttribute("data-variant"), label: tab.textContent?.trim(), caption: tab.getAttribute("title") })),
  );
  if (variants.length === 0) fail(`${designUrl} shows no [data-variant] tabs`);

  for (const variant of variants) {
    await goto(page, `${designUrl}?variant=${variant.id}&state=${picture.state}`);
    if ((await page.locator(`[data-state="${picture.state}"]`).count()) === 0) fail(`state "${picture.state}" does not exist on ${slug}`);
    const file = `.lane/design-${slug}-${variant.id}.png`;
    await page.locator("[data-design-stage]").screenshot({ path: file });
    shots.push({ ...variant, file });
  }
} finally {
  await browser.close();
}

const letters = shots.map((s) => s.label?.split(" ")[0]).join(" · ");
const lines = [
  `**Design options:** ${designUrl}?variant=${picture.variant}&state=${picture.state}  (${letters})`,
  ...shots.map((s) => `- **${s.label}**: ${s.caption}`),
  "",
  ...shots.map((s) => s.file),
];
process.stdout.write(`${lines.join("\n")}\n`);
