import type { TaskSummary } from "@/lib/tasks";

export function SummaryBar({ summary }: { summary: TaskSummary }) {
  return (
    <dl className="summary">
      <div>
        <dt>Open</dt>
        <dd>{summary.open}</dd>
      </div>
      <div>
        <dt>Overdue</dt>
        <dd data-tone={summary.overdue > 0 ? "danger" : undefined}>{summary.overdue}</dd>
      </div>
      <div>
        <dt>Done</dt>
        <dd>{summary.done}</dd>
      </div>
    </dl>
  );
}
