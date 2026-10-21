import type { Task } from "./tasks";

export const SAMPLE_TODAY = "2026-10-22";

export const SAMPLE_TASKS: readonly Task[] = [
  { id: "t1", title: "Send the Q4 plan to Priya", done: false, due: "2026-10-20" },
  { id: "t2", title: "Review the onboarding copy", done: false, due: "2026-10-22" },
  { id: "t3", title: "Book the offsite venue", done: false, due: "2026-10-29" },
  { id: "t4", title: "Renew the domain", done: true, due: "2026-10-18" },
  { id: "t5", title: "Draft the hiring scorecard", done: false },
  { id: "t6", title: "Archive last sprint's board", done: true },
];
