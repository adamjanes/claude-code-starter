import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const SCANNED = ["app/(design)", "components/design"];
const LITERAL_COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

function files(dir: string): string[] {
  return fs
    .readdirSync(path.join(ROOT, dir), { recursive: true, encoding: "utf8" })
    .filter((f) => /\.(tsx?|css)$/.test(f))
    .map((f) => path.join(dir, f));
}

describe("design pages use tokens only", () => {
  it("contains no literal colours in design pages or the design host", () => {
    const offenders: string[] = [];
    for (const file of SCANNED.flatMap(files)) {
      fs.readFileSync(path.join(ROOT, file), "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (LITERAL_COLOUR.test(line)) offenders.push(`${file}:${i + 1}  ${line.trim()}`);
        });
    }
    expect(offenders, "use a var(--color-…) token from app/globals.css instead").toEqual([]);
  });
});
