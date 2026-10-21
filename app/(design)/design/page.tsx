import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

import { designs } from "./registry";

export default function DesignIndexPage() {
  return (
    <AppShell>
      <PageHeader title="Designs" />
      <section className="panel" aria-label="Designs">
        <ul className="task-list">
          {designs.map((d) => (
            <li key={d.slug}>
              <Link className="link-row" href={`/design/${d.slug}`}>
                <span className="link-row__title">{d.title}</span>
                <span className="count">{d.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
