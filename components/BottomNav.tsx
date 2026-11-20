"use client";

import { Home, Call, BagShopping, Rocket, Wallet, Receipt } from "reicon-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSessionToken } from "@/lib/session";

type IconName = "home" | "phone" | "bag" | "rocket" | "wallet" | "orders" | "help";
const items: readonly [IconName, string, string][] = [
  ["home", "Home", "/"],
  ["phone", "Buy", "/buy-number"],
  ["orders", "Orders", "/orders"],
  ["wallet", "Wallet", "/wallet"],
  ["help", "Help", "/help-support"],
];

const hiddenPrefixes = [
  "/landing",
  "/login",
  "/register",
  "/forgot-password",
  "/admin",
  "/staff",
  "/store",
  "/api",
  "/webhook",
] as const;

function hidesCustomerNav(pathname: string) {
  return hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function NavIcon({ name, active }: { name: IconName; active: boolean }) {
  if (name === "help") return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.4 9a2.8 2.8 0 1 1 4.6 2.4c-1.4 1.1-2 1.5-2 3"/><path d="M12 17.7v.3"/></svg>;
  const icons = { home: Home, phone: Call, bag: BagShopping, rocket: Rocket, wallet: Wallet, orders: Receipt };
  const Icon = icons[name];
  return <Icon size={23} weight={active ? "Filled" : "Outline"} aria-hidden="true" />;
}

export function BottomNav({ activeHref }: { activeHref?: string } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    setHasSession(Boolean(getSessionToken()));
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/profile") return;
    const button = document.querySelector<HTMLButtonElement>(".referButton");
    if (!button) return;
    button.disabled = false;
    button.removeAttribute("title");
    button.setAttribute("aria-label", "Open Refer & Earn");
    const openReferral = () => router.push("/refer-earn");
    button.addEventListener("click", openReferral);
    return () => button.removeEventListener("click", openReferral);
  }, [pathname, router]);

  if (!hasSession || hidesCustomerNav(pathname)) return null;

  return (
    <>
      <div className="bottomNavSpacer" aria-hidden="true" />
      <nav className="bottomNav" aria-label="Primary navigation">
      {items.map(([icon, label, href]) => {
        const active = activeHref ? href === activeHref : href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link href={href} prefetch className={`navItem${active ? " active" : ""}`} aria-current={active ? "page" : undefined} key={href}>
            <span className="navIcon"><NavIcon name={icon} active={active}/></span>
            <span className="navLabel">{label}</span>
          </Link>
        );
      })}
      </nav>
    </>
  );
}
