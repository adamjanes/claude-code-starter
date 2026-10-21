"use client";

import { useState } from "react";

import type { AddTasks } from "@/lib/tasks";

type Props = {
  action: AddTasks;
  titles: string[];
  label: string;
  pendingLabel: string;
  doneHref: string;
  errorHref: string;
  disabled?: boolean;
};

export function AddTasksButton({ action, titles, label, pendingLabel, doneHref, errorHref, disabled = false }: Props) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    const result = await action(titles);
    window.location.assign(result.ok ? doneHref : errorHref);
  }

  return (
    <button type="button" className="button button--primary" disabled={disabled || pending} onClick={onClick}>
      {pending ? pendingLabel : label}
    </button>
  );
}
