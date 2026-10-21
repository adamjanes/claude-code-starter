import { expect, test, type Page } from "@playwright/test";

function count(page: Page, label: string) {
  return page.locator(".summary > div", { has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) }).locator("dd");
}

test("the inbox shows how many tasks are open, overdue and done", async ({ page }) => {
  await page.goto("/");
  // SOURCE: lib/sample-tasks.ts, today 2026-10-22
  // open t1 t2 t3 t5 = 4 · overdue t1 (due 20 Oct; t2 is due today, not late) = 1 · done t4 t6 = 2
  await expect(count(page, "Open")).toHaveText("4");
  await expect(count(page, "Overdue")).toHaveText("1");
  await expect(count(page, "Done")).toHaveText("2");
});

test("the first-run design page offers three options", async ({ page }) => {
  await page.goto("/design/first-run");
  await expect(page.locator("[data-variant]")).toHaveText(["A · Blank slate", "B · Starter list", "C · Paste a list"]);
});

test("keeping the starter list shows the three starter tasks", async ({ page }) => {
  await page.goto("/design/first-run?variant=b&state=done");
  const stage = page.locator("[data-design-stage]");
  for (const title of ["Plan this week's priorities", "Follow up on open threads", "Book your next 1:1"]) {
    await expect(stage.getByText(title, { exact: true })).toBeVisible();
  }
});
