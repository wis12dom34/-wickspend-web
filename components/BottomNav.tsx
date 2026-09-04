"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["⌂", "Home", "/"],
  ["☎", "Buy Number", "/buy-number"],
  ["▢", "Marketplace", "/marketplace"],
  ["↗", "Boostly", "/boostly"],
  ["▰", "Wallet", "/wallet"],
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottomNav" aria-label="Primary navigation">
      {items.map(([icon, label, href]) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link href={href} className={`navItem${active ? " active" : ""}`} aria-current={active ? "page" : undefined} key={href}>
            <span className="navIcon" aria-hidden>{icon}</span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
