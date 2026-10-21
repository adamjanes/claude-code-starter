import type { DesignMeta } from "@/components/design/types";

import { FIRST_RUN_DESIGN_META } from "./first-run/meta";

/** One entry per `/design/<slug>` page; the index at `/design` lists them. */
export const designs: readonly DesignMeta[] = [FIRST_RUN_DESIGN_META];
