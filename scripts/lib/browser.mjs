import { chromium } from "playwright";

export const VIEWPORT = { width: 1440, height: 900 };

/** Prints one sentence and exits; a capture failure must never look like a stack trace to read past. */
export function fail(message) {
  process.stderr.write(`capture failed: ${message}\n`);
  process.exit(1);
}

function bypassHeaders() {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  return secret ? { "x-vercel-protection-bypass": secret, "x-vercel-set-bypass-cookie": "true" } : {};
}

export async function openBrowser(viewport = VIEWPORT) {
  const browser = await chromium.launch({ headless: true });
  // 2x pixels: a PR table scales screenshots down, and text must stay readable when it does.
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, extraHTTPHeaders: bypassHeaders() });
  return { browser, page: await context.newPage() };
}

// A login wall renders the same whether or not the fix is deployed, so a shot of it proves nothing.
export async function goto(page, url) {
  let response;
  try {
    response = await page.goto(url, { waitUntil: "networkidle" });
  } catch (error) {
    fail(`could not load ${url} (${error instanceof Error ? error.message.split("\n")[0] : String(error)})`);
  }
  const status = response?.status() ?? 0;
  if (status >= 400) fail(`${url} answered HTTP ${status}`);
  const landed = page.url();
  const walled =
    /vercel\.com\/(login|sso)/.test(landed) || (await page.getByText("Log in to Vercel", { exact: false }).count()) > 0;
  if (walled) {
    fail(
      `${url} is behind Vercel's login wall. Set VERCEL_AUTOMATION_BYPASS_SECRET (Vercel → Settings → Deployment Protection → Protection Bypass for Automation).`,
    );
  }
  return response;
}
