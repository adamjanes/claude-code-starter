import { isMap } from "yaml";
import { describe, expect, it } from "vitest";

import { workflows } from "./_workflows";

describe("every workflow states what its token may do", () => {
  it("declares permissions at the top level or on every job", () => {
    const offenders: string[] = [];
    for (const wf of workflows()) {
      if (wf.doc.has("permissions")) continue;
      for (const job of wf.jobs) {
        if (!isMap(job.node) || !job.node.has("permissions")) {
          offenders.push(`${wf.file}:${job.startLine}  job "${job.id}" has no permissions: and the workflow sets none`);
        }
      }
    }
    expect(offenders, "without permissions: a job gets the repo's default token scope; grant only what it needs").toEqual([]);
  });
});
