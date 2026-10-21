import fs from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildFirstRunDesign, FIRST_RUN_STATES } from "@/app/(design)/design/first-run/design";
import { fakeAddTasks } from "@/app/(design)/design/first-run/fake-actions";
import { designs } from "@/app/(design)/design/registry";
import { DesignHost } from "@/components/design/DesignHost";

const DESIGN_DIR = path.resolve(import.meta.dirname, "../../app/(design)/design/first-run");

// The one label each option shows at every state, so a blank or wrong render fails.
const KEY_LABEL: Record<string, Record<string, string>> = {
  a: { empty: "No tasks yet", saving: "Adding…", error: "Couldn&#x27;t add the task", done: "Send the Q4 plan to Priya" },
  b: { empty: "Keep all 3", saving: "Adding 3 tasks…", error: "Couldn&#x27;t add 3 tasks", done: "Book your next 1:1" },
  c: { empty: "One task per line", saving: "Adding 4 tasks…", error: "Couldn&#x27;t add 4 tasks", done: "Renew the domain" },
};

describe("first-run design page", () => {
  const design = buildFirstRunDesign();

  for (const variant of design.variants) {
    for (const state of FIRST_RUN_STATES) {
      it(`option ${variant.label} renders its ${state.label.toLowerCase()} state`, () => {
        const html = renderToStaticMarkup(<DesignHost design={design} variant={variant.id} state={state.id} />);
        expect(html).toContain(KEY_LABEL[variant.id]?.[state.id] ?? "missing expectation");
        expect(html).toContain(`data-design="first-run"`);
      });
    }
  }

  it("opens a bare link on a real option and state", () => {
    expect(design.variants.map((v) => v.id)).toContain(design.picture.variant);
    expect(design.states.map((s) => s.id)).toContain(design.picture.state);
    const html = renderToStaticMarkup(<DesignHost design={design} />);
    expect(html).toMatch(new RegExp(`data-variant="${design.picture.variant}"[^>]*aria-current="true"`));
    expect(html).toMatch(new RegExp(`data-state="${design.picture.state}"[^>]*aria-current="true"`));
    expect(html).toContain("No tasks yet");
  });

  it("is listed on the design index", () => {
    expect(designs.map((d) => d.slug)).toContain("first-run");
  });

  it("keeps each option's caption out of the page text", () => {
    const html = renderToStaticMarkup(<DesignHost design={design} />);
    for (const variant of design.variants) {
      expect(html).toContain(`title="${variant.caption.replaceAll("'", "&#x27;")}"`);
      expect(html.replace(/title="[^"]*"/g, "")).not.toContain(variant.caption.slice(0, 30));
    }
  });
});

describe("first-run design actions", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("answers like a real save after a delay, with the titles it was given", async () => {
    vi.useFakeTimers();
    const pending = fakeAddTasks(["Plan the week", "Book the venue"]);
    await vi.advanceTimersByTimeAsync(800);
    await expect(pending).resolves.toEqual({
      ok: true,
      tasks: [
        { id: "fake-1", title: "Plan the week", done: false },
        { id: "fake-2", title: "Book the venue", done: false },
      ],
    });
  });

  it("never imports a real server action or data module", () => {
    const sources = fs
      .readdirSync(DESIGN_DIR, { recursive: true, encoding: "utf8" })
      .filter((f) => /\.tsx?$/.test(f))
      .map((f) => fs.readFileSync(path.join(DESIGN_DIR, f), "utf8"));
    for (const source of sources) {
      expect(source).not.toMatch(/from ["']@\/app\/actions|from ["']@\/lib\/data/);
    }
  });
});
