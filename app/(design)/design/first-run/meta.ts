import type { DesignMeta } from "@/components/design/types";

export const FIRST_RUN_DESIGN_META = {
  slug: "first-run",
  title: "First run",
  summary: "A new account with zero tasks",
} as const satisfies DesignMeta;
