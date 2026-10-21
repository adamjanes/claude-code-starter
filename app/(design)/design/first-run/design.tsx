import type { ReactNode } from "react";

import { PageHeader } from "@/components/PageHeader";
import { SummaryBar } from "@/components/SummaryBar";
import { TaskList } from "@/components/TaskList";
import type { Design, DesignState } from "@/components/design/types";
import { SAMPLE_TODAY } from "@/lib/sample-tasks";
import { summarize, type AddTasks, type Task } from "@/lib/tasks";

import { fakeAddTasks } from "./fake-actions";
import { FIRST_RUN_DESIGN_META } from "./meta";
import { AddTasksButton } from "./parts/AddTasksButton";

export const FIRST_RUN_STATES = [
  { id: "empty", label: "Empty" },
  { id: "saving", label: "Saving" },
  { id: "error", label: "Error" },
  { id: "done", label: "Done" },
] as const satisfies readonly DesignState[];

type StateId = (typeof FIRST_RUN_STATES)[number]["id"];

const asState = (id: string): StateId => FIRST_RUN_STATES.find((s) => s.id === id)?.id ?? "empty";

const toTasks = (titles: readonly string[]): Task[] =>
  titles.map((title, i) => ({ id: `new-${i + 1}`, title, done: false }));

const STARTERS = ["Plan this week's priorities", "Follow up on open threads", "Book your next 1:1"];
const PASTED = ["Send the Q4 plan to Priya", "Review the onboarding copy", "Book the offsite venue", "Renew the domain"];
const FIRST_TASK = "Send the Q4 plan to Priya";

function Inbox({ tasks, children }: { tasks: readonly Task[]; children: ReactNode }) {
  return (
    <>
      <PageHeader title="Inbox" />
      {tasks.length > 0 && <SummaryBar summary={summarize(tasks, SAMPLE_TODAY)} />}
      {children}
    </>
  );
}

function Added({ titles }: { titles: readonly string[] }) {
  const tasks = toTasks(titles);
  return (
    <Inbox tasks={tasks}>
      <section className="panel" aria-label="Tasks">
        <TaskList tasks={tasks} today={SAMPLE_TODAY} />
      </section>
    </Inbox>
  );
}

const plural = (n: number) => `${n} ${n === 1 ? "task" : "tasks"}`;

/** `action` is injected so the design page runs a fake and the shipped screen runs the real server action. */
export function buildFirstRunDesign(action: AddTasks = fakeAddTasks): Design {
  const button = (variant: string, state: StateId, titles: string[], label: string, pendingLabel: string) => (
    <AddTasksButton
      action={action}
      titles={titles}
      label={state === "saving" ? pendingLabel : label}
      pendingLabel={pendingLabel}
      doneHref={`?variant=${variant}&state=done`}
      errorHref={`?variant=${variant}&state=error`}
      disabled={state === "saving" || titles.length === 0}
    />
  );

  return {
    ...FIRST_RUN_DESIGN_META,
    states: [...FIRST_RUN_STATES],
    picture: { variant: "a", state: "empty" },
    variants: [
      {
        id: "a",
        label: "A · Blank slate",
        caption: "One input and one button: the fastest first task, but the user starts from nothing.",
        render: (id) => {
          const state = asState(id);
          if (state === "done") return <Added titles={[FIRST_TASK]} />;
          const typed = state === "empty" ? "" : FIRST_TASK;
          return (
            <Inbox tasks={[]}>
              {state === "error" && <p className="alert">Couldn&apos;t add the task. Check your connection and try again.</p>}
              <section className="panel" aria-label="Add your first task">
                <div className="empty">
                  <span className="empty__icon" aria-hidden="true">
                    +
                  </span>
                  <p className="empty__title">No tasks yet</p>
                  <form className="first-task" aria-label="New task">
                    <input
                      className="input"
                      aria-label="Task"
                      placeholder="What needs doing?"
                      defaultValue={typed}
                      readOnly={state === "saving"}
                    />
                    {button("a", state, [typed || FIRST_TASK], "Add task", "Adding…")}
                  </form>
                </div>
              </section>
            </Inbox>
          );
        },
      },
      {
        id: "b",
        label: "B · Starter list",
        caption: "Three suggested tasks to keep or dismiss: the list is never empty, but the suggestions are ours, not theirs.",
        render: (id) => {
          const state = asState(id);
          if (state === "done") return <Added titles={STARTERS} />;
          return (
            <Inbox tasks={[]}>
              {state === "error" && <p className="alert">Couldn&apos;t add 3 tasks. Nothing was added.</p>}
              <section className="panel" aria-label="Suggested tasks" aria-busy={state === "saving"}>
                <div className="panel__head">
                  Suggested
                  <span className="count">{plural(STARTERS.length)}</span>
                </div>
                <ul className="task-list" data-dimmed={state === "saving"}>
                  {STARTERS.map((title) => (
                    <li key={title} className="task-row">
                      <span className="task-row__check" aria-hidden="true" />
                      <span className="task-row__title">{title}</span>
                      <span className="task-row__meta">
                        <button type="button" className="button button--ghost button--sm" disabled={state === "saving"}>
                          Dismiss
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="panel__foot">
                  <button type="button" className="button button--ghost" disabled={state === "saving"}>
                    Start blank
                  </button>
                  {button("b", state, STARTERS, "Keep all 3", "Adding 3 tasks…")}
                </div>
              </section>
            </Inbox>
          );
        },
      },
      {
        id: "c",
        label: "C · Paste a list",
        caption: "Paste the list they already have: best for someone switching tools, heavier for someone starting fresh.",
        render: (id) => {
          const state = asState(id);
          if (state === "done") return <Added titles={PASTED} />;
          const lines = state === "empty" ? [] : PASTED;
          return (
            <Inbox tasks={[]}>
              {state === "error" && <p className="alert">Couldn&apos;t add {plural(lines.length)}. Nothing was added.</p>}
              <section className="panel" aria-label="Paste a list">
                <div className="panel__head">
                  Paste a list
                  <span className="count">{plural(lines.length)}</span>
                </div>
                <div className="panel__body">
                  <textarea
                    className="textarea"
                    aria-label="Tasks, one per line"
                    placeholder="One task per line"
                    defaultValue={lines.join("\n")}
                    readOnly={state === "saving"}
                  />
                </div>
                <div className="panel__foot">
                  {button(
                    "c",
                    state,
                    lines,
                    lines.length === 0 ? "Add tasks" : `Add ${plural(lines.length)}`,
                    `Adding ${plural(lines.length)}…`,
                  )}
                </div>
              </section>
            </Inbox>
          );
        },
      },
    ],
  };
}
