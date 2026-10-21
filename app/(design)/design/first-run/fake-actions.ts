"use server";

import type { AddTasksResult } from "@/lib/tasks";

/** Stands in for the real `addTasks` action: same shape, no data touched. */
export async function fakeAddTasks(titles: string[]): Promise<AddTasksResult> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return { ok: true, tasks: titles.map((title, i) => ({ id: `fake-${i + 1}`, title, done: false })) };
}
