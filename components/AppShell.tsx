import Link from "next/link";
import type { ReactNode } from "react";

const NAV = ["Inbox", "Today", "Done"] as const;

export function AppShell({ current, children }: { current?: (typeof NAV)[number]; children: ReactNode }) {
  return (
    <div className="shell">
      <header className="shell__bar">
        <Link className="shell__brand" href="/">
          <span className="shell__mark" aria-hidden="true">
            T
          </span>
          Tasks
        </Link>
        <nav className="shell__nav" aria-label="Main">
          {NAV.map((item) => (
            <Link key={item} href="/" aria-current={item === current ? "page" : undefined}>
              {item}
            </Link>
          ))}
        </nav>
        <span className="shell__avatar" aria-label="Signed in as Mira Kaur">
          MK
        </span>
      </header>
      <main className="shell__main">{children}</main>
    </div>
  );
}
