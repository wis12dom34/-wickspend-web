import Link from "next/link";
import { BottomNav } from "./BottomNav";

export function PageShell({ title, subtitle, children, back = "/" }: { title: string; subtitle?: string; children: React.ReactNode; back?: string }) {
  return (
    <main className="shell appShell">
      <header className="pageHeader figmaPageHeader">
        <Link href={back} className="backButton" aria-label="Go back">←</Link>
        <div className="pageHeading">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </header>
      {children}
      <BottomNav />
    </main>
  );
}
