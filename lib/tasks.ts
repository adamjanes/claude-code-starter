export type Task = {
  id: string;
  title: string;
  done: boolean;
  /** ISO date, `YYYY-MM-DD`. */
  due?: string;
};

export type TaskSummary = { open: number; done: number; overdue: number };

// ISO dates compare correctly as strings, so no Date parsing (and no timezone) is involved.
export function isOverdue(task: Task, today: string): boolean {
  return !task.done && task.due !== undefined && task.due < today;
}

export function summarize(tasks: readonly Task[], today: string): TaskSummary {
  let open = 0;
  let done = 0;
  let overdue = 0;
  for (const task of tasks) {
    if (task.done) done += 1;
    else open += 1;
    if (isOverdue(task, today)) overdue += 1;
  }
  return { open, done, overdue };
}

export type AddTasksResult = { ok: true; tasks: Task[] } | { ok: false; error: string };

/** The signature a real server action implements; design pages inject a fake with the same shape. */
export type AddTasks = (titles: string[]) => Promise<AddTasksResult>;
