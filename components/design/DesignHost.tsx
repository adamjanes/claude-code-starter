import { AppShell } from "@/components/AppShell";

import styles from "./design-host.module.css";
import type { Design } from "./types";

type Props = { design: Design; variant?: string | undefined; state?: string | undefined };

export function resolveSelection(design: Design, variant?: string, state?: string) {
  const v = design.variants.find((x) => x.id === variant) ?? design.variants.find((x) => x.id === design.picture.variant);
  const s = design.states.find((x) => x.id === state) ?? design.states.find((x) => x.id === design.picture.state);
  if (v === undefined || s === undefined) throw new Error(`design "${design.slug}": picture points at a missing variant or state`);
  return { variant: v, state: s };
}

const href = (variant: string, state: string) => `?variant=${variant}&state=${state}`;

export function DesignHost({ design, variant, state }: Props) {
  const selected = resolveSelection(design, variant, state);
  const screen = selected.variant.render(selected.state.id);

  return (
    <div
      className={styles.host}
      data-design={design.slug}
      data-picture-variant={design.picture.variant}
      data-picture-state={design.picture.state}
    >
      <div className={styles.toolbar}>
        <a className={styles.back} href="/design">
          Designs
        </a>
        <span className={styles.title}>{design.title}</span>
        <nav className={styles.group} aria-label="Options">
          {design.variants.map((v) => (
            <a
              key={v.id}
              className={styles.tab}
              href={href(v.id, selected.state.id)}
              data-variant={v.id}
              title={v.caption}
              aria-current={v.id === selected.variant.id ? "true" : undefined}
            >
              {v.label}
            </a>
          ))}
        </nav>
        <nav className={styles.group} aria-label="States">
          {design.states.map((s) => (
            <a
              key={s.id}
              className={styles.tab}
              href={href(selected.variant.id, s.id)}
              data-state={s.id}
              aria-current={s.id === selected.state.id ? "true" : undefined}
            >
              {s.label}
            </a>
          ))}
        </nav>
      </div>
      <div className={styles.stage} data-design-stage>
        {design.frame === "bare" ? screen : <AppShell current="Inbox">{screen}</AppShell>}
      </div>
    </div>
  );
}
