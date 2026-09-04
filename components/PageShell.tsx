import Link from "next/link";
import { BottomNav } from "./BottomNav";

export function PageShell({ title, subtitle, children, back = "/" }: { title: string; subtitle?: string; children: React.ReactNode; back?: string }) {
  return (
    <main className="shell">
      <header className="pageHeader">
        <Link href={back} className="circle" aria-label="Go back">←</Link>
        <div className="pageHeading"><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
      </header>
      {children}
      <BottomNav />
    </main>
  );
}
