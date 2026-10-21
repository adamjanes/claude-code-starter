import { describe, expect, it } from "vitest";

import { summarize, type Task } from "@/lib/tasks";

const TODAY = "2026-10-22";

describe("task summary", () => {
  it("counts open, done and overdue tasks", () => {
    const tasks: Task[] = [
      { id: "1", title: "Late", done: false, due: "2026-10-21" },
      { id: "2", title: "Later", done: false, due: "2026-11-01" },
      { id: "3", title: "No date", done: false },
      { id: "4", title: "Finished late", done: true, due: "2026-10-01" },
    ];
    // open: 1, 2, 3 → 3 · done: 4 → 1 · overdue: only 1 (4 is done, 2 is future, 3 has no date) → 1
    expect(summarize(tasks, TODAY)).toEqual({ open: 3, done: 1, overdue: 1 });
  });

  it("does not call a task due today overdue", () => {
    const tasks: Task[] = [{ id: "1", title: "Due today", done: false, due: TODAY }];
    expect(summarize(tasks, TODAY)).toEqual({ open: 1, done: 0, overdue: 0 });
  });

  it("calls a task due yesterday overdue", () => {
    const tasks: Task[] = [{ id: "1", title: "Due yesterday", done: false, due: "2026-10-21" }];
    expect(summarize(tasks, TODAY).overdue).toBe(1);
  });

  it("summarizes an empty list as all zeros", () => {
    expect(summarize([], TODAY)).toEqual({ open: 0, done: 0, overdue: 0 });
  });
});
