import type { ReactNode } from "react";

export type DesignState = {
  /** URL value: `?state=<id>`. */
  id: string;
  label: string;
};

export type DesignVariant = {
  /** URL value: `?variant=<id>`, lowercase: `a`, `b`, `c`. */
  id: string;
  /** Prefixed with its letter: `A · Blank slate`. */
  label: string;
  /** The option's trade-off in one line; a tooltip on the tab, never rendered as page text. */
  caption: string;
  render: (stateId: string) => ReactNode;
};

export type Design = {
  slug: string;
  title: string;
  states: DesignState[];
  variants: DesignVariant[];
  /** What a bare `/design/<slug>` link opens and what `pnpm design:capture` shoots. */
  picture: { variant: string; state: string };
  // app: the stage wraps each screen in the real AppShell; bare: the screen draws its own chrome.
  frame?: "app" | "bare";
};

export type DesignMeta = { slug: string; title: string; summary: string };
