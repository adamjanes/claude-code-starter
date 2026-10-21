import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../../..");
// Built from parts so this file never matches its own pattern.
const FOCUSED = new RegExp(["\\b(?:describe|it|test)", "\\.", "only\\s*\\("].join(""));

function testFiles(dir: string): string[] {
  return fs
    .readdirSync(path.join(ROOT, dir), { recursive: true, encoding: "utf8" })
    .filter((f) => /\.[cm]?[jt]sx?$/.test(f))
    .map((f) => path.join(dir, f));
}

describe("no test is focused", () => {
  it("has no focused describe, it or test under tests/", () => {
    const offenders: string[] = [];
    for (const file of testFiles("tests")) {
      fs.readFileSync(path.join(ROOT, file), "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (FOCUSED.test(line)) offenders.push(`${file}:${i + 1}  ${line.trim()}`);
        });
    }
    expect(offenders, "a focused test silently skips every other test in its file; remove the focus").toEqual([]);
  });
});
