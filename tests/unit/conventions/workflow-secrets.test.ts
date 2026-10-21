import { isMap } from "yaml";
import { describe, expect, it } from "vitest";

import { workflows } from "./_workflows";

const SECRET = /\bsecrets\.([A-Za-z_][A-Za-z0-9_]*)/g;

function environmentName(job: unknown): string | undefined {
  if (!isMap(job)) return undefined;
  const env = job.get("environment");
  if (typeof env === "string") return env;
  return isMap(env) ? String(env.get("name")) : undefined;
}

describe("secrets live only in production jobs", () => {
  it("references a secret other than GITHUB_TOKEN only inside a job with environment: production", () => {
    const offenders: string[] = [];
    for (const wf of workflows()) {
      wf.lines.forEach((line, i) => {
        const lineNo = i + 1;
        for (const [, name] of line.matchAll(SECRET)) {
          if (name === "GITHUB_TOKEN") continue;
          const job = wf.jobs.find((j) => lineNo >= j.startLine && lineNo <= j.endLine);
          if (job && environmentName(job.node) === "production") continue;
          const where = job ? `job "${job.id}" has no environment: production` : "outside any job";
          offenders.push(`${wf.file}:${lineNo}  secrets.${name} — ${where}`);
        }
      });
    }
    expect(offenders, "move the secret into the production environment and declare environment: production on the job (CLAUDE.md → Secrets)").toEqual([]);
  });
});
