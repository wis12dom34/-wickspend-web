"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

type State = "checking" | "allowed" | "denied" | "error";

export default function AdminAccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    let alive = true;
    const verify = async () => {
      const token = getSessionToken();
      if (!token) {
        window.location.replace("/login");
        return;
      }
      try {
        await api.auth.session(token);
        const result = await api.admin.dashboard(token) as { ok?: boolean; authorized?: boolean };
        if (alive) setState(result?.authorized === true || result?.ok === true ? "allowed" : "denied");
      } catch (error) {
        if (!alive) return;
        if (error instanceof ApiError && error.status === 401) setState("denied");
        else setState("error");
      }
    };
    void verify();
    return () => { alive = false; };
  }, []);

  if (state === "allowed") return <>{children}</>;
  if (state === "checking") return <main className="ws-admin-gate"><div className="ws-admin-gate-card"><span className="ws-admin-spinner"/><strong>Checking admin access…</strong><p>Using your existing WickSpend session.</p></div></main>;
  if (state === "denied") return <main className="ws-admin-gate"><div className="ws-admin-gate-card"><strong>Access Denied</strong><p>This signed-in WickSpend account is not authorized to view admin data.</p><Link href="/">Back to WickSpend</Link></div></main>;
  return <main className="ws-admin-gate"><div className="ws-admin-gate-card"><strong>Admin unavailable</strong><p>We could not verify admin access right now. No admin data was loaded.</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div></main>;
}
