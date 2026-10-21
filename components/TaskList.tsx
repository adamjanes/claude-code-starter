import { shortDate } from "@/lib/format";
import { isOverdue, type Task } from "@/lib/tasks";

export function TaskList({ tasks, today }: { tasks: readonly Task[]; today: string }) {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <li key={task.id} className="task-row" data-done={task.done}>
          <span className="task-row__check" aria-label={task.done ? "Done" : "Open"} role="img" />
          <span className="task-row__title">{task.title}</span>
          <span className="task-row__meta">
            {task.due !== undefined && (
              <span className="due" data-overdue={isOverdue(task, today)}>
                {shortDate(task.due)}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
