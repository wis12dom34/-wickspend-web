"use client";

import { useRouter } from "next/navigation";
import { BottomNav } from "./BottomNav";

export function PageShell({ title, subtitle, children, back = "/" }: { title: string; subtitle?: string; children: React.ReactNode; back?: string }) {
  const router = useRouter();
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(back);
  }
  return (
    <main className="shell appShell">
      <header className="pageHeader figmaPageHeader">
        <button type="button" className="backButton" aria-label="Go back" onClick={goBack}>←</button>
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
