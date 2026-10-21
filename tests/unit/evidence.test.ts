import { describe, expect, it } from "vitest";

import { EVIDENCE_HEADER, evidenceRow, noVisualRow } from "../../scripts/lib/evidence.mjs";

describe("every PR's Visual evidence uses the same table", () => {
  it("has the four columns in a fixed order", () => {
    expect(EVIDENCE_HEADER).toBe("| Issue | What changed | Before | After |\n|---|---|---|---|");
  });

  it("puts the before image left of the after image, for one issue per row", () => {
    expect(evidenceRow({ issue: "2", what: "Overdue tasks say how late they are", before: "b.png", after: "a.png" })).toBe(
      "| #2 | Overdue tasks say how late they are | ![before](b.png) | ![after](a.png) |",
    );
  });

  it("says new screen when there is no before", () => {
    expect(evidenceRow({ issue: "5", what: "A settings page", before: undefined, after: "a.png" })).toBe(
      "| #5 | A settings page | new screen | ![after](a.png) |",
    );
  });

  it("gives a change with nothing to see a row with its reason and empty images", () => {
    expect(noVisualRow("4", "date parsing, proven by tasks.test.ts")).toBe(
      "| #4 | no visual surface: date parsing, proven by tasks.test.ts | — | — |",
    );
  });
});
