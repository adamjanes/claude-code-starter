import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { SummaryBar } from "@/components/SummaryBar";
import { TaskList } from "@/components/TaskList";
import { SAMPLE_TASKS, SAMPLE_TODAY } from "@/lib/sample-tasks";
import { summarize } from "@/lib/tasks";

export default function InboxPage() {
  const tasks = SAMPLE_TASKS;
  return (
    <AppShell current="Inbox">
      <PageHeader
        title="Inbox"
        actions={
          <button type="button" className="button button--primary">
            Add task
          </button>
        }
      />
      <SummaryBar summary={summarize(tasks, SAMPLE_TODAY)} />
      <section className="panel" aria-label="Tasks">
        {tasks.length === 0 ? (
          <div className="empty">
            <p className="empty__title">No tasks</p>
            <button type="button" className="button button--primary">
              Add a task
            </button>
          </div>
        ) : (
          <TaskList tasks={tasks} today={SAMPLE_TODAY} />
        )}
      </section>
    </AppShell>
  );
}
