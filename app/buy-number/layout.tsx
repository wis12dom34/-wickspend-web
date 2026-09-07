"use client";

import { useEffect } from "react";

export default function BuyNumberLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const originalPushState = window.history.pushState.bind(window.history);

    window.history.pushState = function pushState(data: any, unused: string, url?: string | URL | null) {
      const target = url == null ? "" : String(url);
      if (target) {
        const parsed = new URL(target, window.location.origin);
        if (parsed.pathname === "/buy-number" && parsed.searchParams.get("premium") === "1") {
          window.location.assign("/buy-number/premium-usa");
          return;
        }
      }
      originalPushState(data, unused, url);
    };

    return () => {
      window.history.pushState = originalPushState;
    };
  }, []);

  return children;
}
