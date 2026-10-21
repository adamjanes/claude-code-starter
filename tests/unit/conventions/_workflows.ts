import fs from "node:fs";
import path from "node:path";

import { LineCounter, parseDocument, isMap, isScalar, type Pair } from "yaml";

export const ROOT = path.resolve(import.meta.dirname, "../../..");
const DIR = ".github/workflows";

export type Job = { id: string; startLine: number; endLine: number; node: unknown };
export type Workflow = { file: string; text: string; lines: string[]; doc: ReturnType<typeof parseDocument>; jobs: Job[] };

export function workflows(): Workflow[] {
  return fs
    .readdirSync(path.join(ROOT, DIR))
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => {
      const file = `${DIR}/${f}`;
      const text = fs.readFileSync(path.join(ROOT, file), "utf8");
      const counter = new LineCounter();
      const doc = parseDocument(text, { lineCounter: counter });
      const jobsNode = doc.get("jobs");
      const jobs: Job[] = [];
      if (isMap(jobsNode)) {
        for (const pair of jobsNode.items as Pair[]) {
          const key = pair.key;
          const value = pair.value as { range?: [number, number, number] } | null;
          if (!isScalar(key) || !key.range || !value?.range) continue;
          jobs.push({
            id: String(key.value),
            startLine: counter.linePos(key.range[0]).line,
            endLine: counter.linePos(value.range[2]).line,
            node: value,
          });
        }
      }
      return { file, text, lines: text.split("\n"), doc, jobs };
    });
}
